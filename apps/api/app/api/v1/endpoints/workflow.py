"""Phase P-K APIs: generic approval workflows + scoped permission roles."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_db_for, require_roles
from app.core.rbac import Role
from app.models.workflow import PermissionRole, UserPermissionRole, WorkflowInstance
from app.services import workflow_service as svc

router = APIRouter(tags=["P-K · Workflow & Permissions"])

_admin = require_roles(
    Role.COMPANY_ADMIN, Role.DEPT_MANAGER, Role.HR_VALIDATOR, Role.NOC_EXECUTIVE,
    Role.PLATFORM_ADMIN, Role.CONSULTANT)


class StepIn(BaseModel):
    step_name: str
    approver_role: str


class WorkflowIn(BaseModel):
    workflow_type: str
    entity_type: str
    entity_id: str
    steps: list[StepIn]


@router.post("/workflows")
def start_workflow(body: WorkflowIn, user: CurrentUser = Depends(_admin), db: Session = Depends(get_db_for)) -> dict:
    inst = svc.start_workflow(
        db, actor_user_id=user.id, tenant_id=user.tenant_id or "*", workflow_type=body.workflow_type,
        entity_type=body.entity_type, entity_id=body.entity_id,
        steps=[(s.step_name, s.approver_role) for s in body.steps])
    db.commit()
    return svc.instance_detail(db, inst.id)


@router.get("/workflows")
def list_workflows(db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(select(WorkflowInstance).order_by(WorkflowInstance.created_at.desc())).scalars().all()
    return [{"id": w.id, "workflow_type": w.workflow_type, "entity_type": w.entity_type,
             "entity_id": w.entity_id, "status": w.status, "current_step": w.current_step} for w in rows]


@router.get("/workflows/{instance_id}")
def workflow_detail(instance_id: str, db: Session = Depends(get_db_for)) -> dict:
    detail = svc.instance_detail(db, instance_id)
    if not detail:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "workflow not found")
    return detail


class ActIn(BaseModel):
    decision: str  # Approved | Rejected | Returned
    approval_role: str = ""
    comments: str = ""


@router.post("/workflows/{instance_id}/act")
def act(instance_id: str, body: ActIn, user: CurrentUser = Depends(_admin), db: Session = Depends(get_db_for)) -> dict:
    try:
        result = svc.act(db, actor_user_id=user.id, instance_id=instance_id, decision=body.decision,
                         approval_role=body.approval_role, comments=body.comments)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))
    db.commit()
    return result


@router.get("/permission-roles")
def list_permission_roles(db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(select(PermissionRole).order_by(PermissionRole.role_name)).scalars().all()
    return [{"id": r.id, "role_name": r.role_name, "role_scope": r.role_scope, "description": r.description} for r in rows]


class PermissionRoleIn(BaseModel):
    role_name: str
    role_scope: str = "Company"
    description: str = ""


@router.post("/permission-roles")
def create_permission_role(body: PermissionRoleIn, user: CurrentUser = Depends(_admin), db: Session = Depends(get_db_for)) -> dict:
    r = svc.create_permission_role(db, role_name=body.role_name, role_scope=body.role_scope, description=body.description)
    db.commit()
    return {"id": r.id, "role_name": r.role_name, "role_scope": r.role_scope}


class AssignIn(BaseModel):
    user_id: str
    permission_role_id: str
    company_id: str | None = None
    org_unit_id: str | None = None


@router.post("/permission-roles/assign")
def assign_permission_role(body: AssignIn, user: CurrentUser = Depends(_admin), db: Session = Depends(get_db_for)) -> dict:
    a = svc.assign_permission_role(
        db, actor_user_id=user.id, tenant_id=user.tenant_id or "*", user_id=body.user_id,
        permission_role_id=body.permission_role_id, company_id=body.company_id, org_unit_id=body.org_unit_id)
    db.commit()
    return {"id": a.id, "user_id": a.user_id, "permission_role_id": a.permission_role_id}


@router.get("/permission-roles/assignments")
def list_assignments(db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(select(UserPermissionRole)).scalars().all()
    return [{"id": a.id, "user_id": a.user_id, "permission_role_id": a.permission_role_id,
             "company_id": a.company_id, "org_unit_id": a.org_unit_id} for a in rows]
