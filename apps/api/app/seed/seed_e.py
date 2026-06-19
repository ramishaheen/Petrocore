"""Seed Phase P-E data: a succession plan for the seeded critical role, a flagged
talent profile, and a knowledge holder + transfer plan (idempotent, additive)."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.l1_l2 import Employee
from app.models.l5_l6 import CriticalRole
from app.models.talent import SuccessionPlan
from app.services import talent_service


def seed_e(db: Session) -> None:
    if db.query(SuccessionPlan).count() > 0:
        return

    crit = db.execute(select(CriticalRole)).scalars().first()
    if crit:
        talent_service.build_succession_plan(db, actor_user_id=None, job_id=crit.job_id)

    emps = db.execute(select(Employee)).scalars().all()
    if emps:
        talent_service.flag_talent(
            db, actor_user_id=None, employee_id=emps[0].id, talent_segment="HIGH_POTENTIAL",
            potential_rating="HIGH", notes="Strong field-operations track record.")
        kh = talent_service.register_knowledge_holder(
            db, actor_user_id=None, employee_id=emps[0].id,
            knowledge_domain="Offshore startup & well control", criticality="VERY_HIGH",
            retirement_risk=0.7)
        talent_service.create_transfer_plan(
            db, actor_user_id=None, knowledge_holder_id=kh["id"],
            plan_name="Mentor second-line on PSM & startup",
            successor_employee_id=emps[1].id if len(emps) > 1 else None)
    db.flush()
