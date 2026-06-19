"""L9 Training & Development Governance · cross-cutting governance & audit."""
from sqlalchemy import BigInteger, Float, ForeignKey, Identity, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, uuid_pk


# ---------------------------------------------------------------- L9
class TrainingNeed(Base, TimestampMixin):
    """Derived from a verified gap (never from a generic course title)."""
    __tablename__ = "l9_training_need"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    gap_id: Mapped[str] = mapped_column(ForeignKey("l8_gap.id"))
    competency_id: Mapped[str] = mapped_column(ForeignKey("l3_competency.id"))
    target_level: Mapped[int] = mapped_column(Integer)
    priority: Mapped[str] = mapped_column(String(20), default="HIGH")


class Program(Base, TimestampMixin):
    __tablename__ = "l9_program"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    title_en: Mapped[str] = mapped_column(String(255))
    title_ar: Mapped[str] = mapped_column(String(255))
    # BLENDED | ILT | DIGITAL | SELF_PACED
    method: Mapped[str] = mapped_column(String(20), default="BLENDED")
    provider: Mapped[str] = mapped_column(String(120), default="")
    target_group: Mapped[str] = mapped_column(String(120), default="")
    impact_kpi: Mapped[str] = mapped_column(String(120), default="")


class Nomination(Base, TimestampMixin):
    __tablename__ = "l9_nomination"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(ForeignKey("l2_employee.id"))
    program_id: Mapped[str] = mapped_column(ForeignKey("l9_program.id"))
    gap_id: Mapped[str | None] = mapped_column(ForeignKey("l8_gap.id"), nullable=True)
    # BEFORE | DURING | AFTER  (training governance lifecycle stage)
    stage: Mapped[str] = mapped_column(String(10), default="BEFORE")
    status: Mapped[str] = mapped_column(String(20), default="NOMINATED")


class TrainingImpact(Base, TimestampMixin):
    """After-training impact; writes back to L5 readiness index."""
    __tablename__ = "l9_impact"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    nomination_id: Mapped[str] = mapped_column(ForeignKey("l9_nomination.id"))
    pre_level: Mapped[int] = mapped_column(Integer, default=0)
    post_level: Mapped[int] = mapped_column(Integer, default=0)
    gap_closure_pct: Mapped[float] = mapped_column(Float, default=0.0)
    performance_link: Mapped[str] = mapped_column(Text, default="")


# ---------------------------------------------------------------- Governance (cross-cutting)
class GovDecision(Base, TimestampMixin):
    """Mandatory gate: no AI recommendation enters a decision without review + approval."""
    __tablename__ = "gov_decision"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    kind: Mapped[str] = mapped_column(String(40))       # COMPETENCY_RESULT | RECOMMENDATION | …
    subject_ref: Mapped[str] = mapped_column(String(80))
    ai_recommendation: Mapped[str] = mapped_column(Text, default="")
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    reviewer_user_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    # PENDING_REVIEW | APPROVED | REJECTED
    governance_status: Mapped[str] = mapped_column(String(20), default="PENDING_REVIEW")


class AuditLog(Base, TimestampMixin):
    """Immutable, tamper-evident hash chain of every consequential write."""
    __tablename__ = "audit_log"

    id: Mapped[str] = uuid_pk()
    # Monotonic insertion order — the hash chain is verified in `seq` order, which
    # stays well-defined even when many entries share a transaction `created_at`.
    seq: Mapped[int] = mapped_column(BigInteger, Identity(), index=True)
    actor_user_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    action: Mapped[str] = mapped_column(String(60))
    entity: Mapped[str] = mapped_column(String(60))
    entity_id: Mapped[str] = mapped_column(String(36))
    before: Mapped[dict] = mapped_column(JSONB, default=dict)
    after: Mapped[dict] = mapped_column(JSONB, default=dict)
    prev_hash: Mapped[str] = mapped_column(String(64), default="")
    hash: Mapped[str] = mapped_column(String(64), default="")
