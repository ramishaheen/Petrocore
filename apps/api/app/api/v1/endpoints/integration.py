"""Integration APIs (§12 Scalable & Integrable) — bulk import/export for HR/ERP.

Import is restricted to data-stewardship roles and every batch is audit-logged.
Exports are RLS-scoped to the caller's tenant subtree.
"""
import csv
import io

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_db_for, require_roles
from app.core.rbac import Role
from app.core.security import encrypt_pii
from app.models.l1_l2 import Employee, Job
from app.models.l3_l4 import Competency
from app.models.l5_l6 import Profile
from app.schemas import (
    CompetencyImport, EmployeeImport, ImportResult, JobImport,
)
from app.services.engines.governance import append_audit

router = APIRouter(prefix="/integration", tags=["Integration · Import / Export"])

_steward = require_roles(Role.PLATFORM_ADMIN, Role.HR_VALIDATOR, Role.CONSULTANT, Role.COMPANY_ADMIN)


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
    user: CurrentUser = Depends(_steward),
    db: Session = Depends(get_db_for),
) -> ImportResult:
    """Upsert jobs by code within the caller's tenant."""
    tenant = user.tenant_id or "*"
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
    user: CurrentUser = Depends(_steward),
    db: Session = Depends(get_db_for),
) -> ImportResult:
    """Upsert employees by employee_no; auto-create a draft 360° profile (PII encrypted)."""
    tenant = user.tenant_id or "*"
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
