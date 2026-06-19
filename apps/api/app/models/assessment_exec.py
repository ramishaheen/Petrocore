"""Full assessment-execution split + question bank/tags + evidence review
(System Analysis §3.7, §3.8, §3.9, §3.10 / Phase P-G).

Promotes the collapsed assessment model to the spec's campaign → participant →
attempt → response → result split, adds a tagged question bank, and an evidence
review record. Additive and tenant-scoped (subtree RLS).
"""
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, uuid_pk


class QuestionBank(Base, TimestampMixin):
    __tablename__ = "qb_bank"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    code: Mapped[str] = mapped_column(String(60), index=True)
    name_en: Mapped[str] = mapped_column(String(200))
    name_ar: Mapped[str] = mapped_column(String(200))
    family_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class QuestionTag(Base, TimestampMixin):
    __tablename__ = "qb_tag"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    question_id: Mapped[str] = mapped_column(ForeignKey("l7_question.id"), index=True)
    # Family | RoleLevel | Role | Competency | Risk | Evidence
    tag_type: Mapped[str] = mapped_column(String(40))
    tag_value: Mapped[str] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class AssessmentCampaign(Base, TimestampMixin):
    """Spec 'Assessment': a campaign targeting an entity, built from a blueprint."""
    __tablename__ = "ax_assessment"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    blueprint_id: Mapped[str | None] = mapped_column(ForeignKey("ab_blueprint.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(200))
    target_entity_type: Mapped[str] = mapped_column(String(20), default="Employee")  # Employee|Group|Department|Family|Level
    target_entity_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    assessment_period: Mapped[str] = mapped_column(String(40), default="")
    status: Mapped[str] = mapped_column(String(20), default="DRAFT")  # DRAFT|PUBLISHED|ACTIVE|CLOSED
    created_by: Mapped[str | None] = mapped_column(String(36), nullable=True)


class AssessmentParticipant(Base, TimestampMixin):
    __tablename__ = "ax_participant"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    assessment_id: Mapped[str] = mapped_column(ForeignKey("ax_assessment.id"), index=True)
    employee_id: Mapped[str] = mapped_column(ForeignKey("l2_employee.id"))
    role_id: Mapped[str | None] = mapped_column(ForeignKey("l2_job.id"), nullable=True)
    manager_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="INVITED")  # INVITED|STARTED|SUBMITTED|REVIEWED


class AssessmentAttempt(Base, TimestampMixin):
    __tablename__ = "ax_attempt"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    assessment_id: Mapped[str] = mapped_column(ForeignKey("ax_assessment.id"), index=True)
    participant_id: Mapped[str] = mapped_column(ForeignKey("ax_participant.id"), index=True)
    start_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    attempt_status: Mapped[str] = mapped_column(String(20), default="STARTED")  # STARTED|SUBMITTED|REVIEWED|CANCELLED
    total_score: Mapped[float] = mapped_column(Float, default=0.0)
    system_confidence_score: Mapped[float] = mapped_column(Float, default=0.0)


class AssessmentResponse(Base, TimestampMixin):
    __tablename__ = "ax_response"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    attempt_id: Mapped[str] = mapped_column(ForeignKey("ax_attempt.id"), index=True)
    question_id: Mapped[str] = mapped_column(ForeignKey("l7_question.id"))
    response_text: Mapped[str] = mapped_column(Text, default="")
    selected_option: Mapped[int | None] = mapped_column(Integer, nullable=True)
    attachment_evidence_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    auto_score: Mapped[float] = mapped_column(Float, default=0.0)
    manual_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    final_score: Mapped[float] = mapped_column(Float, default=0.0)
    reviewer_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    comments: Mapped[str] = mapped_column(Text, default="")


class AssessmentResultRow(Base, TimestampMixin):
    """Per-competency result for an attempt (spec AssessmentResult)."""
    __tablename__ = "ax_result"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    attempt_id: Mapped[str] = mapped_column(ForeignKey("ax_attempt.id"), index=True)
    employee_id: Mapped[str] = mapped_column(ForeignKey("l2_employee.id"))
    competency_id: Mapped[str] = mapped_column(ForeignKey("l3_competency.id"))
    required_proficiency_level_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    actual_level: Mapped[int] = mapped_column(Integer, default=0)
    required_level: Mapped[int] = mapped_column(Integer, default=0)
    score_percentage: Mapped[float] = mapped_column(Float, default=0.0)
    evidence_confidence_score: Mapped[float] = mapped_column(Float, default=0.0)
    result_status: Mapped[str] = mapped_column(String(20), default="DRAFT")  # DRAFT|REVIEWED|APPROVED


class EvidenceReview(Base, TimestampMixin):
    __tablename__ = "ev_review"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    evidence_id: Mapped[str] = mapped_column(ForeignKey("l7_evidence.id"), index=True)
    reviewer_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    review_decision: Mapped[str] = mapped_column(String(20))  # Accepted|Rejected|NeedsClarification
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)
    comments: Mapped[str] = mapped_column(Text, default="")
