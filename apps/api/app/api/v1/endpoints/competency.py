"""L3 · Competency Dictionary & Professional Standards."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db_for
from app.models.l3_l4 import Competency, CompetencyRequirement
from app.schemas import CompetencyOut

router = APIRouter(prefix="/competencies", tags=["L3 · Competency Dictionary"])

FAMILIES = {
    "TECHNICAL": "تقنية",
    "HSE": "الصحة والسلامة والبيئة",
    "BEHAVIORAL": "سلوكية",
    "LEADERSHIP": "قيادية",
    "DIGITAL": "رقمية",
    "EVIDENCE_STANDARD": "معايير الأدلة",
}

ADMIN_LEVELS = [
    {"level": 1, "en": "Operator — Apply & Operate", "ar": "تطبيق وتشغيل"},
    {"level": 2, "en": "Supervisor — Guide & Monitor", "ar": "توجيه ومتابعة"},
    {"level": 3, "en": "Section Head — Plan & Measure", "ar": "تخطيط ومؤشرات"},
    {"level": 4, "en": "Department Manager — Govern & Decide", "ar": "حوكمة وقرار"},
    {"level": 5, "en": "Executive — Strategy & Sustainability", "ar": "استراتيجية واستدامة"},
]

PROFICIENCY_BANDS = [
    {"band": "AWARENESS", "range": "0–2", "ar": "وعي"},
    {"band": "BASIC", "range": "3–5", "ar": "تطبيق أساسي"},
    {"band": "INDEPENDENT", "range": "6–10", "ar": "ممارسة مستقلة"},
    {"band": "ADVANCED", "range": "10+", "ar": "إتقان متقدم"},
    {"band": "EXPERT_COACH", "range": "—", "ar": "خبير/مُرشد"},
]


@router.get("/families")
def families() -> dict:
    return {"families": FAMILIES, "admin_levels": ADMIN_LEVELS, "proficiency_bands": PROFICIENCY_BANDS}


@router.get("", response_model=list[CompetencyOut])
def list_competencies(
    family: str | None = None, db: Session = Depends(get_db_for)
) -> list[Competency]:
    stmt = select(Competency).order_by(Competency.family, Competency.code)
    if family:
        stmt = stmt.where(Competency.family == family)
    return list(db.execute(stmt).scalars().all())


@router.get("/{competency_id}/requirements")
def requirements(competency_id: str, db: Session = Depends(get_db_for)) -> list[dict]:
    """Calibrated requirements — a competency is not a fixed bar for everyone."""
    rows = db.execute(
        select(CompetencyRequirement).where(CompetencyRequirement.competency_id == competency_id)
    ).scalars().all()
    return [
        {
            "id": r.id, "job_id": r.job_id, "admin_level": r.admin_level,
            "required_level": r.required_level, "min_experience_band": r.min_experience_band,
            "risk_weight": r.risk_weight, "activity_segment": r.activity_segment,
        }
        for r in rows
    ]
