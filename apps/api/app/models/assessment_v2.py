"""Governed Assessment Blueprint engine + AI question review (System Analysis §2.6, §2.7, §9, §10 / Phase P-C).

A blueprint is the *approved template* that makes assessment non-random: it
pins the competencies, required levels, weights, question counts, evidence and
rules. AI questions are generated FROM a blueprint, then pass a human review
workflow before entering the live question bank.
"""
from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, uuid_pk


class ScoringRubric(Base, TimestampMixin):
    __tablename__ = "ab_scoring_rubric"

    id: Mapped[str] = uuid_pk()
    code: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(160))
    model: Mapped[str] = mapped_column(String(40), default="weighted")  # weighted | rubric | pass_fail
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class AssessmentBlueprint(Base, TimestampMixin):
    __tablename__ = "ab_blueprint"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    code: Mapped[str] = mapped_column(String(60))
    name: Mapped[str] = mapped_column(String(200))
    job_id: Mapped[str | None] = mapped_column(ForeignKey("l2_job.id"), nullable=True)
    family_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    role_level_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    # Baseline | Promotion | Succession | TrainingNeed | Certification
    assessment_purpose: Mapped[str] = mapped_column(String(30), default="Baseline")
    scoring_rubric_id: Mapped[str | None] = mapped_column(ForeignKey("ab_scoring_rubric.id"), nullable=True)
    passing_threshold: Mapped[float] = mapped_column(Float, default=0.6)
    readiness_threshold: Mapped[float] = mapped_column(Float, default=0.75)
    # DRAFT | UNDER_REVIEW | APPROVED | PUBLISHED | ARCHIVED
    approval_status: Mapped[str] = mapped_column(String(20), default="DRAFT")
    version: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class AssessmentBlueprintCompetency(Base, TimestampMixin):
    __tablename__ = "ab_blueprint_competency"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    blueprint_id: Mapped[str] = mapped_column(ForeignKey("ab_blueprint.id"), index=True)
    competency_id: Mapped[str] = mapped_column(ForeignKey("l3_competency.id"))
    required_proficiency_level_id: Mapped[str | None] = mapped_column(
        ForeignKey("cd_proficiency_level.id"), nullable=True
    )
    weight: Mapped[float] = mapped_column(Float, default=1.0)
    question_count: Mapped[int] = mapped_column(Integer, default=3)
    evidence_required_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class AssessmentBlueprintRule(Base, TimestampMixin):
    __tablename__ = "ab_blueprint_rule"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    blueprint_id: Mapped[str] = mapped_column(ForeignKey("ab_blueprint.id"), index=True)
    rule_type: Mapped[str] = mapped_column(String(40))  # TimeLimit|Randomization|EvidenceRequired|ReviewerRequired
    rule_value: Mapped[str] = mapped_column(String(120), default="")
    applies_to_competency_id: Mapped[str | None] = mapped_column(ForeignKey("l3_competency.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class AIQuestionGenerationRequest(Base, TimestampMixin):
    __tablename__ = "qg_request"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    blueprint_id: Mapped[str | None] = mapped_column(ForeignKey("ab_blueprint.id"), nullable=True)
    requested_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    generation_purpose: Mapped[str] = mapped_column(String(20), default="Question")  # Question|Scenario|Case|Interview
    input_context: Mapped[dict] = mapped_column(JSONB, default=dict)
    status: Mapped[str] = mapped_column(String(20), default="COMPLETED")


class AIGeneratedQuestion(Base, TimestampMixin):
    __tablename__ = "qg_question"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    request_id: Mapped[str] = mapped_column(ForeignKey("qg_request.id"), index=True)
    competency_id: Mapped[str] = mapped_column(ForeignKey("l3_competency.id"))
    proficiency_level_id: Mapped[str | None] = mapped_column(ForeignKey("cd_proficiency_level.id"), nullable=True)
    question_text: Mapped[str] = mapped_column(Text)
    question_text_ar: Mapped[str] = mapped_column(Text, default="")
    question_type: Mapped[str] = mapped_column(String(20), default="MCQ")
    difficulty_level: Mapped[int] = mapped_column(Integer, default=3)
    expected_answer: Mapped[str] = mapped_column(Text, default="")
    scoring_guidance: Mapped[str] = mapped_column(Text, default="")
    risk_level: Mapped[str] = mapped_column(String(20), default="MED")
    ai_confidence_score: Mapped[float] = mapped_column(Float, default=0.0)
    # DRAFT | APPROVED | RETURNED | REJECTED
    review_status: Mapped[str] = mapped_column(String(20), default="DRAFT")
    # set when an approved question is promoted into the live l7_question bank
    published_question_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class QuestionReview(Base, TimestampMixin):
    __tablename__ = "qg_review"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    ai_question_id: Mapped[str] = mapped_column(ForeignKey("qg_question.id"), index=True)
    reviewer_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    review_role: Mapped[str] = mapped_column(String(20), default="SME")  # SME|HR|Governance
    review_decision: Mapped[str] = mapped_column(String(20))  # Approved|Returned|Rejected
    comments: Mapped[str] = mapped_column(Text, default="")
