"""Seed Phase P-J data: a corporate objective with a KPI, two aligned
competencies, and a computed strategic readiness gap (idempotent)."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.l1_l2 import Employee
from app.models.l3_l4 import Competency
from app.models.strategy import StrategicObjective
from app.services import strategy_service as svc


def seed_j(db: Session) -> None:
    if db.query(StrategicObjective).count() > 0:
        return
    emp = db.execute(select(Employee)).scalars().first()
    tenant = emp.tenant_id if emp else "*"
    comps = {c.code: c for c in db.execute(select(Competency)).scalars().all()}

    obj = svc.create_objective(
        db, actor_user_id=None, tenant_id=tenant, level="CORPORATE",
        title_en="Workforce Readiness 2030", title_ar="جاهزية القوى العاملة 2030", period="2026-2030")
    svc.add_kpi(db, tenant_id=tenant, objective_id=obj.id, code="WRI",
                name_en="Workforce Readiness Index", name_ar="مؤشر جاهزية القوى العاملة",
                target_value=85.0, current_value=73.0, unit="%")
    for code, lvl in [("HSE-PSM", 5), ("TECH-WELL", 4)]:
        if code in comps:
            svc.align_competency(db, tenant_id=tenant, objective_id=obj.id,
                                 competency_id=comps[code].id, required_level=lvl, weight=2.0 if code.startswith("HSE") else 1.0)
    svc.compute_readiness_gap(db, actor_user_id=None, objective_id=obj.id)
    db.flush()
