"""Development planning orchestration (System Analysis §3.12, §15 / Phase P-H).

Derives learning needs from verified gaps, assembles development plans + items,
and tracks completion — every consequential write audited.
"""
from __future__ import annotations

from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.development import DevelopmentPlan, DevelopmentPlanItem, LearningNeed
from app.models.l1_l2 import Employee
from app.models.l3_l4 import Competency
from app.models.l7_l8 import Gap
from app.services.engines.governance import append_audit

# Map gap priority → a default development modality.
_NEED_TYPE = {"VERY_HIGH": "Training", "HIGH": "Training", "MEDIUM": "OJT"}


def derive_learning_needs(db: Session, *, actor_user_id: str | None, employee_id: str) -> list[dict]:
    """Create one open LearningNeed per verified gap for the employee (idempotent
    per gap — a need already linked to a gap is not duplicated)."""
    emp = db.get(Employee, employee_id)
    if not emp:
        raise ValueError("employee not found")
    gaps = [g for g in db.execute(
        select(Gap).where(Gap.subject_id == employee_id)
    ).scalars().all() if g.gap_size > 0]
    existing = {n.gap_id for n in db.execute(
        select(LearningNeed).where(LearningNeed.employee_id == employee_id)
    ).scalars().all() if n.gap_id}

    created = []
    for g in gaps:
        if g.id in existing:
            continue
        need = LearningNeed(
            tenant_id=emp.tenant_id, gap_id=g.id, employee_id=employee_id,
            competency_id=g.competency_id, need_type=_NEED_TYPE.get(g.priority, "Training"),
            priority=g.priority, target_level=g.target_level, status="OPEN")
        db.add(need)
        db.flush()
        created.append(need)
    if created:
        append_audit(db, actor_user_id=actor_user_id, action="DERIVE_LEARNING_NEEDS",
                     entity="dev_learning_need", entity_id=employee_id,
                     after={"employee_id": employee_id, "created": len(created)})
    return [_need_dict(db, n) for n in created]


def _need_dict(db: Session, n: LearningNeed) -> dict:
    comp = db.get(Competency, n.competency_id)
    return {"id": n.id, "competency_id": n.competency_id,
            "competency_en": comp.name_en if comp else n.competency_id,
            "need_type": n.need_type, "priority": n.priority,
            "target_level": n.target_level, "status": n.status}


def list_needs(db: Session, employee_id: str) -> list[dict]:
    rows = db.execute(select(LearningNeed).where(LearningNeed.employee_id == employee_id)).scalars().all()
    return [_need_dict(db, n) for n in rows]


def create_plan(
    db: Session, *, actor_user_id: str | None, tenant_id: str, entity_type: str,
    entity_id: str, plan_name: str, plan_period: str = "",
) -> DevelopmentPlan:
    plan = DevelopmentPlan(
        tenant_id=tenant_id, entity_type=entity_type, entity_id=entity_id,
        plan_name=plan_name, plan_period=plan_period, plan_owner=actor_user_id, approval_status="DRAFT")
    db.add(plan)
    db.flush()
    append_audit(db, actor_user_id=actor_user_id, action="CREATE_DEV_PLAN",
                 entity="dev_plan", entity_id=plan.id, after={"name": plan_name, "entity": entity_id})
    return plan


def add_item(
    db: Session, *, actor_user_id: str | None, plan_id: str, action_type: str,
    action_description: str, learning_need_id: str | None = None,
    target_date: date | None = None, post_assessment_required: bool = True,
) -> DevelopmentPlanItem:
    plan = db.get(DevelopmentPlan, plan_id)
    if not plan:
        raise ValueError("plan not found")
    item = DevelopmentPlanItem(
        tenant_id=plan.tenant_id, development_plan_id=plan_id, learning_need_id=learning_need_id,
        action_type=action_type, action_description=action_description, target_date=target_date,
        post_assessment_required=post_assessment_required, completion_status="PLANNED")
    db.add(item)
    if learning_need_id:
        need = db.get(LearningNeed, learning_need_id)
        if need:
            need.status = "PLANNED"
    db.flush()
    append_audit(db, actor_user_id=actor_user_id, action="ADD_DEV_ITEM",
                 entity="dev_item", entity_id=item.id, after={"plan_id": plan_id, "action": action_type})
    return item


def approve_plan(db: Session, *, actor_user_id: str | None, plan_id: str) -> dict:
    plan = db.get(DevelopmentPlan, plan_id)
    if not plan:
        raise ValueError("plan not found")
    plan.approval_status = "APPROVED"
    append_audit(db, actor_user_id=actor_user_id, action="APPROVE_DEV_PLAN",
                 entity="dev_plan", entity_id=plan_id, after={"status": "APPROVED"})
    return {"id": plan.id, "approval_status": plan.approval_status}


def complete_item(db: Session, *, actor_user_id: str | None, item_id: str) -> dict:
    item = db.get(DevelopmentPlanItem, item_id)
    if not item:
        raise ValueError("item not found")
    item.completion_status = "COMPLETE"
    if item.learning_need_id:
        need = db.get(LearningNeed, item.learning_need_id)
        if need:
            need.status = "CLOSED"
    append_audit(db, actor_user_id=actor_user_id, action="COMPLETE_DEV_ITEM",
                 entity="dev_item", entity_id=item_id, after={"status": "COMPLETE"})
    return {"id": item.id, "completion_status": item.completion_status}


def plan_detail(db: Session, plan_id: str) -> dict | None:
    plan = db.get(DevelopmentPlan, plan_id)
    if not plan:
        return None
    items = db.execute(select(DevelopmentPlanItem).where(DevelopmentPlanItem.development_plan_id == plan_id)).scalars().all()
    return {
        "id": plan.id, "plan_name": plan.plan_name, "entity_type": plan.entity_type,
        "entity_id": plan.entity_id, "approval_status": plan.approval_status,
        "items": [{"id": it.id, "action_type": it.action_type, "action_description": it.action_description,
                   "completion_status": it.completion_status,
                   "post_assessment_required": it.post_assessment_required} for it in items],
    }
