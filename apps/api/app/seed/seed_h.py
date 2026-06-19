"""Seed Phase P-H data: a sample development plan with one item (idempotent)."""
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.development import DevelopmentPlan
from app.models.l1_l2 import Employee
from app.services import development_service as svc


def seed_h(db: Session) -> None:
    if db.query(DevelopmentPlan).count() > 0:
        return
    emp = db.execute(select(Employee)).scalars().first()
    if not emp:
        return
    plan = svc.create_plan(
        db, actor_user_id=None, tenant_id=emp.tenant_id, entity_type="Employee",
        entity_id=emp.id, plan_name="Individual Development Plan 2026", plan_period="2026")
    svc.add_item(
        db, actor_user_id=None, plan_id=plan.id, action_type="Training",
        action_description="Process Safety Management — Level 5 program.",
        target_date=date(2026, 9, 1), post_assessment_required=True)
    db.flush()
