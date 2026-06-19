"""AI request/output lifecycle & governance (System Analysis §3.15 / Phase P-L).

Wraps the swappable model gateway in an auditable, reviewable record: every AI
request logs its input + prompt template + model version, every output carries a
confidence score, and consequential outputs pass a human AI-governance review.
Prompt templates and model versions are global config; requests/outputs/reviews
are tenant-scoped.
"""
from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, uuid_pk


class PromptTemplate(Base, TimestampMixin):
    __tablename__ = "ai_prompt_template"

    id: Mapped[str] = uuid_pk()
    code: Mapped[str] = mapped_column(String(60), unique=True, index=True)
    template_name: Mapped[str] = mapped_column(String(160))
    use_case: Mapped[str] = mapped_column(String(60), default="")
    prompt_text: Mapped[str] = mapped_column(Text)
    version: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class AIModelVersion(Base, TimestampMixin):
    __tablename__ = "ai_model_version"

    id: Mapped[str] = uuid_pk()
    model_name: Mapped[str] = mapped_column(String(120), index=True)
    version: Mapped[str] = mapped_column(String(40), default="")
    provider: Mapped[str] = mapped_column(String(60), default="")
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class AIRequest(Base, TimestampMixin):
    __tablename__ = "ai_request"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    # GenerateQuestion | AnalyzeCV | SuggestCompetency | RecommendPlan | …
    request_type: Mapped[str] = mapped_column(String(40), index=True)
    requested_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    entity_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    entity_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    prompt_template_id: Mapped[str | None] = mapped_column(ForeignKey("ai_prompt_template.id"), nullable=True)
    model_version_id: Mapped[str | None] = mapped_column(ForeignKey("ai_model_version.id"), nullable=True)
    input_json: Mapped[dict] = mapped_column(JSONB, default=dict)
    status: Mapped[str] = mapped_column(String(20), default="COMPLETED")


class AIOutput(Base, TimestampMixin):
    __tablename__ = "ai_output"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    ai_request_id: Mapped[str] = mapped_column(ForeignKey("ai_request.id"), index=True)
    output_json: Mapped[dict] = mapped_column(JSONB, default=dict)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)
    model_version_id: Mapped[str | None] = mapped_column(ForeignKey("ai_model_version.id"), nullable=True)
    # PENDING_REVIEW | ACCEPTED | MODIFIED | REJECTED
    status: Mapped[str] = mapped_column(String(20), default="PENDING_REVIEW")


class AIReview(Base, TimestampMixin):
    __tablename__ = "ai_review"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    ai_output_id: Mapped[str] = mapped_column(ForeignKey("ai_output.id"), index=True)
    reviewer_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    review_decision: Mapped[str] = mapped_column(String(20))  # Accepted|Modified|Rejected
    reviewer_comments: Mapped[str] = mapped_column(Text, default="")
