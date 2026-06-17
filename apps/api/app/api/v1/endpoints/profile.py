"""L5 · Employee 360° Profile (Competency Passport) + dual approval chain."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_db_for, require_roles
from app.core.rbac import PROFILE_APPROVERS, Role
from app.models.l5_l6 import CompetencyResult, Profile, ProfileApproval
from app.schemas import CompetencyResultOut, ProfileOut
from app.services.engines.governance import append_audit

router = APIRouter(prefix="/profiles", tags=["L5 · Employee 360° Profile"])


@router.get("", response_model=list[ProfileOut])
def list_profiles(db: Session = Depends(get_db_for)) -> list[Profile]:
    return list(db.execute(select(Profile)).scalars().all())


@router.get("/{profile_id}")
def get_profile(profile_id: str, db: Session = Depends(get_db_for)) -> dict:
    profile = db.get(Profile, profile_id)
    if not profile:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "profile not found")
    results = db.execute(
        select(CompetencyResult).where(CompetencyResult.profile_id == profile_id)
    ).scalars().all()
    approvals = db.execute(
        select(ProfileApproval).where(ProfileApproval.profile_id == profile_id)
    ).scalars().all()
    return {
        "id": profile.id, "employee_id": profile.employee_id,
        "readiness_index": profile.readiness_index, "status": profile.status,
        "competency_results": [CompetencyResultOut.model_validate(r).model_dump() for r in results],
        "approvals": [
            {"role": a.role, "decision": a.decision, "approver_user_id": a.approver_user_id}
            for a in approvals
        ],
    }


@router.post("/{profile_id}/approve")
def approve_profile(
    profile_id: str,
    user: CurrentUser = Depends(require_roles(Role.LINE_MANAGER, Role.HR_VALIDATOR)),
    db: Session = Depends(get_db_for),
) -> dict:
    """Record an approval. LINE_MANAGER + HR_VALIDATOR together ⇒ TRUSTED profile."""
    profile = db.get(Profile, profile_id)
    if not profile:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "profile not found")

    db.add(ProfileApproval(
        profile_id=profile_id, approver_user_id=user.id, role=user.role, decision="APPROVED",
    ))
    db.flush()

    roles_signed = {
        a.role for a in db.execute(
            select(ProfileApproval).where(
                ProfileApproval.profile_id == profile_id,
                ProfileApproval.decision == "APPROVED",
            )
        ).scalars().all()
    }
    if {Role.LINE_MANAGER.value, Role.HR_VALIDATOR.value}.issubset(roles_signed):
        profile.status = "TRUSTED"
    elif Role.LINE_MANAGER.value in roles_signed:
        profile.status = "MANAGER_APPROVED"
    elif Role.HR_VALIDATOR.value in roles_signed:
        profile.status = "HR_VALIDATED"

    append_audit(
        db, actor_user_id=user.id, action="PROFILE_APPROVE",
        entity="l5_profile", entity_id=profile_id, after={"status": profile.status},
    )
    db.commit()
    return {"profile_id": profile_id, "status": profile.status, "roles_signed": sorted(roles_signed)}
