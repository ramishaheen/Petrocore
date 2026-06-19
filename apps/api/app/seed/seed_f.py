"""Seed Phase P-F data: knowledge-graph entity links + integration connectors
(idempotent, additive). EntityLinks use the generic P-A seam so the graph has
real, label-resolvable relationships to traverse."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.core_ext import EntityLink
from app.models.integration import IntegrationConnector, IntegrationSyncLog
from app.models.l1_l2 import Employee, Job, StrategicElement
from app.models.l3_l4 import Competency, CompetencyRequirement
from app.models.l5_l6 import Asset

CONNECTORS = [
    ("HR-CORE", "Core HR System", "نظام الموارد البشرية", "HR", "INBOUND", "SCHEDULED", "ACTIVE"),
    ("LMS", "Learning Management System", "نظام إدارة التعلم", "LMS", "BIDIRECTIONAL", "SCHEDULED", "CONFIGURED"),
    ("ERP-FIN", "ERP / Finance", "تخطيط الموارد / المالية", "ERP", "INBOUND", "SCHEDULED", "PLANNED"),
    ("CMMS", "Maintenance (CMMS)", "إدارة الصيانة", "CMMS", "INBOUND", "SCHEDULED", "PLANNED"),
    ("HSE", "HSE System", "نظام السلامة", "HSE", "INBOUND", "SCHEDULED", "CONFIGURED"),
    ("DMS", "Document Management", "إدارة الوثائق", "DMS", "INBOUND", "MANUAL", "PLANNED"),
    ("IAM", "Identity Management", "إدارة الهوية", "IAM", "INBOUND", "REALTIME", "ACTIVE"),
    ("BI", "BI / Data Warehouse", "ذكاء الأعمال", "BI", "OUTBOUND", "SCHEDULED", "ACTIVE"),
]


def _link(db: Session, st: str, sid: str, tt: str, tid: str, ltype: str, weight: float = 1.0) -> None:
    db.add(EntityLink(
        tenant_id="*", source_entity_type=st, source_entity_id=sid,
        target_entity_type=tt, target_entity_id=tid, link_type=ltype, relationship_weight=weight))


def seed_f(db: Session) -> None:
    if db.query(IntegrationConnector).count() > 0:
        return

    for code, en, ar, stype, direction, mode, st in CONNECTORS:
        db.add(IntegrationConnector(
            code=code, name_en=en, name_ar=ar, system_type=stype,
            direction=direction, sync_mode=mode, status=st))
    db.add(IntegrationSyncLog(
        connector_code="HR-CORE", direction="INBOUND", entity_type="Employee",
        records_in=3, records_ok=3, records_failed=0, status="SUCCESS",
        message="Initial employee load."))

    comps = {c.code: c for c in db.execute(select(Competency)).scalars().all()}
    emps = db.execute(select(Employee)).scalars().all()
    job = db.execute(select(Job)).scalars().first()
    strat = db.execute(select(StrategicElement)).scalars().first()
    asset = db.execute(select(Asset)).scalars().first()
    if not asset and emps:
        asset = Asset(tenant_id=emps[0].tenant_id, name_en="Gas Compression Train A",
                      name_ar="قطار ضغط الغاز أ", asset_type="ROTATING_EQUIPMENT",
                      activity_segment="PRODUCTION")
        db.add(asset)
        db.flush()

    # Role → required competencies (label-resolvable Role↔Competency edges).
    if job:
        reqs = db.execute(
            select(CompetencyRequirement).where(CompetencyRequirement.job_id == job.id)
        ).scalars().all()
        for r in reqs:
            _link(db, "Role", job.id, "Competency", r.competency_id, "Required",
                  weight=r.risk_weight or 1.0)
    # Employee → competency evidence, and employee → a project.
    if emps:
        if "HSE-PSM" in comps:
            _link(db, "Employee", emps[0].id, "Competency", comps["HSE-PSM"].id, "EvidenceFor")
        _link(db, "Employee", emps[0].id, "Project", "prj-offshore-startup", "Supports", 0.8)
    # Competency → asset, strategy → competency.
    if asset and "HSE-PSM" in comps:
        _link(db, "Competency", comps["HSE-PSM"].id, "Asset", asset.id, "Required")
    if strat and "LEAD-DEC" in comps:
        _link(db, "Strategy", strat.id, "Competency", comps["LEAD-DEC"].id, "Impacts")
    db.flush()
