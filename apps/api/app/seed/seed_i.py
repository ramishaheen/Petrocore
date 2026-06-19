"""Seed Phase P-I data: a site → process unit → equipment, a procedure, and a
critical task (linked to a competency) with a risk (idempotent)."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.l1_l2 import Employee
from app.models.l3_l4 import Competency
from app.models.operations import Site
from app.services import operations_service as svc


def seed_i(db: Session) -> None:
    if db.query(Site).count() > 0:
        return
    emp = db.execute(select(Employee)).scalars().first()
    tenant = emp.tenant_id if emp else "*"
    comps = {c.code: c for c in db.execute(select(Competency)).scalars().all()}

    site = svc.create_site(db, tenant_id=tenant, code="SARIR", name_en="Sarir Field",
                           name_ar="حقل السرير", activity_segment="PRODUCTION")
    unit = svc.create_process_unit(db, tenant_id=tenant, site_id=site.id, code="GAS-1",
                                   name_en="Gas Processing Unit 1", name_ar="وحدة معالجة الغاز 1")
    eq = svc.create_equipment(db, actor_user_id=None, tenant_id=tenant, tag="K-101",
                              name_en="Gas Compression Train A", name_ar="قطار ضغط الغاز أ",
                              equipment_type="ROTATING", criticality="VERY_HIGH", risk_level="HIGH",
                              process_unit_id=unit.id)
    proc = svc.create_procedure(db, tenant_id=tenant, code="SOP-PSM-01",
                                title_en="Compressor Startup SOP", title_ar="إجراء بدء تشغيل الضاغط",
                                procedure_type="SOP")
    task = svc.create_critical_task(
        db, actor_user_id=None, tenant_id=tenant, name_en="Safe compressor startup",
        name_ar="بدء تشغيل الضاغط بأمان",
        competency_id=comps["HSE-PSM"].id if "HSE-PSM" in comps else None,
        equipment_id=eq.id, procedure_id=proc.id, criticality="VERY_HIGH")
    svc.add_task_risk(db, tenant_id=tenant, critical_task_id=task.id, risk_type="Safety",
                      severity=0.9, likelihood=0.4, mitigation="PTW + gas test + competency verification.")
    db.flush()
