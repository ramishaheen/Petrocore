"""Phase P-E APIs: talent segmentation, succession planning, knowledge continuity."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_db_for, require_roles
from app.core.rbac import Role
from app.models.l1_l2 import Employee
from app.models.talent import (
    KnowledgeHolder, KnowledgeTransferPlan, SuccessionPlan, TalentProfile,
)
from app.services import talent_service

router = APIRouter(prefix="/talent", tags=["P-E · Talent, Succession & Knowledge Continuity"])

# Talent/succession are workforce decisions owned by HR, managers and executives.
_talent = require_roles(
    Role.HR_VALIDATOR, Role.DEPT_MANAGER, Role.LD_MANAGER, Role.COMPANY_ADMIN,
    Role.NOC_EXECUTIVE, Role.PLATFORM_ADMIN, Role.CONSULTANT,
)


# ---------------------------------------------------------------- pipeline & talent
@router.get("/pipeline")
def pipeline(db: Session = Depends(get_db_for)) -> dict:
    return talent_service.talent_pipeline(db)


@router.get("/profiles")
def talent_profiles(db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(select(TalentProfile)).scalars().all()
    names = {e.id: e for e in db.execute(select(Employee)).scalars().all()}
    return [
        {"id": p.id, "employee_id": p.employee_id,
         "name_en": names[p.employee_id].full_name_en if p.employee_id in names else p.employee_id,
         "name_ar": names[p.employee_id].full_name_ar if p.employee_id in names else p.employee_id,
         "talent_segment": p.talent_segment, "potential_rating": p.potential_rating,
         "readiness_status": p.readiness_status}
        for p in rows
    ]


class FlagIn(BaseModel):
    talent_segment: str
    potential_rating: str = "MED"
    notes: str = ""


@router.post("/employees/{employee_id}/flag")
def flag_talent(
    employee_id: str, body: FlagIn,
    user: CurrentUser = Depends(_talent), db: Session = Depends(get_db_for),
) -> dict:
    try:
        result = talent_service.flag_talent(
            db, actor_user_id=user.id, employee_id=employee_id,
            talent_segment=body.talent_segment, potential_rating=body.potential_rating, notes=body.notes)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    db.commit()
    return result


# ---------------------------------------------------------------- succession
@router.get("/critical-roles")
def critical_roles(db: Session = Depends(get_db_for)) -> list[dict]:
    return talent_service.critical_roles(db)


@router.post("/jobs/{job_id}/succession-plan")
def build_plan(
    job_id: str, user: CurrentUser = Depends(_talent), db: Session = Depends(get_db_for),
) -> dict:
    try:
        result = talent_service.build_succession_plan(db, actor_user_id=user.id, job_id=job_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    db.commit()
    return result


@router.get("/succession-plans")
def list_plans(db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(select(SuccessionPlan).order_by(SuccessionPlan.created_at.desc())).scalars().all()
    return [
        {"id": p.id, "job_id": p.job_id, "plan_name": p.plan_name, "bench_strength": p.bench_strength,
         "ready_now": p.ready_now, "candidate_count": p.candidate_count, "approval_status": p.approval_status}
        for p in rows
    ]


@router.get("/succession-plans/{plan_id}")
def plan_detail(plan_id: str, db: Session = Depends(get_db_for)) -> dict:
    plan = db.get(SuccessionPlan, plan_id)
    if not plan:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "plan not found")
    return talent_service.serialize_plan(db, plan)


class DecisionIn(BaseModel):
    approve: bool = True


@router.post("/successors/{candidate_id}/decision")
def decide_successor(
    candidate_id: str, body: DecisionIn,
    user: CurrentUser = Depends(_talent), db: Session = Depends(get_db_for),
) -> dict:
    try:
        result = talent_service.decide_successor(
            db, actor_user_id=user.id, candidate_id=candidate_id, approve=body.approve)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    db.commit()
    return result


# ---------------------------------------------------------------- knowledge continuity
@router.get("/knowledge-holders")
def knowledge_holders(db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(select(KnowledgeHolder)).scalars().all()
    names = {e.id: e for e in db.execute(select(Employee)).scalars().all()}
    return [
        {"id": h.id, "employee_id": h.employee_id,
         "name_en": names[h.employee_id].full_name_en if h.employee_id in names else h.employee_id,
         "name_ar": names[h.employee_id].full_name_ar if h.employee_id in names else h.employee_id,
         "knowledge_domain": h.knowledge_domain, "criticality": h.criticality,
         "retirement_risk": h.retirement_risk, "transfer_status": h.transfer_status}
        for h in rows
    ]


class HolderIn(BaseModel):
    employee_id: str
    knowledge_domain: str
    criticality: str = "HIGH"
    retirement_risk: float = 0.0


@router.post("/knowledge-holders")
def register_holder(
    body: HolderIn, user: CurrentUser = Depends(_talent), db: Session = Depends(get_db_for),
) -> dict:
    try:
        result = talent_service.register_knowledge_holder(
            db, actor_user_id=user.id, employee_id=body.employee_id,
            knowledge_domain=body.knowledge_domain, criticality=body.criticality,
            retirement_risk=body.retirement_risk)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    db.commit()
    return result


@router.get("/transfer-plans")
def transfer_plans(db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(select(KnowledgeTransferPlan)).scalars().all()
    return [
        {"id": p.id, "knowledge_holder_id": p.knowledge_holder_id, "plan_name": p.plan_name,
         "successor_employee_id": p.successor_employee_id, "mentoring_flag": p.mentoring_flag,
         "status": p.status}
        for p in rows
    ]


class TransferPlanIn(BaseModel):
    knowledge_holder_id: str
    plan_name: str
    successor_employee_id: str | None = None
    mentoring_flag: bool = True


@router.post("/transfer-plans")
def create_transfer_plan(
    body: TransferPlanIn, user: CurrentUser = Depends(_talent), db: Session = Depends(get_db_for),
) -> dict:
    try:
        result = talent_service.create_transfer_plan(
            db, actor_user_id=user.id, knowledge_holder_id=body.knowledge_holder_id,
            plan_name=body.plan_name, successor_employee_id=body.successor_employee_id,
            mentoring_flag=body.mentoring_flag)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    db.commit()
    return result
