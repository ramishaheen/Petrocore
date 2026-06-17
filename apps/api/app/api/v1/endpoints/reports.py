"""L10 · Outputs Hub — the 8 platform reports (§9) + Institutional Value (§10)."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_user, get_db_for
from app.models.l1_l2 import Employee
from app.models.l3_l4 import Competency
from app.models.l5_l6 import CompetencyResult, CriticalRole, Profile
from app.models.l7_l8 import Gap, Recommendation
from app.services import fusion_service
from app.services.engines import value_engine

router = APIRouter(prefix="/reports", tags=["L10 · Reports & Decision Support"])


def _status_scale(assessed: int, required: int) -> str:
    if assessed == 0:
        return "Not Assessed"
    ratio = assessed / required if required else 1.0
    if ratio >= 1.0:
        return "Strong"
    if ratio >= 0.6:
        return "Developing"
    return "Needs Focus"


@router.get("/employee/{employee_id}")
def employee_development(employee_id: str, db: Session = Depends(get_db_for)) -> dict:
    """#1 Employee Personal Development Report (§9.1)."""
    emp = db.get(Employee, employee_id)
    if not emp:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "employee not found")
    profile = db.query(Profile).filter(Profile.employee_id == employee_id).one_or_none()
    comp_names = {c.id: c for c in db.execute(select(Competency)).scalars().all()}
    panels = []
    if profile:
        for r in db.execute(
            select(CompetencyResult).where(CompetencyResult.profile_id == profile.id)
        ).scalars().all():
            c = comp_names.get(r.competency_id)
            panels.append({
                "competency_en": c.name_en if c else r.competency_id,
                "competency_ar": c.name_ar if c else r.competency_id,
                "assessed_level": r.assessed_level, "required_level": r.required_level,
                "gap": max(0, r.required_level - r.assessed_level),
                "status": _status_scale(r.assessed_level, r.required_level),
                "confidence": r.confidence,
            })
    return {
        "employee": {"id": emp.id, "name_en": emp.full_name_en, "name_ar": emp.full_name_ar},
        "readiness_index": profile.readiness_index if profile else 0.0,
        "profile_status": profile.status if profile else "NONE",
        "competencies": panels,
        "development_path": ["Learn", "Practice", "Apply", "Excel"],
        "recommended_actions": [p for p in panels if p["status"] in ("Needs Focus", "Developing")],
    }


@router.get("/decision-matrix")
def decision_matrix(db: Session = Depends(get_db_for)) -> list[dict]:
    """#2 Training & Development Decision Matrix (§9.2)."""
    comp_names = {c.id: c for c in db.execute(select(Competency)).scalars().all()}
    rows = []
    for g in db.execute(select(Gap).where(Gap.gap_size > 0)).scalars().all():
        c = comp_names.get(g.competency_id)
        rows.append({
            "target_group": g.subject_id, "scope": g.scope,
            "competency_gap_en": c.name_en if c else g.competency_id,
            "competency_gap_ar": c.name_ar if c else g.competency_id,
            "priority": g.priority,
            "recommended_program": f"{c.name_en if c else ''} L{g.target_level} Development",
            "learning_method": "Blended", "provider": "Murzuq Academy",
            "impact_kpi": "Readiness Index uplift",
        })
    return rows


@router.get("/talent-discovery")
def talent_discovery(db: Session = Depends(get_db_for)) -> list[dict]:
    """#3 Talent Discovery Report — surface hidden high-potential talent."""
    profiles = db.execute(select(Profile).where(Profile.readiness_index >= 80)).scalars().all()
    emp = {e.id: e for e in db.execute(select(Employee)).scalars().all()}
    return [
        {"employee_id": p.employee_id,
         "name_en": emp[p.employee_id].full_name_en if p.employee_id in emp else "",
         "readiness_index": p.readiness_index, "signal": "High potential"}
        for p in profiles
    ]


@router.get("/succession")
def succession(
    user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db_for)
) -> dict:
    """#4 Succession & Second-Line Readiness Report (§9.3)."""
    return fusion_service.succession_insights(db, tenant_id=user.tenant_id or "*")


@router.get("/department-readiness")
def department_readiness(db: Session = Depends(get_db_for)) -> dict:
    """#5 Department Readiness Map — readiness by department/section."""
    profiles = db.execute(select(Profile)).scalars().all()
    by_tenant: dict[str, list[float]] = {}
    for p in profiles:
        by_tenant.setdefault(p.tenant_id, []).append(p.readiness_index)
    return {
        "departments": [
            {"tenant_id": t, "avg_readiness": round(sum(v) / len(v), 1), "employees": len(v)}
            for t, v in by_tenant.items()
        ]
    }


@router.get("/training-impact")
def training_impact(db: Session = Depends(get_db_for)) -> dict:
    """#6 Training Impact Report — ROI & gap closure."""
    from app.models.l9_gov import TrainingImpact

    impacts = db.execute(select(TrainingImpact)).scalars().all()
    avg_closure = round(sum(i.gap_closure_pct for i in impacts) / len(impacts), 1) if impacts else 0.0
    return {
        "programs_measured": len(impacts), "avg_gap_closure_pct": avg_closure,
        "records": [
            {"nomination_id": i.nomination_id, "pre": i.pre_level, "post": i.post_level,
             "gap_closure_pct": i.gap_closure_pct}
            for i in impacts
        ],
    }


@router.get("/governance-audit")
def governance_audit(db: Session = Depends(get_db_for)) -> dict:
    """#8 Governance & Audit Report — full decision audit trail."""
    from app.models.l9_gov import AuditLog, GovDecision
    from app.services.engines.governance import verify_chain

    decisions = db.execute(select(GovDecision)).scalars().all()
    logs = db.execute(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(50)).scalars().all()
    return {
        "audit_chain_intact": verify_chain(db),
        "decisions": [
            {"id": d.id, "kind": d.kind, "status": d.governance_status, "confidence": d.confidence}
            for d in decisions
        ],
        "recent_audit_log": [
            {"action": l.action, "entity": l.entity, "entity_id": l.entity_id, "hash": l.hash[:12]}
            for l in logs
        ],
    }


@router.get("/institutional-value")
def institutional_value(db: Session = Depends(get_db_for)) -> dict:
    """Institutional Value Engine — 6 value dimensions + value index (§10)."""
    return value_engine.compute(db)
