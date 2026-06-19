"""Phase P-H APIs: learning needs, development plans, and plan items."""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_db_for, require_roles
from app.core.rbac import Role
from app.models.development import DevelopmentPlan
from app.services import development_service as svc

router = APIRouter(prefix="/development", tags=["P-H · Development Planning"])

_planner = require_roles(
    Role.LD_MANAGER, Role.DEPT_MANAGER, Role.HR_VALIDATOR, Role.COMPANY_ADMIN,
    Role.PLATFORM_ADMIN, Role.CONSULTANT)


@router.post("/employees/{employee_id}/learning-needs")
def derive_needs(employee_id: str, user: CurrentUser = Depends(_planner), db: Session = Depends(get_db_for)) -> list[dict]:
    try:
        result = svc.derive_learning_needs(db, actor_user_id=user.id, employee_id=employee_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    db.commit()
    return result


@router.get("/employees/{employee_id}/learning-needs")
def list_needs(employee_id: str, db: Session = Depends(get_db_for)) -> list[dict]:
    return svc.list_needs(db, employee_id)


class PlanIn(BaseModel):
    entity_type: str = "Employee"
    entity_id: str
    plan_name: str
    plan_period: str = ""


@router.post("/plans")
def create_plan(body: PlanIn, user: CurrentUser = Depends(_planner), db: Session = Depends(get_db_for)) -> dict:
    plan = svc.create_plan(
        db, actor_user_id=user.id, tenant_id=user.tenant_id or "*", entity_type=body.entity_type,
        entity_id=body.entity_id, plan_name=body.plan_name, plan_period=body.plan_period)
    db.commit()
    return {"id": plan.id, "plan_name": plan.plan_name, "approval_status": plan.approval_status}


@router.get("/plans")
def list_plans(db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(select(DevelopmentPlan).order_by(DevelopmentPlan.created_at.desc())).scalars().all()
    return [{"id": p.id, "plan_name": p.plan_name, "entity_type": p.entity_type,
             "entity_id": p.entity_id, "approval_status": p.approval_status} for p in rows]


@router.get("/plans/{plan_id}")
def plan_detail(plan_id: str, db: Session = Depends(get_db_for)) -> dict:
    detail = svc.plan_detail(db, plan_id)
    if not detail:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "plan not found")
    return detail


class ItemIn(BaseModel):
    action_type: str = "Training"
    action_description: str = ""
    learning_need_id: str | None = None
    target_date: date | None = None
    post_assessment_required: bool = True


@router.post("/plans/{plan_id}/items")
def add_item(plan_id: str, body: ItemIn, user: CurrentUser = Depends(_planner), db: Session = Depends(get_db_for)) -> dict:
    try:
        item = svc.add_item(
            db, actor_user_id=user.id, plan_id=plan_id, action_type=body.action_type,
            action_description=body.action_description, learning_need_id=body.learning_need_id,
            target_date=body.target_date, post_assessment_required=body.post_assessment_required)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    db.commit()
    return {"id": item.id, "action_type": item.action_type, "completion_status": item.completion_status}


@router.post("/plans/{plan_id}/approve")
def approve_plan(plan_id: str, user: CurrentUser = Depends(_planner), db: Session = Depends(get_db_for)) -> dict:
    try:
        result = svc.approve_plan(db, actor_user_id=user.id, plan_id=plan_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    db.commit()
    return result


@router.post("/items/{item_id}/complete")
def complete_item(item_id: str, user: CurrentUser = Depends(_planner), db: Session = Depends(get_db_for)) -> dict:
    try:
        result = svc.complete_item(db, actor_user_id=user.id, item_id=item_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    db.commit()
    return result
