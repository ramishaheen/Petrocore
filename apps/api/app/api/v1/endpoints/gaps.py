"""L8 · AI Data Fusion & Gap Analysis."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_user, get_db_for
from app.models.l5_l6 import CompetencyResult, Profile
from app.models.l7_l8 import Gap
from app.schemas import GapOut
from app.services.engines.fusion_engine import CompetencySignal, fuse, readiness_index

router = APIRouter(prefix="/gaps", tags=["L8 · AI Data Fusion & Gap Analysis"])


@router.post("/analyze/{employee_id}")
def analyze_employee(
    employee_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db_for),
) -> dict:
    """Fuse an employee's competency results into prioritized gaps + readiness index."""
    profile = db.query(Profile).filter(Profile.employee_id == employee_id).one_or_none()
    results = []
    if profile:
        results = db.execute(
            select(CompetencyResult).where(CompetencyResult.profile_id == profile.id)
        ).scalars().all()

    signals = [
        CompetencySignal(
            competency_id=r.competency_id,
            current_level=r.assessed_level,
            target_level=r.required_level,
            evidence_count=1 if r.evidence_id else 0,
            consistency=r.confidence,
        )
        for r in results
    ]
    gaps = fuse(signals)
    idx = readiness_index(signals)

    # Persist gaps and write readiness index back to the profile.
    for g in gaps:
        db.add(Gap(
            tenant_id=user.tenant_id or "*", scope="INDIVIDUAL", subject_id=employee_id,
            competency_id=g["competency_id"], current_level=g["current_level"],
            target_level=g["target_level"], gap_size=g["gap_size"],
            priority=g["priority"], confidence=g["confidence"],
        ))
    if profile:
        profile.readiness_index = idx
    db.commit()
    return {"employee_id": employee_id, "readiness_index": idx, "gaps": gaps}


@router.get("", response_model=list[GapOut])
def list_gaps(
    scope: str | None = None, db: Session = Depends(get_db_for)
) -> list[Gap]:
    stmt = select(Gap)
    if scope:
        stmt = stmt.where(Gap.scope == scope)
    return list(db.execute(stmt).scalars().all())
