"""Generic workflow engine + permission model (System Analysis §3.14 / Phase P-K).

A reusable multi-step approval workflow (over any entity) and a scoped
permission-role model that complements the per-user RBAC. Tenant-scoped.
"""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, uuid_pk


class WorkflowInstance(Base, TimestampMixin):
    __tablename__ = "wf_instance"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    # CompetencyApproval | BlueprintApproval | QuestionApproval | ResultApproval | SuccessionApproval | …
    workflow_type: Mapped[str] = mapped_column(String(40), index=True)
    entity_type: Mapped[str] = mapped_column(String(40))
    entity_id: Mapped[str] = mapped_column(String(36), index=True)
    current_step: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(20), default="OPEN")  # OPEN|APPROVED|REJECTED
    created_by: Mapped[str | None] = mapped_column(String(36), nullable=True)


class WorkflowStep(Base, TimestampMixin):
    __tablename__ = "wf_step"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    instance_id: Mapped[str] = mapped_column(ForeignKey("wf_instance.id"), index=True)
    step_order: Mapped[int] = mapped_column(Integer, default=1)
    step_name: Mapped[str] = mapped_column(String(120))
    approver_role: Mapped[str] = mapped_column(String(40))
    status: Mapped[str] = mapped_column(String(20), default="PENDING")  # PENDING|APPROVED|REJECTED
    decided_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Approval(Base, TimestampMixin):
    __tablename__ = "wf_approval"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    instance_id: Mapped[str] = mapped_column(ForeignKey("wf_instance.id"), index=True)
    step_id: Mapped[str] = mapped_column(ForeignKey("wf_step.id"))
    approver_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    approval_role: Mapped[str] = mapped_column(String(40), default="")
    decision: Mapped[str] = mapped_column(String(20))  # Approved|Rejected|Returned
    comments: Mapped[str] = mapped_column(Text, default="")


class PermissionRole(Base, TimestampMixin):
    __tablename__ = "sec_permission_role"

    id: Mapped[str] = uuid_pk()
    role_name: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    role_scope: Mapped[str] = mapped_column(String(20), default="Company")  # Enterprise|Company|Department|Self
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class UserPermissionRole(Base, TimestampMixin):
    __tablename__ = "sec_user_permission_role"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    permission_role_id: Mapped[str] = mapped_column(ForeignKey("sec_permission_role.id"))
    company_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    org_unit_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")
