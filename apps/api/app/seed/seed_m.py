"""Seed Phase P-M data: a workforce group with members and a HiPo talent pool
(idempotent)."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.groups import WorkforceGroup
from app.models.l1_l2 import Employee
from app.services import groups_service as svc


def seed_m(db: Session) -> None:
    if db.query(WorkforceGroup).count() > 0:
        return
    emps = db.execute(select(Employee)).scalars().all()
    if not emps:
        return
    tenant = emps[0].tenant_id

    g = svc.create_group(db, actor_user_id=None, tenant_id=tenant, name_en="Operations Section A Team",
                         name_ar="فريق قسم العمليات أ", group_type="Department")
    for e in emps[:3]:
        svc.add_member(db, group_id=g.id, employee_id=e.id, membership_reason="Section roster")

    pool = svc.create_pool(db, actor_user_id=None, tenant_id=tenant, name_en="High-Potential Pool",
                           name_ar="مجموعة الإمكانات العالية", pool_type="HiPo")
    for e in emps[:2]:
        svc.add_pool_member(db, pool_id=pool.id, employee_id=e.id)
    db.flush()
