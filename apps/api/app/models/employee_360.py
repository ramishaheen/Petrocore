"""Employee 360 records (System Analysis §3.4 / Phase P-B).

Qualifications, certifications, and experience — the verifiable backbone of an
employee's readiness, each with a verification status and an evidence link.
Tenant-scoped (employee belongs to a tenant) + RLS in the migration.
"""
from datetime import date

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, uuid_pk


class EmployeeQualification(Base, TimestampMixin):
    __tablename__ = "e360_qualification"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    employee_id: Mapped[str] = mapped_column(ForeignKey("l2_employee.id"), index=True)
    qualification_type: Mapped[str] = mapped_column(String(60))  # Bachelor|Diploma|Master|PhD
    field_of_study: Mapped[str] = mapped_column(String(160), default="")
    institution_name: Mapped[str] = mapped_column(String(200), default="")
    graduation_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    relevance_to_role: Mapped[str] = mapped_column(String(20), default="MED")  # LOW|MED|HIGH
    evidence_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    verification_status: Mapped[str] = mapped_column(String(20), default="UNVERIFIED")
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class EmployeeCertification(Base, TimestampMixin):
    __tablename__ = "e360_certification"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    employee_id: Mapped[str] = mapped_column(ForeignKey("l2_employee.id"), index=True)
    certification_name: Mapped[str] = mapped_column(String(200))
    issuing_body: Mapped[str] = mapped_column(String(200), default="")
    certification_type: Mapped[str] = mapped_column(String(40), default="Technical")
    issue_date: Mapped[date | None] = mapped_column(nullable=True)
    expiry_date: Mapped[date | None] = mapped_column(nullable=True)
    mandatory_for_role: Mapped[bool] = mapped_column(Boolean, default=False)
    evidence_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    verification_status: Mapped[str] = mapped_column(String(20), default="UNVERIFIED")
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class EmployeeExperience(Base, TimestampMixin):
    __tablename__ = "e360_experience"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    employee_id: Mapped[str] = mapped_column(ForeignKey("l2_employee.id"), index=True)
    experience_type: Mapped[str] = mapped_column(String(40), default="Functional")
    organization_name: Mapped[str] = mapped_column(String(200), default="")
    role_title: Mapped[str] = mapped_column(String(160), default="")
    start_date: Mapped[date | None] = mapped_column(nullable=True)
    end_date: Mapped[date | None] = mapped_column(nullable=True)
    years_count: Mapped[float] = mapped_column(default=0.0)
    relevance_to_current_role: Mapped[str] = mapped_column(String(20), default="MED")
    verified_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    evidence_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")
