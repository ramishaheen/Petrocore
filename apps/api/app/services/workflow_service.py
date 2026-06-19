"""Generic workflow + permissions orchestration (System Analysis §3.14 / Phase P-K).

A reusable multi-step approval workflow over any entity, plus scoped
permission-role assignment. Every decision is recorded and audited.
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.workflow import (
    Approval, PermissionRole, UserPermissionRole, WorkflowInstance, WorkflowStep,
)
from app.services.engines.governance import append_audit


def start_workflow(
    db: Session, *, actor_user_id: str | None, tenant_id: str, workflow_type: str,
    entity_type: str, entity_id: str, steps: list[tuple[str, str]],
) -> WorkflowInstance:
    inst = WorkflowInstance(
        tenant_id=tenant_id, workflow_type=workflow_type, entity_type=entity_type,
        entity_id=entity_id, current_step=1, status="OPEN", created_by=actor_user_id)
    db.add(inst)
    db.flush()
    for i, (name, role) in enumerate(steps, start=1):
        db.add(WorkflowStep(tenant_id=tenant_id, instance_id=inst.id, step_order=i,
                            step_name=name, approver_role=role, status="PENDING"))
    db.flush()
    append_audit(db, actor_user_id=actor_user_id, action="START_WORKFLOW",
                 entity="wf_instance", entity_id=inst.id,
                 after={"type": workflow_type, "entity": entity_id, "steps": len(steps)})
    return inst


def act(db: Session, *, actor_user_id: str | None, instance_id: str, decision: str,
        approval_role: str = "", comments: str = "") -> dict:
    inst = db.get(WorkflowInstance, instance_id)
    if not inst:
        raise ValueError("workflow not found")
    if inst.status != "OPEN":
        raise ValueError("workflow already resolved")
    step = db.execute(
        select(WorkflowStep).where(
            WorkflowStep.instance_id == instance_id,
            WorkflowStep.step_order == inst.current_step)
    ).scalars().first()
    if not step:
        raise ValueError("no pending step")

    db.add(Approval(tenant_id=inst.tenant_id, instance_id=instance_id, step_id=step.id,
                    approver_id=actor_user_id, approval_role=approval_role or step.approver_role,
                    decision=decision, comments=comments))
    step.decided_by = actor_user_id
    step.decided_at = datetime.now(timezone.utc)

    if decision == "Approved":
        step.status = "APPROVED"
        total = db.execute(
            select(WorkflowStep).where(WorkflowStep.instance_id == instance_id)
        ).scalars().all()
        if inst.current_step >= len(total):
            inst.status = "APPROVED"
        else:
            inst.current_step += 1
    else:  # Rejected / Returned
        step.status = "REJECTED"
        inst.status = "REJECTED"
    db.flush()
    append_audit(db, actor_user_id=actor_user_id, action="WORKFLOW_ACT",
                 entity="wf_instance", entity_id=instance_id,
                 after={"decision": decision, "status": inst.status, "step": step.step_order})
    return {"instance_id": instance_id, "status": inst.status, "current_step": inst.current_step}


def instance_detail(db: Session, instance_id: str) -> dict | None:
    inst = db.get(WorkflowInstance, instance_id)
    if not inst:
        return None
    steps = db.execute(
        select(WorkflowStep).where(WorkflowStep.instance_id == instance_id).order_by(WorkflowStep.step_order)
    ).scalars().all()
    return {
        "id": inst.id, "workflow_type": inst.workflow_type, "entity_type": inst.entity_type,
        "entity_id": inst.entity_id, "status": inst.status, "current_step": inst.current_step,
        "steps": [{"step_order": s.step_order, "step_name": s.step_name, "approver_role": s.approver_role,
                   "status": s.status} for s in steps],
    }


def create_permission_role(db: Session, *, role_name: str, role_scope: str, description: str = "") -> PermissionRole:
    r = PermissionRole(role_name=role_name, role_scope=role_scope, description=description)
    db.add(r)
    db.flush()
    return r


def assign_permission_role(
    db: Session, *, actor_user_id: str | None, tenant_id: str, user_id: str,
    permission_role_id: str, company_id: str | None = None, org_unit_id: str | None = None,
) -> UserPermissionRole:
    a = UserPermissionRole(tenant_id=tenant_id, user_id=user_id, permission_role_id=permission_role_id,
                           company_id=company_id, org_unit_id=org_unit_id)
    db.add(a)
    db.flush()
    append_audit(db, actor_user_id=actor_user_id, action="ASSIGN_PERMISSION_ROLE",
                 entity="sec_user_permission_role", entity_id=a.id,
                 after={"user_id": user_id, "permission_role_id": permission_role_id})
    return a
