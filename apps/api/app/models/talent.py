"""Talent, Succession & Knowledge Continuity (System Analysis §16, §27.9 / Phase P-E).

Builds on the readiness engine (P-D) and the versioned role matrix (P-B): talent
segmentation, succession plans that rank candidates for a critical role by
readiness + remaining gaps + time-to-ready, and knowledge-continuity records that
protect against loss of scarce expertise. All tenant-scoped (subtree RLS).
"""
from datetime import date

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, uuid_pk


class TalentProfile(Base, TimestampMixin):
    __tablename__ = "tal_profile"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    employee_id: Mapped[str] = mapped_column(ForeignKey("l2_employee.id"), index=True)
    # HIGH_POTENTIAL | SOLID_PERFORMER | EMERGING | SPECIALIST | AT_RISK
    talent_segment: Mapped[str] = mapped_column(String(30), default="EMERGING")
    potential_rating: Mapped[str] = mapped_column(String(20), default="MED")  # LOW|MED|HIGH
    readiness_status: Mapped[str] = mapped_column(String(30), default="")  # snapshot of latest readiness
    flagged_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    notes: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class SuccessionPlan(Base, TimestampMixin):
    __tablename__ = "tal_succession_plan"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    job_id: Mapped[str] = mapped_column(ForeignKey("l2_job.id"), index=True)
    plan_name: Mapped[str] = mapped_column(String(200))
    bench_strength: Mapped[int] = mapped_column(Integer, default=0)   # candidates ready-ish
    ready_now: Mapped[int] = mapped_column(Integer, default=0)
    candidate_count: Mapped[int] = mapped_column(Integer, default=0)
    # DRAFT | UNDER_REVIEW | APPROVED
    approval_status: Mapped[str] = mapped_column(String(20), default="DRAFT")
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class SuccessorCandidate(Base, TimestampMixin):
    __tablename__ = "tal_successor"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    plan_id: Mapped[str] = mapped_column(ForeignKey("tal_succession_plan.id"), index=True)
    employee_id: Mapped[str] = mapped_column(ForeignKey("l2_employee.id"))
    readiness_index: Mapped[float] = mapped_column(Float, default=0.0)
    readiness_status: Mapped[str] = mapped_column(String(30), default="")
    remaining_gaps: Mapped[int] = mapped_column(Integer, default=0)
    time_to_ready_months: Mapped[int] = mapped_column(Integer, default=0)
    rank: Mapped[int] = mapped_column(Integer, default=0)
    # PENDING | APPROVED | REJECTED
    recommendation_status: Mapped[str] = mapped_column(String(20), default="PENDING")
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class KnowledgeHolder(Base, TimestampMixin):
    __tablename__ = "tal_knowledge_holder"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    employee_id: Mapped[str] = mapped_column(ForeignKey("l2_employee.id"), index=True)
    knowledge_domain: Mapped[str] = mapped_column(String(160))
    criticality: Mapped[str] = mapped_column(String(20), default="HIGH")  # MED|HIGH|VERY_HIGH
    retirement_risk: Mapped[float] = mapped_column(Float, default=0.0)  # 0–1
    transfer_status: Mapped[str] = mapped_column(String(20), default="OPEN")  # OPEN|IN_PROGRESS|COMPLETE
    notes: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class KnowledgeTransferPlan(Base, TimestampMixin):
    __tablename__ = "tal_kt_plan"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    knowledge_holder_id: Mapped[str] = mapped_column(ForeignKey("tal_knowledge_holder.id"), index=True)
    successor_employee_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    plan_name: Mapped[str] = mapped_column(String(200))
    mentoring_flag: Mapped[bool] = mapped_column(Boolean, default=True)
    target_date: Mapped[date | None] = mapped_column(nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="PLANNED")  # PLANNED|ACTIVE|COMPLETE
