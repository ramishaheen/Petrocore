"""L8 · AI Data Fusion & Gap Analysis."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_user, get_db_for
from app.models.l7_l8 import Gap, GapReport
from app.schemas import GapOut
from app.services import fusion_service

router = APIRouter(prefix="/gaps", tags=["L8 · AI Data Fusion & Gap Analysis"])


@router.post("/analyze/{employee_id}")
def analyze_employee(
    employee_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db_for),
) -> dict:
    """Individual Gap Report + Readiness Index (written back to profile)."""
    return fusion_service.analyze_individual(
        db, actor_user_id=user.id, tenant_id=user.tenant_id or "*", employee_id=employee_id
    )


@router.post("/department/{node_id}")
def analyze_department(
    node_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db_for),
) -> dict:
    """Department Gap Map + Competency Gap Matrix."""
    return fusion_service.analyze_department(
        db, actor_user_id=user.id, tenant_id=user.tenant_id or "*", node_id=node_id
    )


@router.get("/succession")
def succession(
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db_for),
) -> dict:
    """Succession & Second-Line readiness insights."""
    return fusion_service.succession_insights(db, tenant_id=user.tenant_id or "*")


@router.post("/{gap_id}/recommend")
def recommend(
    gap_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db_for),
) -> dict:
    """Generate a decision recommendation for a gap (gated by governance)."""
    return fusion_service.recommend(
        db, actor_user_id=user.id, tenant_id=user.tenant_id or "*", gap_id=gap_id
    )


@router.get("/reports")
def reports(kind: str | None = None, db: Session = Depends(get_db_for)) -> list[dict]:
    stmt = select(GapReport).order_by(GapReport.created_at.desc())
    if kind:
        stmt = stmt.where(GapReport.kind == kind)
    return [
        {"id": r.id, "kind": r.kind, "scope": r.scope, "subject_id": r.subject_id, "payload": r.payload}
        for r in db.execute(stmt).scalars().all()
    ]


@router.get("", response_model=list[GapOut])
def list_gaps(scope: str | None = None, db: Session = Depends(get_db_for)) -> list[Gap]:
    stmt = select(Gap)
    if scope:
        stmt = stmt.where(Gap.scope == scope)
    return list(db.execute(stmt).scalars().all())
