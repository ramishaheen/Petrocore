"""Seed Phase P-D data: computed multi-factor ReadinessScores from whatever
evidence-backed results already exist (employee scores + a department rollup).

Idempotent and strictly additive — it derives readiness from existing data and
never fabricates competency results (so it can't perturb other flows/tests).
Seeded employees that haven't been assessed yet read as "Evidence insufficient",
which is the faithful state until an assessment is recorded.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.l1_l2 import Employee
from app.models.readiness import ReadinessScore
from app.services import readiness_service


def seed_d(db: Session) -> None:
    if db.query(ReadinessScore).count() > 0:
        return

    emps = db.execute(select(Employee)).scalars().all()
    section_ids: set[str] = set()
    for emp in emps:
        readiness_service.compute_for_employee(db, actor_user_id=None, employee_id=emp.id)
        if emp.section_id:
            section_ids.add(emp.section_id)

    # Department/section rollups so aggregate readiness isn't empty in the demo.
    for sid in section_ids:
        readiness_service.compute_for_node(db, actor_user_id=None, node_id=sid, entity_type="DEPARTMENT")
    db.flush()
