"""Workforce groups & talent pools (System Analysis §3.13, §16 / Phase P-M).

Arbitrary groupings of employees (for group assessment/readiness) and curated
talent pools (HiPo / successor / critical). Tenant-scoped.
"""
from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, uuid_pk


class WorkforceGroup(Base, TimestampMixin):
    __tablename__ = "grp_group"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    name_en: Mapped[str] = mapped_column(String(200))
    name_ar: Mapped[str] = mapped_column(String(200))
    # Department | Family | Level | Role | Project | Custom
    group_type: Mapped[str] = mapped_column(String(20), default="Custom")
    company_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class WorkforceGroupMember(Base, TimestampMixin):
    __tablename__ = "grp_member"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    group_id: Mapped[str] = mapped_column(ForeignKey("grp_group.id"), index=True)
    employee_id: Mapped[str] = mapped_column(ForeignKey("l2_employee.id"))
    membership_reason: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class TalentPool(Base, TimestampMixin):
    __tablename__ = "tal_pool"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    name_en: Mapped[str] = mapped_column(String(200))
    name_ar: Mapped[str] = mapped_column(String(200))
    pool_type: Mapped[str] = mapped_column(String(20), default="HiPo")  # HiPo|Successor|Critical|Custom
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class TalentPoolMember(Base, TimestampMixin):
    __tablename__ = "tal_pool_member"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    pool_id: Mapped[str] = mapped_column(ForeignKey("tal_pool.id"), index=True)
    employee_id: Mapped[str] = mapped_column(ForeignKey("l2_employee.id"))
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")
