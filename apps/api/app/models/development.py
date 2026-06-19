"""Development planning (System Analysis §3.12 / Phase P-H).

Promotes training governance to the spec's explicit Learning Need →
Development Plan → Plan Item model, derived from verified gaps. Tenant-scoped.
"""
from datetime import date

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, uuid_pk


class LearningNeed(Base, TimestampMixin):
    __tablename__ = "dev_learning_need"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    gap_id: Mapped[str | None] = mapped_column(ForeignKey("l8_gap.id"), nullable=True)
    employee_id: Mapped[str] = mapped_column(ForeignKey("l2_employee.id"), index=True)
    competency_id: Mapped[str] = mapped_column(ForeignKey("l3_competency.id"))
    # Training | OJT | Coaching | Mentoring | Certification
    need_type: Mapped[str] = mapped_column(String(20), default="Training")
    priority: Mapped[str] = mapped_column(String(20), default="HIGH")
    target_level: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="OPEN")  # OPEN|PLANNED|CLOSED


class DevelopmentPlan(Base, TimestampMixin):
    __tablename__ = "dev_plan"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    entity_type: Mapped[str] = mapped_column(String(20), default="Employee")  # Employee|Group|Department|Family
    entity_id: Mapped[str] = mapped_column(String(36), index=True)
    plan_name: Mapped[str] = mapped_column(String(200))
    plan_period: Mapped[str] = mapped_column(String(40), default="")
    plan_owner: Mapped[str | None] = mapped_column(String(36), nullable=True)
    approval_status: Mapped[str] = mapped_column(String(20), default="DRAFT")  # DRAFT|APPROVED
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class DevelopmentPlanItem(Base, TimestampMixin):
    __tablename__ = "dev_item"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    development_plan_id: Mapped[str] = mapped_column(ForeignKey("dev_plan.id"), index=True)
    learning_need_id: Mapped[str | None] = mapped_column(ForeignKey("dev_learning_need.id"), nullable=True)
    # Training | OJT | Coaching | Assessment | Mentoring
    action_type: Mapped[str] = mapped_column(String(20), default="Training")
    action_description: Mapped[str] = mapped_column(Text, default="")
    target_date: Mapped[date | None] = mapped_column(nullable=True)
    provider_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    completion_status: Mapped[str] = mapped_column(String(20), default="PLANNED")  # PLANNED|IN_PROGRESS|COMPLETE
    post_assessment_required: Mapped[bool] = mapped_column(Boolean, default=True)
