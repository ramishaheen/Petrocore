"""L8 orchestration: fuse multi-source data into the full decision-ready output set.

Outputs: Individual / Team / Department gap reports, Competency Gap Matrix,
Readiness Index, Development Priorities, Succession Insights, Decision Recommendations.
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.l1_l2 import Employee, OrgNode
from app.models.l3_l4 import Competency, CompetencyRequirement
from app.models.l5_l6 import CompetencyResult, CriticalRole, Profile
from app.models.l7_l8 import Gap, GapReport, Recommendation
from app.services.engines.fusion_engine import CompetencySignal, fuse, readiness_index
from app.services.engines.governance import append_audit, open_decision


def _signals_for_profile(db: Session, profile: Profile) -> list[CompetencySignal]:
    results = db.execute(
        select(CompetencyResult).where(CompetencyResult.profile_id == profile.id)
    ).scalars().all()
    return [
        CompetencySignal(
            competency_id=r.competency_id, current_level=r.assessed_level,
            target_level=r.required_level, evidence_count=1 if r.evidence_id else 0,
            consistency=r.confidence,
        )
        for r in results
    ]


def _risk_weights(db: Session) -> dict[str, float]:
    weights: dict[str, float] = {}
    for req in db.execute(select(CompetencyRequirement)).scalars().all():
        weights[req.competency_id] = max(weights.get(req.competency_id, 1.0), req.risk_weight)
    return weights


def analyze_individual(db: Session, *, actor_user_id: str, tenant_id: str, employee_id: str) -> dict:
    profile = db.query(Profile).filter(Profile.employee_id == employee_id).one_or_none()
    signals = _signals_for_profile(db, profile) if profile else []
    gaps = fuse(signals, _risk_weights(db))
    idx = readiness_index(signals)

    for g in gaps:
        if g["gap_size"] <= 0:  # only persist real gaps
            continue
        db.add(Gap(
            tenant_id=tenant_id, scope="INDIVIDUAL", subject_id=employee_id,
            competency_id=g["competency_id"], current_level=g["current_level"],
            target_level=g["target_level"], gap_size=g["gap_size"],
            priority=g["priority"], confidence=g["confidence"],
        ))
    if profile:
        profile.readiness_index = idx

    payload = {"employee_id": employee_id, "readiness_index": idx, "gaps": gaps,
               "development_priorities": [g for g in gaps if g["priority"] in ("VERY_HIGH", "HIGH")]}
    db.add(GapReport(tenant_id=tenant_id, kind="INDIVIDUAL", scope="INDIVIDUAL",
                     subject_id=employee_id, payload=payload))
    append_audit(db, actor_user_id=actor_user_id, action="FUSION_INDIVIDUAL",
                 entity="l8_gap_report", entity_id=employee_id, after={"readiness_index": idx})
    db.commit()
    return payload


def analyze_department(db: Session, *, actor_user_id: str, tenant_id: str, node_id: str) -> dict:
    """Department Gap Map + Competency Gap Matrix across all employees in the
    node's subtree. Employees are attached to leaf SECTION nodes, so when
    ``node_id`` is a DEPARTMENT we resolve its descendant sections via the
    org-node materialized path before filtering."""
    descendant_ids = db.execute(
        select(OrgNode.id).where(
            (OrgNode.id == node_id) | (OrgNode.path.like(f"%{node_id}%"))
        )
    ).scalars().all()
    employees = db.execute(
        select(Employee).where(Employee.section_id.in_(descendant_ids))
    ).scalars().all()

    matrix: dict[str, dict] = {}
    readiness_values: list[float] = []
    for emp in employees:
        profile = db.query(Profile).filter(Profile.employee_id == emp.id).one_or_none()
        if not profile:
            continue
        signals = _signals_for_profile(db, profile)
        readiness_values.append(readiness_index(signals))
        for g in fuse(signals, _risk_weights(db)):
            cell = matrix.setdefault(g["competency_id"], {"total_gap": 0, "count": 0, "very_high": 0})
            cell["total_gap"] += g["gap_size"]
            cell["count"] += 1
            if g["priority"] == "VERY_HIGH":
                cell["very_high"] += 1

    dept_readiness = round(sum(readiness_values) / len(readiness_values), 1) if readiness_values else 0.0
    comp_names = {c.id: {"en": c.name_en, "ar": c.name_ar}
                  for c in db.execute(select(Competency)).scalars().all()}
    payload = {
        "node_id": node_id, "employees": len(employees),
        "department_readiness": dept_readiness,
        "competency_gap_matrix": [
            {"competency_id": cid, "name": comp_names.get(cid, {}),
             "total_gap": v["total_gap"], "affected": v["count"], "very_high": v["very_high"]}
            for cid, v in sorted(matrix.items(), key=lambda kv: -kv[1]["total_gap"])
        ],
    }
    db.add(GapReport(tenant_id=tenant_id, kind="DEPARTMENT_MAP", scope="DEPARTMENT",
                     subject_id=node_id, payload=payload))
    db.commit()
    return payload


def succession_insights(db: Session, *, tenant_id: str) -> dict:
    """Succession & Second-Line readiness: critical roles, bench strength, at-risk."""
    crit = db.execute(select(CriticalRole)).scalars().all()
    profiles = db.execute(select(Profile)).scalars().all()
    ready = [p for p in profiles if p.readiness_index >= 75]
    at_risk = [c for c in crit if c.loss_risk >= 0.6]
    return {
        "critical_roles_total": len(crit),
        "roles_at_risk": len(at_risk),
        "roles_at_risk_pct": round(100 * len(at_risk) / len(crit), 1) if crit else 0.0,
        "ready_successors": len(ready),
        "overall_readiness": round(sum(p.readiness_index for p in profiles) / len(profiles), 1) if profiles else 0.0,
        "pipeline": {
            "identified": len(profiles),
            "ready_now": len(ready),
            "ready_6_12m": len([p for p in profiles if 50 <= p.readiness_index < 75]),
            "ready_12m_plus": len([p for p in profiles if p.readiness_index < 50]),
        },
    }


def recommend(db: Session, *, actor_user_id: str, tenant_id: str, gap_id: str) -> dict:
    """Turn a verified gap into a decision recommendation, gated by governance."""
    gap = db.get(Gap, gap_id)
    if not gap:
        return {"error": "gap not found"}
    comp = db.get(Competency, gap.competency_id)
    name_en = comp.name_en if comp else gap.competency_id
    name_ar = comp.name_ar if comp else gap.competency_id
    rec = Recommendation(
        tenant_id=tenant_id, gap_id=gap_id,
        text_en=f"Targeted development for {name_en}: raise level {gap.current_level}→{gap.target_level}.",
        text_ar=f"تطوير موجّه لـ {name_ar}: رفع المستوى من {gap.current_level} إلى {gap.target_level}.",
        confidence=gap.confidence, status="PENDING",
    )
    db.add(rec)
    db.flush()
    open_decision(db, tenant_id=tenant_id, kind="RECOMMENDATION",
                  subject_ref=f"recommendation:{rec.id}",
                  ai_recommendation=rec.text_en, confidence=gap.confidence)
    append_audit(db, actor_user_id=actor_user_id, action="RECOMMEND",
                 entity="l8_recommendation", entity_id=rec.id, after={"gap_id": gap_id})
    db.commit()
    return {"recommendation_id": rec.id, "text_en": rec.text_en, "text_ar": rec.text_ar,
            "confidence": rec.confidence, "status": rec.status}
