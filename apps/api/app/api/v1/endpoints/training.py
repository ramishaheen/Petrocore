"""L9 · Training, Learning & Development Governance (Before / During / After)."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_user, get_db_for, require_roles
from app.core.rbac import Role
from app.models.l9_gov import Program
from app.schemas import (
    DesignProgram, ImpactIn, NominateIn, ProgramOut, StageAdvance,
)
from app.services import learning_service

router = APIRouter(prefix="/training", tags=["L9 · Training & Development Governance"])

_ld = require_roles(Role.LD_MANAGER, Role.DEPT_MANAGER, Role.COMPANY_ADMIN, Role.PLATFORM_ADMIN)


# ---- BEFORE ----
@router.post("/needs")
def derive_needs(
    min_priority: str = "HIGH",
    user: CurrentUser = Depends(_ld),
    db: Session = Depends(get_db_for),
) -> list[dict]:
    """Verified gaps → training needs."""
    return learning_service.derive_needs(db, tenant_id=user.tenant_id or "*", min_priority=min_priority)


@router.get("/cohorts")
def cohorts(db: Session = Depends(get_db_for)) -> list[dict]:
    """Learner grouping by gap/level similarity."""
    return learning_service.group_learners(db)


@router.post("/programs")
def design_program(
    body: DesignProgram,
    user: CurrentUser = Depends(_ld),
    db: Session = Depends(get_db_for),
) -> dict:
    return learning_service.design_program(
        db, tenant_id=user.tenant_id or "*", competency_id=body.competency_id,
        target_level=body.target_level, method=body.method, provider=body.provider,
        impact_kpi=body.impact_kpi,
    )


@router.get("/programs", response_model=list[ProgramOut])
def list_programs(db: Session = Depends(get_db_for)) -> list[Program]:
    return list(db.execute(select(Program)).scalars().all())


@router.post("/nominate")
def nominate(
    body: NominateIn,
    user: CurrentUser = Depends(_ld),
    db: Session = Depends(get_db_for),
) -> dict:
    return learning_service.nominate(
        db, tenant_id=user.tenant_id or "*", employee_id=body.employee_id,
        program_id=body.program_id, gap_id=body.gap_id,
    )


# ---- DURING ----
@router.post("/nominations/{nomination_id}/stage")
def advance(
    nomination_id: str,
    body: StageAdvance,
    user: CurrentUser = Depends(_ld),
    db: Session = Depends(get_db_for),
) -> dict:
    return learning_service.advance_stage(
        db, nomination_id=nomination_id, stage=body.stage, status=body.status
    )


# ---- AFTER ----
@router.post("/nominations/{nomination_id}/impact")
def impact(
    nomination_id: str,
    body: ImpactIn,
    user: CurrentUser = Depends(_ld),
    db: Session = Depends(get_db_for),
) -> dict:
    """Measure impact and write back to the profile + readiness index."""
    return learning_service.measure_impact(
        db, actor_user_id=user.id, tenant_id=user.tenant_id or "*",
        nomination_id=nomination_id, pre_level=body.pre_level, post_level=body.post_level,
        performance_link=body.performance_link,
    )
