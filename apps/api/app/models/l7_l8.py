"""L7 AI Assessment & Evidence · L8 AI Data Fusion & Gap Analysis."""
from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, uuid_pk

EMBED_DIM = 1536


# ---------------------------------------------------------------- L7
class Question(Base, TimestampMixin):
    """Smart question bank entry."""
    __tablename__ = "l7_question"

    id: Mapped[str] = uuid_pk()
    competency_id: Mapped[str] = mapped_column(ForeignKey("l3_competency.id"))
    kind: Mapped[str] = mapped_column(String(20))      # MCQ | SCENARIO | EVIDENCE
    difficulty: Mapped[int] = mapped_column(Integer, default=3)  # 1–5
    body_en: Mapped[str] = mapped_column(Text)
    body_ar: Mapped[str] = mapped_column(Text)
    options: Mapped[dict] = mapped_column(JSONB, default=dict)
    answer_key: Mapped[dict] = mapped_column(JSONB, default=dict)


class Assessment(Base, TimestampMixin):
    __tablename__ = "l7_assessment"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(ForeignKey("l2_employee.id"))
    competency_id: Mapped[str] = mapped_column(ForeignKey("l3_competency.id"))
    status: Mapped[str] = mapped_column(String(20), default="IN_PROGRESS")
    adaptive_path: Mapped[dict] = mapped_column(JSONB, default=dict)
    assessed_level: Mapped[int] = mapped_column(Integer, default=0)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)


class AssessmentItem(Base):
    __tablename__ = "l7_assessment_item"

    id: Mapped[str] = uuid_pk()
    assessment_id: Mapped[str] = mapped_column(ForeignKey("l7_assessment.id"))
    question_id: Mapped[str] = mapped_column(ForeignKey("l7_question.id"))
    response: Mapped[dict] = mapped_column(JSONB, default=dict)
    correct: Mapped[bool] = mapped_column(Boolean, default=False)
    score: Mapped[float] = mapped_column(Float, default=0.0)


class Evidence(Base, TimestampMixin):
    """Supporting evidence, semantically matchable to requirements via pgvector."""
    __tablename__ = "l7_evidence"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(ForeignKey("l2_employee.id"))
    kind: Mapped[str] = mapped_column(String(40))  # TRAINING_RECORD | CERTIFICATE | PERFORMANCE | MANAGER_INPUT | DOCUMENT
    uri: Mapped[str | None] = mapped_column(String(512), nullable=True)
    text: Mapped[str] = mapped_column(Text, default="")
    embedding: Mapped[list[float] | None] = mapped_column(Vector(EMBED_DIM), nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)


class AuditTrail(Base, TimestampMixin):
    """Per-assessment audit entries (L7)."""
    __tablename__ = "l7_audit_trail"

    id: Mapped[str] = uuid_pk()
    assessment_id: Mapped[str] = mapped_column(ForeignKey("l7_assessment.id"))
    step: Mapped[str] = mapped_column(String(60))
    detail: Mapped[dict] = mapped_column(JSONB, default=dict)


# ---------------------------------------------------------------- L8
class Gap(Base, TimestampMixin):
    __tablename__ = "l8_gap"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    scope: Mapped[str] = mapped_column(String(20))  # INDIVIDUAL | TEAM | DEPARTMENT | COMPANY
    subject_id: Mapped[str] = mapped_column(String(36))
    competency_id: Mapped[str] = mapped_column(ForeignKey("l3_competency.id"))
    current_level: Mapped[int] = mapped_column(Integer, default=0)
    target_level: Mapped[int] = mapped_column(Integer, default=0)
    gap_size: Mapped[int] = mapped_column(Integer, default=0)
    priority: Mapped[str] = mapped_column(String(20), default="MEDIUM")  # MEDIUM|HIGH|VERY_HIGH
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    evidence_id: Mapped[str | None] = mapped_column(String(36), nullable=True)


class GapReport(Base, TimestampMixin):
    """Materialized report payloads for the Outputs Hub (L10)."""
    __tablename__ = "l8_gap_report"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    kind: Mapped[str] = mapped_column(String(40))   # INDIVIDUAL | TEAM | DEPARTMENT_MAP | MATRIX | …
    scope: Mapped[str] = mapped_column(String(20))
    subject_id: Mapped[str] = mapped_column(String(36))
    payload: Mapped[dict] = mapped_column(JSONB, default=dict)


class Recommendation(Base, TimestampMixin):
    __tablename__ = "l8_recommendation"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    gap_id: Mapped[str] = mapped_column(ForeignKey("l8_gap.id"))
    text_en: Mapped[str] = mapped_column(Text)
    text_ar: Mapped[str] = mapped_column(Text)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    # PENDING | REVIEWED | APPROVED | REJECTED
    status: Mapped[str] = mapped_column(String(20), default="PENDING")
