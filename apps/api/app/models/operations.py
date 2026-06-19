"""Operational & asset context (System Analysis §27.3 / Phase P-I).

The operational backbone the spec reserves for asset/operations readiness:
Site → ProcessUnit → Equipment, Procedures, and CriticalTask → TaskRisk, with
critical tasks linked to the competency required to perform them. Tenant-scoped.
"""
from sqlalchemy import Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, uuid_pk


class Site(Base, TimestampMixin):
    __tablename__ = "op_site"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    company_node_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    code: Mapped[str] = mapped_column(String(60), index=True)
    name_en: Mapped[str] = mapped_column(String(200))
    name_ar: Mapped[str] = mapped_column(String(200))
    activity_segment: Mapped[str | None] = mapped_column(String(30), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class ProcessUnit(Base, TimestampMixin):
    __tablename__ = "op_process_unit"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    site_id: Mapped[str] = mapped_column(ForeignKey("op_site.id"), index=True)
    code: Mapped[str] = mapped_column(String(60))
    name_en: Mapped[str] = mapped_column(String(200))
    name_ar: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class Equipment(Base, TimestampMixin):
    __tablename__ = "op_equipment"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    process_unit_id: Mapped[str | None] = mapped_column(ForeignKey("op_process_unit.id"), nullable=True)
    tag: Mapped[str] = mapped_column(String(60), index=True)
    name_en: Mapped[str] = mapped_column(String(200))
    name_ar: Mapped[str] = mapped_column(String(200))
    equipment_type: Mapped[str] = mapped_column(String(60), default="")
    criticality: Mapped[str] = mapped_column(String(20), default="MED")  # MED|HIGH|VERY_HIGH
    risk_level: Mapped[str] = mapped_column(String(20), default="MED")
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class Procedure(Base, TimestampMixin):
    __tablename__ = "op_procedure"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    code: Mapped[str] = mapped_column(String(60), index=True)
    title_en: Mapped[str] = mapped_column(String(200))
    title_ar: Mapped[str] = mapped_column(String(200))
    procedure_type: Mapped[str] = mapped_column(String(30), default="SOP")  # SOP|WorkInstruction|PTW
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class CriticalTask(Base, TimestampMixin):
    __tablename__ = "op_critical_task"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    name_en: Mapped[str] = mapped_column(String(200))
    name_ar: Mapped[str] = mapped_column(String(200))
    equipment_id: Mapped[str | None] = mapped_column(ForeignKey("op_equipment.id"), nullable=True)
    procedure_id: Mapped[str | None] = mapped_column(ForeignKey("op_procedure.id"), nullable=True)
    competency_id: Mapped[str | None] = mapped_column(ForeignKey("l3_competency.id"), nullable=True)
    criticality: Mapped[str] = mapped_column(String(20), default="HIGH")
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class TaskRisk(Base, TimestampMixin):
    __tablename__ = "op_task_risk"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    critical_task_id: Mapped[str] = mapped_column(ForeignKey("op_critical_task.id"), index=True)
    risk_type: Mapped[str] = mapped_column(String(40), default="Safety")  # Safety|Operational|Environmental
    severity: Mapped[float] = mapped_column(Float, default=0.5)     # 0–1
    likelihood: Mapped[float] = mapped_column(Float, default=0.5)   # 0–1
    mitigation: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")
