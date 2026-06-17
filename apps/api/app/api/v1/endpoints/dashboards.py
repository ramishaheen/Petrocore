"""L10 · Dashboards, Development Reports & Decision Support (Outputs Hub).

Provides the Executive Workforce Readiness Dashboard modules and the Layer &
Document Readiness Diagnostic. Reports aggregate L1–L9 read-models.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_db_for
from app.models.l1_l2 import OrgNode
from app.models.l5_l6 import CriticalRole, Profile
from app.models.l7_l8 import Gap
from app.schemas import LayerReadiness

router = APIRouter(prefix="/dashboards", tags=["L10 · Dashboards & Reports"])


@router.get("/executive")
def executive_dashboard(db: Session = Depends(get_db_for)) -> dict:
    """Executive Workforce Readiness Dashboard headline KPIs + modules."""
    avg_readiness = db.execute(select(func.avg(Profile.readiness_index))).scalar() or 0.0
    profile_count = db.execute(select(func.count(Profile.id))).scalar() or 0
    critical_total = db.execute(select(func.count(CriticalRole.id))).scalar() or 0
    high_risk = db.execute(
        select(func.count(CriticalRole.id)).where(CriticalRole.loss_risk >= 0.6)
    ).scalar() or 0

    # Top critical competency gaps (by count of VERY_HIGH/HIGH).
    top_gaps = db.execute(
        select(Gap.competency_id, func.count(Gap.id).label("n"))
        .where(Gap.priority.in_(["VERY_HIGH", "HIGH"]))
        .group_by(Gap.competency_id)
        .order_by(func.count(Gap.id).desc())
        .limit(5)
    ).all()

    companies = db.execute(
        select(OrgNode).where(OrgNode.node_type == "SUBSIDIARY")
    ).scalars().all()

    return {
        "workforce_readiness_index": round(float(avg_readiness), 1),
        "profiles": profile_count,
        "critical_jobs_total": critical_total,
        "high_risk_critical_jobs": high_risk,
        "high_risk_pct": round(100 * high_risk / critical_total, 1) if critical_total else 0.0,
        "top_competency_gaps": [{"competency_id": c, "count": n} for c, n in top_gaps],
        "companies": [{"id": c.id, "name_en": c.name_en, "name_ar": c.name_ar} for c in companies],
        "modules": [
            "Workforce Readiness Index", "Company Readiness Comparison",
            "Critical Competency Gaps", "Training Impact Overview",
            "Succession Readiness", "Talent Pipeline",
            "Critical Role Risk", "Decision Priorities",
        ],
    }


# ---- Layer & Document Readiness Diagnostic (cross-cutting §12) ----
_LAYERS = [
    ("L1", "Strategy & Institutional Context", "الاستراتيجية والسياق المؤسسي", OrgNode),
    ("L5", "Employee 360° Profile", "البروفايل الشامل للموظف", Profile),
    ("L6", "Critical Roles", "الوظائف الحرجة", CriticalRole),
    ("L8", "Gap Analysis", "تحليل الفجوات", Gap),
]


@router.get("/diagnostic", response_model=list[LayerReadiness])
def readiness_diagnostic(db: Session = Depends(get_db_for)) -> list[LayerReadiness]:
    """Validate the data each layer relies on: READY / NEEDS_REVIEW / NEEDS_BUILD."""
    out: list[LayerReadiness] = []
    for layer, en, ar, model in _LAYERS:
        count = db.execute(select(func.count(model.id))).scalar() or 0
        if count == 0:
            status, detail = "NEEDS_BUILD", "No records — inputs not yet prepared."
        elif count < 3:
            status, detail = "NEEDS_REVIEW", f"{count} record(s) — verify completeness."
        else:
            status, detail = "READY", f"{count} records available."
        out.append(LayerReadiness(layer=layer, name_en=en, name_ar=ar, status=status, detail=detail))
    return out
