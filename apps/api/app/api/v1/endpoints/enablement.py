"""Enablement, Pilot & Rollout workflows (§13) — advisory prep, pilot entry, calibration."""
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_db_for
from app.models.l1_l2 import OrgNode
from app.models.l5_l6 import Profile

router = APIRouter(prefix="/enablement", tags=["Enablement, Pilot & Rollout"])

# §13.2 Advisory Enablement & Data Preparation — 7 workstreams.
ADVISORY_WORKSTREAMS = [
    {"id": 1, "en": "Job Descriptions", "ar": "الوصف الوظيفي"},
    {"id": 2, "en": "Competency Dictionary", "ar": "قاموس الجدارات"},
    {"id": 3, "en": "HR Data Cleaning", "ar": "تنظيف بيانات الموارد البشرية"},
    {"id": 4, "en": "KPIs & Objectives", "ar": "المؤشرات والأهداف"},
    {"id": 5, "en": "Training Records", "ar": "سجلات التدريب"},
    {"id": 6, "en": "Asset & Role Mapping", "ar": "ربط الأصول والأدوار"},
    {"id": 7, "en": "Governance Rules", "ar": "قواعد الحوكمة"},
]

# §13.1 Integrated Input Enablement Model — four sources.
INPUT_SOURCES = [
    {"en": "Your People", "ar": "موظفوكم"},
    {"en": "Consulting Team", "ar": "الفريق الاستشاري"},
    {"en": "AI Assistance", "ar": "مساعدة الذكاء الاصطناعي"},
    {"en": "HR & Management Approval", "ar": "اعتماد الموارد البشرية والإدارة"},
]


@router.get("/advisory")
def advisory() -> dict:
    """§13.2 Advisory Enablement & Data Preparation workstreams + input model."""
    return {"workstreams": ADVISORY_WORKSTREAMS, "input_sources": INPUT_SOURCES,
            "principle": "AI supports · Consultants enable · Your people own the knowledge · Governance creates trust."}


@router.get("/pilot-entry")
def pilot_entry(db: Session = Depends(get_db_for)) -> dict:
    """§13.3 Pilot Entry Decision Matrix: Strategic Impact (y) × Readiness (x).

    Each subsidiary is scored; the best starting point = high readiness + high impact.
    """
    subs = db.execute(select(OrgNode).where(OrgNode.node_type == "SUBSIDIARY")).scalars().all()
    candidates = []
    for s in subs:
        # Profiles live on leaf-tenant nodes (sections); a section belongs to this
        # subsidiary when the subsidiary id appears in the node's materialized path.
        descendant_ids = db.execute(
            select(OrgNode.id).where(OrgNode.path.like(f"%{s.id}%"))
        ).scalars().all()
        readiness = db.execute(
            select(func.avg(Profile.readiness_index)).where(Profile.tenant_id.in_(descendant_ids))
        ).scalar() if descendant_ids else None
        readiness = round(float(readiness or 0.0), 1)
        # Impact heuristic: subsidiaries with critical activity weight higher (demo: fixed high).
        impact = 80.0
        candidates.append({
            "id": s.id, "name_en": s.name_en, "name_ar": s.name_ar,
            "readiness": readiness, "strategic_impact": impact,
            "score": round((readiness + impact) / 2, 1),
        })
    candidates.sort(key=lambda c: -c["score"])
    return {
        "scopes": ["Subsidiary Company", "Technical Department", "Job Family",
                   "Critical Roles", "Management Level", "Employee Group"],
        "candidates": candidates,
        "best_starting_point": candidates[0] if candidates else None,
        "principle": "Start with the smartest, not the biggest.",
    }


@router.get("/calibration")
def calibration(db: Session = Depends(get_db_for)) -> dict:
    """§13.4 Pilot Execution, AI Calibration & Scale-Up tracking."""
    # Calibration score: share of competency results above the confidence threshold.
    from app.core.config import settings
    from app.models.l5_l6 import CompetencyResult

    results = db.execute(select(CompetencyResult)).scalars().all()
    high_conf = [r for r in results if r.confidence >= settings.CONFIDENCE_REVIEW_THRESHOLD]
    calibration_score = round(100 * len(high_conf) / len(results), 1) if results else 0.0
    return {
        "calibration_score": calibration_score,
        "target": 92.0,
        "on_target": calibration_score >= 92.0,
        "value_realized": {
            "cost_savings": "TBD", "efficiency": "TBD",
            "decision_speed": "improved", "roi": "TBD",
        },
        "scale_up_roadmap": [
            {"phase": 1, "en": "Expand Units", "ar": "توسيع الوحدات"},
            {"phase": 2, "en": "Additional Use Cases", "ar": "حالات استخدام إضافية"},
            {"phase": 3, "en": "Enterprise Rollout", "ar": "النشر المؤسسي"},
        ],
    }
