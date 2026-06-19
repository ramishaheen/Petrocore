"""L5 · Employee 360° Profile (Competency Passport) + dual approval chain."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_db_for, require_roles
from app.core.rbac import PROFILE_APPROVERS, Role
from app.models.l1_l2 import Employee
from app.models.l3_l4 import Competency
from app.models.l5_l6 import CompetencyResult, Profile, ProfileApproval
from app.schemas import CompetencyResultOut
from app.services.engines.governance import append_audit

router = APIRouter(prefix="/profiles", tags=["L5 · Employee 360° Profile"])


@router.get("")
def list_profiles(db: Session = Depends(get_db_for)) -> list[dict]:
    emp = {e.id: e for e in db.execute(select(Employee)).scalars().all()}
    out = []
    for p in db.execute(select(Profile)).scalars().all():
        e = emp.get(p.employee_id)
        out.append({
            "id": p.id, "employee_id": p.employee_id,
            "name_en": e.full_name_en if e else "", "name_ar": e.full_name_ar if e else "",
            "readiness_index": p.readiness_index, "status": p.status,
        })
    return out


@router.get("/{profile_id}")
def get_profile(profile_id: str, db: Session = Depends(get_db_for)) -> dict:
    profile = db.get(Profile, profile_id)
    if not profile:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "profile not found")
    employee = db.get(Employee, profile.employee_id)
    comp_names = {c.id: c for c in db.execute(select(Competency)).scalars().all()}
    results = db.execute(
        select(CompetencyResult).where(CompetencyResult.profile_id == profile_id)
    ).scalars().all()
    approvals = db.execute(
        select(ProfileApproval).where(ProfileApproval.profile_id == profile_id)
    ).scalars().all()
    return {
        "id": profile.id, "employee_id": profile.employee_id,
        "name_en": employee.full_name_en if employee else "",
        "name_ar": employee.full_name_ar if employee else "",
        "readiness_index": profile.readiness_index, "status": profile.status,
        "competency_results": [
            {**CompetencyResultOut.model_validate(r).model_dump(),
             "competency_en": comp_names[r.competency_id].name_en if r.competency_id in comp_names else r.competency_id,
             "competency_ar": comp_names[r.competency_id].name_ar if r.competency_id in comp_names else r.competency_id}
            for r in results
        ],
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
