"""Multi-factor readiness orchestration (System Analysis §4 / Phase P-D).

Derives the six readiness factors for an employee from their evidence-backed
competency results, role risk weights, criticality, and record quality; persists
an explainable ReadinessScore; and aggregates employee scores up the org tree
(department / company) and across workforce families / role levels.
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.employee_360 import EmployeeCertification, EmployeeExperience, EmployeeQualification
from app.models.l1_l2 import Employee, OrgNode
from app.models.l3_l4 import CompetencyRequirement
from app.models.l5_l6 import CompetencyResult, CriticalRole, Profile
from app.models.readiness import ReadinessScore
from app.services.engines.governance import append_audit
from app.services.engines.readiness_engine import ReadinessFactors, compute_readiness


def _risk_weights(db: Session) -> dict[str, float]:
    weights: dict[str, float] = {}
    for req in db.execute(select(CompetencyRequirement)).scalars().all():
        weights[req.competency_id] = max(weights.get(req.competency_id, 1.0), req.risk_weight)
    return weights


def _recency(latest: datetime | None) -> float:
    """Exponential time-decay: 1.0 fresh, 0.5 at the configured half-life."""
    if latest is None:
        return 0.0
    if latest.tzinfo is None:
        latest = latest.replace(tzinfo=timezone.utc)
    age_days = (datetime.now(timezone.utc) - latest).total_seconds() / 86400.0
    halflife = max(1.0, settings.READINESS_RECENCY_HALFLIFE_DAYS)
    return round(0.5 ** (age_days / halflife), 4)


def _employee_factors(db: Session, employee: Employee) -> tuple[ReadinessFactors, bool, int]:
    profile = db.query(Profile).filter(Profile.employee_id == employee.id).one_or_none()
    results: list[CompetencyResult] = []
    if profile:
        results = db.execute(
            select(CompetencyResult).where(CompetencyResult.profile_id == profile.id)
        ).scalars().all()
    risk = _risk_weights(db)

    # competency_score — attainment vs required, risk-weighted.
    if results:
        num = den = 0.0
        for r in results:
            if r.required_level <= 0:
                continue
            w = max(1.0, risk.get(r.competency_id, 1.0))
            num += w * min(1.0, r.assessed_level / r.required_level)
            den += w
        competency_score = (num / den) if den else 0.0
    else:
        competency_score = 0.0

    # evidence_confidence — mean confidence of the results.
    evidence_confidence = (sum(r.confidence for r in results) / len(results)) if results else 0.0

    # data_quality — APPROVED-result ratio blended with verified-record ratio.
    signals: list[float] = []
    if results:
        signals.append(sum(1 for r in results if r.status == "APPROVED") / len(results))
    quals = db.execute(select(EmployeeQualification).where(EmployeeQualification.employee_id == employee.id)).scalars().all()
    certs = db.execute(select(EmployeeCertification).where(EmployeeCertification.employee_id == employee.id)).scalars().all()
    exps = db.execute(select(EmployeeExperience).where(EmployeeExperience.employee_id == employee.id)).scalars().all()
    e360_total = len(quals) + len(certs) + len(exps)
    if e360_total:
        verified = (sum(1 for q in quals if q.verification_status == "VERIFIED")
                    + sum(1 for c in certs if c.verification_status == "VERIFIED")
                    + sum(1 for x in exps if x.verified_flag))
        signals.append(verified / e360_total)
    data_quality = (sum(signals) / len(signals)) if signals else 0.0

    # risk_adjustment — discount for unmet high-risk competencies (floored, never collapses).
    penalty = 0.0
    for r in results:
        if r.assessed_level < r.required_level and r.required_level > 0:
            w = max(1.0, risk.get(r.competency_id, 1.0))
            penalty += 0.1 * w * (r.required_level - r.assessed_level) / 5.0
    risk_adjustment = max(0.4, 1.0 - penalty)

    # role_criticality (multiplier) + critical-role gate flag.
    crit = None
    if employee.current_job_id:
        crit = db.execute(
            select(CriticalRole).where(CriticalRole.job_id == employee.current_job_id)
        ).scalars().first()
    is_critical = bool(crit and (crit.criticality in {"HIGH", "VERY_HIGH"}
                                 or crit.business_impact >= settings.READINESS_CRITICAL_ROLE_FLOOR))
    role_criticality = round(1.0 - 0.15 * (crit.business_impact if crit else 0.0), 4)

    # recency — decay from the most recent result.
    latest = max((r.created_at for r in results), default=None)
    recency = _recency(latest)

    factors = ReadinessFactors(
        competency_score=competency_score, evidence_confidence=evidence_confidence,
        data_quality=data_quality, risk_adjustment=risk_adjustment,
        role_criticality=role_criticality, recency=recency,
    )
    return factors, is_critical, len(results)


def _persist(
    db: Session, *, tenant_id: str, entity_type: str, entity_id: str,
    verdict: dict, source_count: int,
) -> ReadinessScore:
    f = verdict["factors"]
    score = ReadinessScore(
        tenant_id=tenant_id, entity_type=entity_type, entity_id=entity_id,
        competency_score=f["competency_score"], evidence_confidence=f["evidence_confidence"],
        data_quality=f["data_quality"], risk_adjustment=f["risk_adjustment"],
        role_criticality=f["role_criticality"], recency=f["recency"],
        readiness_index=verdict["readiness_index"], readiness_status=verdict["readiness_status"],
        breakdown=verdict, source_count=source_count, method_version=verdict["method_version"],
    )
    db.add(score)
    db.flush()
    return score


def compute_for_employee(db: Session, *, actor_user_id: str | None, employee_id: str) -> dict:
    emp = db.get(Employee, employee_id)
    if not emp:
        raise ValueError("employee not found")
    factors, is_critical, n = _employee_factors(db, emp)
    verdict = compute_readiness(factors, is_critical_role=is_critical)
    score = _persist(db, tenant_id=emp.tenant_id, entity_type="EMPLOYEE",
                     entity_id=employee_id, verdict=verdict, source_count=n)
    append_audit(db, actor_user_id=actor_user_id, action="READINESS_COMPUTE",
                 entity="rs_score", entity_id=score.id,
                 after={"entity_type": "EMPLOYEE", "entity_id": employee_id,
                        "index": verdict["readiness_index"], "status": verdict["readiness_status"]})
    return _serialize(score)


def compute_for_node(
    db: Session, *, actor_user_id: str | None, node_id: str, entity_type: str = "DEPARTMENT",
) -> dict:
    """Aggregate the latest employee readiness across a node's subtree by averaging
    factors, then recomputing the index so the rollup is itself explainable."""
    node = db.get(OrgNode, node_id)
    tenant_id = node.id if node else node_id
    descendant_ids = db.execute(
        select(OrgNode.id).where((OrgNode.id == node_id) | (OrgNode.path.like(f"%{node_id}%")))
    ).scalars().all()
    employees = db.execute(
        select(Employee).where(Employee.section_id.in_(descendant_ids))
    ).scalars().all()

    factor_sets = [_employee_factors(db, e)[0].clamped() for e in employees]
    if not factor_sets:
        verdict = compute_readiness(
            ReadinessFactors(0.0, 0.0, 0.0, 1.0, 1.0, 0.0), is_critical_role=False)
        score = _persist(db, tenant_id=tenant_id, entity_type=entity_type,
                         entity_id=node_id, verdict=verdict, source_count=0)
        return _serialize(score)

    n = len(factor_sets)
    avg = ReadinessFactors(
        competency_score=sum(f.competency_score for f in factor_sets) / n,
        evidence_confidence=sum(f.evidence_confidence for f in factor_sets) / n,
        data_quality=sum(f.data_quality for f in factor_sets) / n,
        risk_adjustment=sum(f.risk_adjustment for f in factor_sets) / n,
        role_criticality=sum(f.role_criticality for f in factor_sets) / n,
        recency=sum(f.recency for f in factor_sets) / n,
    )
    verdict = compute_readiness(avg, is_critical_role=False)
    score = _persist(db, tenant_id=tenant_id, entity_type=entity_type,
                     entity_id=node_id, verdict=verdict, source_count=n)
    append_audit(db, actor_user_id=actor_user_id, action="READINESS_AGGREGATE",
                 entity="rs_score", entity_id=score.id,
                 after={"entity_type": entity_type, "entity_id": node_id,
                        "employees": n, "index": verdict["readiness_index"]})
    return _serialize(score)


def latest_for(db: Session, entity_type: str, entity_id: str) -> ReadinessScore | None:
    return db.execute(
        select(ReadinessScore)
        .where(ReadinessScore.entity_type == entity_type, ReadinessScore.entity_id == entity_id)
        .order_by(ReadinessScore.created_at.desc())
    ).scalars().first()


def _serialize(score: ReadinessScore) -> dict:
    return {
        "id": score.id, "entity_type": score.entity_type, "entity_id": score.entity_id,
        "readiness_index": score.readiness_index, "readiness_status": score.readiness_status,
        "factors": {
            "competency_score": score.competency_score, "evidence_confidence": score.evidence_confidence,
            "data_quality": score.data_quality, "risk_adjustment": score.risk_adjustment,
            "role_criticality": score.role_criticality, "recency": score.recency,
        },
        "breakdown": score.breakdown, "source_count": score.source_count,
        "method_version": score.method_version,
    }
