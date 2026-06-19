"""Phase P-L APIs: AI request/output lifecycle + governance review, prompt
templates, and model versions."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_db_for, require_roles
from app.core.rbac import Role
from app.models.ai_lifecycle import AIModelVersion, AIOutput, AIRequest, PromptTemplate
from app.services import ai_lifecycle_service as svc

router = APIRouter(prefix="/ai", tags=["P-L · AI Lifecycle & Governance"])

_ai = require_roles(
    Role.HR_VALIDATOR, Role.LD_MANAGER, Role.COMPANY_ADMIN, Role.NOC_EXECUTIVE,
    Role.PLATFORM_ADMIN, Role.CONSULTANT)


class RequestIn(BaseModel):
    request_type: str
    prompt: str
    entity_type: str | None = None
    entity_id: str | None = None
    prompt_template_code: str | None = None


@router.post("/requests")
def run_request(body: RequestIn, user: CurrentUser = Depends(_ai), db: Session = Depends(get_db_for)) -> dict:
    result = svc.run_request(
        db, actor_user_id=user.id, tenant_id=user.tenant_id or "*", request_type=body.request_type,
        prompt=body.prompt, entity_type=body.entity_type, entity_id=body.entity_id,
        prompt_template_code=body.prompt_template_code)
    db.commit()
    return result


@router.get("/requests")
def list_requests(db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(select(AIRequest).order_by(AIRequest.created_at.desc())).scalars().all()
    return [{"id": r.id, "request_type": r.request_type, "status": r.status,
             "entity_type": r.entity_type, "entity_id": r.entity_id} for r in rows]


@router.get("/requests/{request_id}")
def request_detail(request_id: str, db: Session = Depends(get_db_for)) -> dict:
    detail = svc.request_detail(db, request_id)
    if not detail:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "request not found")
    return detail


class ReviewIn(BaseModel):
    decision: str  # Accepted | Modified | Rejected
    comments: str = ""


@router.post("/outputs/{output_id}/review")
def review_output(output_id: str, body: ReviewIn, user: CurrentUser = Depends(_ai), db: Session = Depends(get_db_for)) -> dict:
    try:
        result = svc.review_output(db, actor_user_id=user.id, output_id=output_id,
                                   decision=body.decision, comments=body.comments)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))
    db.commit()
    return result


@router.get("/prompt-templates")
def list_prompt_templates(db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(select(PromptTemplate).order_by(PromptTemplate.code)).scalars().all()
    return [{"id": t.id, "code": t.code, "template_name": t.template_name, "use_case": t.use_case,
             "version": t.version, "status": t.status} for t in rows]


class TemplateIn(BaseModel):
    code: str
    template_name: str
    use_case: str = ""
    prompt_text: str


@router.post("/prompt-templates")
def create_prompt_template(body: TemplateIn, user: CurrentUser = Depends(_ai), db: Session = Depends(get_db_for)) -> dict:
    t = svc.create_prompt_template(db, code=body.code, template_name=body.template_name,
                                   use_case=body.use_case, prompt_text=body.prompt_text)
    db.commit()
    return {"id": t.id, "code": t.code}


@router.get("/model-versions")
def list_model_versions(db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(select(AIModelVersion).order_by(AIModelVersion.model_name)).scalars().all()
    return [{"id": m.id, "model_name": m.model_name, "version": m.version, "provider": m.provider,
             "status": m.status} for m in rows]


class ModelIn(BaseModel):
    model_name: str
    version: str = ""
    provider: str = ""


@router.post("/model-versions")
def create_model_version(body: ModelIn, user: CurrentUser = Depends(_ai), db: Session = Depends(get_db_for)) -> dict:
    m = svc.create_model_version(db, model_name=body.model_name, version=body.version, provider=body.provider)
    db.commit()
    return {"id": m.id, "model_name": m.model_name}
