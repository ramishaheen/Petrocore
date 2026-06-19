"""Phase P-G APIs: assessment campaigns → participants → attempts → responses →
results, evidence review, and the tagged question bank."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_user, get_db_for, require_roles
from app.core.rbac import Role
from app.models.assessment_exec import (
    AssessmentAttempt, AssessmentCampaign, AssessmentParticipant, AssessmentResponse,
    AssessmentResultRow, QuestionBank, QuestionTag,
)
from app.models.l1_l2 import Employee
from app.services import assessment_exec_service as svc

router = APIRouter(tags=["P-G · Assessment Execution"])

_designer = require_roles(
    Role.HR_VALIDATOR, Role.LD_MANAGER, Role.DEPT_MANAGER, Role.COMPANY_ADMIN,
    Role.PLATFORM_ADMIN, Role.CONSULTANT)
_reviewer = require_roles(
    Role.HR_VALIDATOR, Role.LD_MANAGER, Role.DEPT_MANAGER, Role.COMPANY_ADMIN,
    Role.NOC_EXECUTIVE, Role.PLATFORM_ADMIN, Role.CONSULTANT)


class CampaignIn(BaseModel):
    name: str
    blueprint_id: str | None = None
    target_entity_type: str = "Employee"
    target_entity_id: str | None = None


@router.post("/assessment-campaigns")
def create_campaign(body: CampaignIn, user: CurrentUser = Depends(_designer), db: Session = Depends(get_db_for)) -> dict:
    camp = svc.create_campaign(
        db, actor_user_id=user.id, tenant_id=user.tenant_id or "*", name=body.name,
        blueprint_id=body.blueprint_id, target_entity_type=body.target_entity_type,
        target_entity_id=body.target_entity_id)
    db.commit()
    return {"id": camp.id, "name": camp.name, "status": camp.status, "blueprint_id": camp.blueprint_id}


@router.get("/assessment-campaigns")
def list_campaigns(db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(select(AssessmentCampaign).order_by(AssessmentCampaign.created_at.desc())).scalars().all()
    counts: dict[str, int] = {}
    for p in db.execute(select(AssessmentParticipant)).scalars().all():
        counts[p.assessment_id] = counts.get(p.assessment_id, 0) + 1
    return [{"id": c.id, "name": c.name, "status": c.status, "blueprint_id": c.blueprint_id,
             "target_entity_type": c.target_entity_type, "participants": counts.get(c.id, 0)} for c in rows]


@router.get("/assessment-campaigns/{campaign_id}")
def campaign_detail(campaign_id: str, db: Session = Depends(get_db_for)) -> dict:
    camp = db.get(AssessmentCampaign, campaign_id)
    if not camp:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "campaign not found")
    names = {e.id: e for e in db.execute(select(Employee)).scalars().all()}
    parts = db.execute(
        select(AssessmentParticipant).where(AssessmentParticipant.assessment_id == campaign_id)
    ).scalars().all()
    return {
        "id": camp.id, "name": camp.name, "status": camp.status, "blueprint_id": camp.blueprint_id,
        "participants": [
            {"id": p.id, "employee_id": p.employee_id,
             "name_en": names[p.employee_id].full_name_en if p.employee_id in names else p.employee_id,
             "name_ar": names[p.employee_id].full_name_ar if p.employee_id in names else p.employee_id,
             "status": p.status} for p in parts],
    }


class EnrollIn(BaseModel):
    employee_id: str


@router.post("/assessment-campaigns/{campaign_id}/enroll")
def enroll(campaign_id: str, body: EnrollIn, user: CurrentUser = Depends(_designer), db: Session = Depends(get_db_for)) -> dict:
    try:
        p = svc.enroll(db, actor_user_id=user.id, assessment_id=campaign_id, employee_id=body.employee_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    db.commit()
    return {"id": p.id, "employee_id": p.employee_id, "status": p.status}


@router.post("/assessment-participants/{participant_id}/start")
def start_attempt(participant_id: str, user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db_for)) -> dict:
    try:
        att = svc.start_attempt(db, actor_user_id=user.id, participant_id=participant_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    db.commit()
    return {"id": att.id, "attempt_status": att.attempt_status}


class ResponseItem(BaseModel):
    question_id: str
    selected_option: int | None = None
    response_text: str = ""
    score: float = 0.0
    manual_score: float | None = None
    attachment_evidence_id: str | None = None


class SubmitIn(BaseModel):
    responses: list[ResponseItem]


@router.post("/assessment-attempts/{attempt_id}/submit")
def submit_attempt(attempt_id: str, body: SubmitIn, user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db_for)) -> dict:
    try:
        result = svc.submit_responses(
            db, actor_user_id=user.id, attempt_id=attempt_id,
            responses=[r.model_dump() for r in body.responses])
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    db.commit()
    return result


@router.get("/assessment-attempts/{attempt_id}")
def attempt_detail(attempt_id: str, db: Session = Depends(get_db_for)) -> dict:
    att = db.get(AssessmentAttempt, attempt_id)
    if not att:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "attempt not found")
    responses = db.execute(select(AssessmentResponse).where(AssessmentResponse.attempt_id == attempt_id)).scalars().all()
    results = db.execute(select(AssessmentResultRow).where(AssessmentResultRow.attempt_id == attempt_id)).scalars().all()
    return {
        "id": att.id, "attempt_status": att.attempt_status, "total_score": att.total_score,
        "responses": [{"question_id": r.question_id, "final_score": r.final_score} for r in responses],
        "results": [{"id": r.id, "competency_id": r.competency_id, "actual_level": r.actual_level,
                     "required_level": r.required_level, "score_percentage": r.score_percentage,
                     "result_status": r.result_status} for r in results],
    }


class ReviewIn(BaseModel):
    approve: bool = True


@router.post("/assessment-results/{result_id}/review")
def review_result(result_id: str, body: ReviewIn, user: CurrentUser = Depends(_reviewer), db: Session = Depends(get_db_for)) -> dict:
    try:
        result = svc.review_result(db, actor_user_id=user.id, result_id=result_id, approve=body.approve)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    db.commit()
    return result


class EvidenceReviewIn(BaseModel):
    decision: str  # Accepted | Rejected | NeedsClarification
    confidence_score: float = 0.0
    comments: str = ""


@router.post("/evidence/{evidence_id}/review")
def review_evidence(evidence_id: str, body: EvidenceReviewIn, user: CurrentUser = Depends(_reviewer), db: Session = Depends(get_db_for)) -> dict:
    try:
        result = svc.review_evidence(
            db, actor_user_id=user.id, evidence_id=evidence_id, decision=body.decision,
            confidence_score=body.confidence_score, comments=body.comments)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    db.commit()
    return result


@router.get("/question-banks")
def list_banks(db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(select(QuestionBank).order_by(QuestionBank.code)).scalars().all()
    return [{"id": b.id, "code": b.code, "name_en": b.name_en, "name_ar": b.name_ar, "status": b.status} for b in rows]


class BankIn(BaseModel):
    code: str
    name_en: str
    name_ar: str


@router.post("/question-banks")
def create_bank(body: BankIn, user: CurrentUser = Depends(_designer), db: Session = Depends(get_db_for)) -> dict:
    b = svc.create_bank(db, tenant_id=user.tenant_id or "*", code=body.code, name_en=body.name_en, name_ar=body.name_ar)
    db.commit()
    return {"id": b.id, "code": b.code}


@router.get("/questions/{question_id}/tags")
def list_tags(question_id: str, db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(select(QuestionTag).where(QuestionTag.question_id == question_id)).scalars().all()
    return [{"id": t.id, "tag_type": t.tag_type, "tag_value": t.tag_value} for t in rows]


class TagIn(BaseModel):
    tag_type: str
    tag_value: str


@router.post("/questions/{question_id}/tags")
def tag_question(question_id: str, body: TagIn, user: CurrentUser = Depends(_designer), db: Session = Depends(get_db_for)) -> dict:
    tg = svc.tag_question(db, tenant_id=user.tenant_id or "*", question_id=question_id,
                          tag_type=body.tag_type, tag_value=body.tag_value)
    db.commit()
    return {"id": tg.id, "tag_type": tg.tag_type, "tag_value": tg.tag_value}
