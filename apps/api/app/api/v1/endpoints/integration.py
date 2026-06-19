"""Integration APIs (§12 Scalable & Integrable) — bulk import/export for HR/ERP.

Import is restricted to data-stewardship roles and every batch is audit-logged.
Exports are RLS-scoped to the caller's tenant subtree.
"""
import csv
import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_db_for, require_roles
from app.core.rbac import Role
from app.core.security import encrypt_pii
from app.models.integration import IntegrationConnector, IntegrationSyncLog
from app.models.l1_l2 import Employee, Job, OrgNode
from app.models.l3_l4 import Competency
from app.models.l5_l6 import Profile
from app.schemas import (
    CompetencyImport, EmployeeImport, ImportResult, JobImport,
)
from app.services.engines.governance import append_audit

router = APIRouter(prefix="/integration", tags=["Integration · Import / Export"])

_steward = require_roles(Role.PLATFORM_ADMIN, Role.HR_VALIDATOR, Role.CONSULTANT, Role.COMPANY_ADMIN)


def _resolve_import_tenant(db: Session, user: CurrentUser, tenant_id: str | None) -> str:
    """Resolve a CONCRETE target tenant for tenant-scoped imports.

    Tenant-bound stewards import into their own tenant. Global users (tenant '*',
    e.g. PLATFORM_ADMIN) must pass an explicit ``tenant_id`` — otherwise rows would
    be written as global ('*') and leak into every tenant's lists/exports.
    """
    if user.tenant_id and user.tenant_id != "*":
        return user.tenant_id
    if not tenant_id or tenant_id == "*":
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "global users must specify ?tenant_id=<org_node_id> for tenant-scoped imports",
        )
    if not db.get(OrgNode, tenant_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "tenant_id is not a known org node")
    return tenant_id


@router.post("/import/competencies", response_model=ImportResult)
def import_competencies(
    rows: list[CompetencyImport],
    user: CurrentUser = Depends(_steward),
    db: Session = Depends(get_db_for),
) -> ImportResult:
    """Upsert competencies by code (idempotent)."""
    created = updated = 0
    for r in rows:
        existing = db.execute(
            select(Competency).where(Competency.code == r.code)
        ).scalar_one_or_none()
        if existing:
            existing.name_en, existing.name_ar, existing.family = r.name_en, r.name_ar, r.family
            updated += 1
        else:
            db.add(Competency(code=r.code, name_en=r.name_en, name_ar=r.name_ar, family=r.family,
                              description_en=r.description_en, description_ar=r.description_ar))
            created += 1
    append_audit(db, actor_user_id=user.id, action="IMPORT_COMPETENCIES",
                 entity="l3_competency", entity_id="batch",
                 after={"created": created, "updated": updated})
    db.commit()
    return ImportResult(created=created, updated=updated, total=len(rows))


@router.post("/import/jobs", response_model=ImportResult)
def import_jobs(
    rows: list[JobImport],
    tenant_id: str | None = None,
    user: CurrentUser = Depends(_steward),
    db: Session = Depends(get_db_for),
) -> ImportResult:
    """Upsert jobs by code within a concrete target tenant."""
    tenant = _resolve_import_tenant(db, user, tenant_id)
    created = updated = 0
    for r in rows:
        existing = db.execute(
            select(Job).where(Job.code == r.code, Job.tenant_id == tenant)
        ).scalar_one_or_none()
        if existing:
            existing.title_en, existing.title_ar = r.title_en, r.title_ar
            existing.job_family, existing.admin_level = r.job_family, r.admin_level
            existing.activity_segment = r.activity_segment
            updated += 1
        else:
            db.add(Job(tenant_id=tenant, code=r.code, title_en=r.title_en, title_ar=r.title_ar,
                       job_family=r.job_family, admin_level=r.admin_level,
                       activity_segment=r.activity_segment))
            created += 1
    append_audit(db, actor_user_id=user.id, action="IMPORT_JOBS",
                 entity="l2_job", entity_id="batch", after={"created": created, "updated": updated})
    db.commit()
    return ImportResult(created=created, updated=updated, total=len(rows))


@router.post("/import/employees", response_model=ImportResult)
def import_employees(
    rows: list[EmployeeImport],
    tenant_id: str | None = None,
    user: CurrentUser = Depends(_steward),
    db: Session = Depends(get_db_for),
) -> ImportResult:
    """Upsert employees by employee_no into a concrete tenant; auto-create a draft
    360° profile (PII encrypted)."""
    tenant = _resolve_import_tenant(db, user, tenant_id)
    created = updated = 0
    for r in rows:
        existing = db.execute(
            select(Employee).where(Employee.employee_no == r.employee_no, Employee.tenant_id == tenant)
        ).scalar_one_or_none()
        if existing:
            existing.full_name_en, existing.full_name_ar = r.full_name_en, r.full_name_ar
            existing.years_experience = r.years_experience
            if r.email is not None:
                existing.email_enc = encrypt_pii(r.email)
            updated += 1
        else:
            emp = Employee(
                tenant_id=tenant, employee_no=r.employee_no, full_name_en=r.full_name_en,
                full_name_ar=r.full_name_ar, years_experience=r.years_experience,
                email_enc=encrypt_pii(r.email), national_id_enc=encrypt_pii(r.national_id),
            )
            db.add(emp)
            db.flush()
            db.add(Profile(tenant_id=tenant, employee_id=emp.id, readiness_index=0.0, status="DRAFT"))
            created += 1
    append_audit(db, actor_user_id=user.id, action="IMPORT_EMPLOYEES",
                 entity="l2_employee", entity_id="batch", after={"created": created, "updated": updated})
    db.commit()
    return ImportResult(created=created, updated=updated, total=len(rows))


# ---------------------------------------------------------------- connector registry (P-F)
@router.get("/connectors")
def list_connectors(db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(select(IntegrationConnector).order_by(IntegrationConnector.system_type)).scalars().all()
    return [
        {"id": c.id, "code": c.code, "name_en": c.name_en, "name_ar": c.name_ar,
         "system_type": c.system_type, "direction": c.direction, "status": c.status,
         "sync_mode": c.sync_mode, "last_sync_at": c.last_sync_at.isoformat() if c.last_sync_at else None}
        for c in rows
    ]


class ConnectorIn(BaseModel):
    code: str
    name_en: str
    name_ar: str
    system_type: str
    direction: str = "INBOUND"
    sync_mode: str = "MANUAL"
    status: str = "PLANNED"


@router.post("/connectors")
def register_connector(
    body: ConnectorIn, user: CurrentUser = Depends(_steward), db: Session = Depends(get_db_for),
) -> dict:
    """Register or update an external-system connector (idempotent by code)."""
    c = db.execute(select(IntegrationConnector).where(IntegrationConnector.code == body.code)).scalar_one_or_none()
    if c:
        c.name_en, c.name_ar, c.system_type = body.name_en, body.name_ar, body.system_type
        c.direction, c.sync_mode, c.status = body.direction, body.sync_mode, body.status
    else:
        c = IntegrationConnector(
            code=body.code, name_en=body.name_en, name_ar=body.name_ar, system_type=body.system_type,
            direction=body.direction, sync_mode=body.sync_mode, status=body.status)
        db.add(c)
    db.flush()
    append_audit(db, actor_user_id=user.id, action="REGISTER_CONNECTOR",
                 entity="intg_connector", entity_id=c.id, after={"code": c.code, "type": c.system_type})
    db.commit()
    return {"id": c.id, "code": c.code, "status": c.status}


@router.get("/sync-logs")
def sync_logs(db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(select(IntegrationSyncLog).order_by(IntegrationSyncLog.created_at.desc())).scalars().all()
    return [
        {"id": s.id, "connector_code": s.connector_code, "direction": s.direction,
         "entity_type": s.entity_type, "records_in": s.records_in, "records_ok": s.records_ok,
         "records_failed": s.records_failed, "status": s.status, "message": s.message,
         "at": s.created_at.isoformat() if s.created_at else None}
        for s in rows
    ]


@router.post("/connectors/{code}/sync")
def run_sync(
    code: str, user: CurrentUser = Depends(_steward), db: Session = Depends(get_db_for),
) -> dict:
    """Record a (stub) sync run against a connector and stamp last_sync_at."""
    c = db.execute(select(IntegrationConnector).where(IntegrationConnector.code == code)).scalar_one_or_none()
    if not c:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "connector not found")
    log = IntegrationSyncLog(
        connector_code=code, direction=c.direction, entity_type="Employee",
        records_in=0, records_ok=0, records_failed=0, status="SUCCESS",
        message="Manual sync acknowledged (no external endpoint configured).")
    db.add(log)
    c.last_sync_at = datetime.now(timezone.utc)
    db.flush()
    append_audit(db, actor_user_id=user.id, action="RUN_SYNC",
                 entity="intg_sync_log", entity_id=log.id, after={"connector": code})
    db.commit()
    return {"id": log.id, "connector_code": code, "status": log.status}


@router.get("/export/employees")
def export_employees(db: Session = Depends(get_db_for)) -> list[dict]:
    """Export employees visible to the caller (RLS-scoped). PII is not exported."""
    return [
        {"employee_no": e.employee_no, "full_name_en": e.full_name_en,
         "full_name_ar": e.full_name_ar, "years_experience": e.years_experience}
        for e in db.execute(select(Employee)).scalars().all()
    ]


@router.get("/export/readiness.csv")
def export_readiness_csv(db: Session = Depends(get_db_for)) -> StreamingResponse:
    """Export the readiness register as CSV (RLS-scoped)."""
    emp = {e.id: e for e in db.execute(select(Employee)).scalars().all()}
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["employee_no", "name_en", "name_ar", "readiness_index", "profile_status"])
    for p in db.execute(select(Profile)).scalars().all():
        e = emp.get(p.employee_id)
        writer.writerow([
            e.employee_no if e else "", e.full_name_en if e else "",
            e.full_name_ar if e else "", p.readiness_index, p.status,
        ])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]), media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=readiness.csv"},
    )
