"""Seed Phase P-L data: prompt templates, the active model version, and a sample
AI request/output (idempotent)."""
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.ai_lifecycle import PromptTemplate
from app.services import ai_lifecycle_service as svc


def seed_l(db: Session) -> None:
    if db.query(PromptTemplate).count() > 0:
        return
    svc.create_prompt_template(
        db, code="QGEN", template_name="Question Generation", use_case="GenerateQuestion",
        prompt_text="You draft competency assessment questions for SME review.")
    svc.create_prompt_template(
        db, code="CSUG", template_name="Competency Suggestion", use_case="SuggestCompetency",
        prompt_text="You suggest competencies for a role from its responsibilities.")
    svc.create_model_version(db, model_name=settings.AI_MODEL, version="stub-1", provider="gateway")

    svc.run_request(
        db, actor_user_id=None, tenant_id="*", request_type="SuggestCompetency",
        prompt="Suggest competencies for a Senior Field Operator.",
        entity_type="Role", entity_id=None, prompt_template_code="CSUG")
    db.flush()
