"""Phase P-C APIs: governed assessment blueprints + AI question review workflow."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_db_for, require_roles
from app.core.rbac import Role
from app.models.assessment_v2 import (
    AIGeneratedQuestion, AssessmentBlueprint, AssessmentBlueprintCompetency,
    AssessmentBlueprintRule, ScoringRubric,
)
from app.models.competency_v2 import ProficiencyLevel
from app.models.l1_l2 import Job
from app.models.l3_l4 import Competency
from app.services import ai_question_service, blueprint_service

router = APIRouter(tags=["P-C · Assessment Blueprints & AI Question Review"])

# Designers build blueprints and request AI drafts; reviewers approve content.
_designer = require_roles(
    Role.HR_VALIDATOR, Role.LD_MANAGER, Role.COMPANY_ADMIN, Role.PLATFORM_ADMIN, Role.CONSULTANT,
)
_reviewer = require_roles(
    Role.HR_VALIDATOR, Role.DEPT_MANAGER, Role.COMPANY_ADMIN, Role.NOC_EXECUTIVE,
    Role.PLATFORM_ADMIN, Role.CONSULTANT,
)


# ---------------------------------------------------------------- jobs
@router.get("/jobs")
def list_jobs(db: Session = Depends(get_db_for)) -> list[dict]:
    """Jobs visible to the requester (RLS-scoped), flagged for blueprint-readiness."""
    jobs = db.execute(select(Job).order_by(Job.code)).scalars().all()
    return [
        {"id": j.id, "code": j.code, "title_en": j.title_en, "title_ar": j.title_ar,
         "job_family": j.job_family, "admin_level": j.admin_level,
         "activity_segment": j.activity_segment,
         "has_approved_profile": blueprint_service.latest_approved_profile(db, j.id) is not None}
        for j in jobs
    ]


# ---------------------------------------------------------------- blueprints
class BlueprintIn(BaseModel):
    assessment_purpose: str = "Baseline"


@router.post("/jobs/{job_id}/blueprint")
def create_blueprint(
    job_id: str,
    body: BlueprintIn | None = None,
    user: CurrentUser = Depends(_designer),
    db: Session = Depends(get_db_for),
) -> dict:
    """Derive a DRAFT blueprint from the job's latest APPROVED competency profile."""
    try:
        bp = blueprint_service.create_blueprint_from_job(
            db, actor_user_id=user.id, job_id=job_id,
            assessment_purpose=(body.assessment_purpose if body else "Baseline"),
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc))
    db.commit()
    return _blueprint_detail(db, bp.id)


@router.get("/blueprints")
def list_blueprints(db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(select(AssessmentBlueprint).order_by(AssessmentBlueprint.code)).scalars().all()
    counts = dict(
        db.execute(
            select(AssessmentBlueprintCompetency.blueprint_id, func.count())
            .group_by(AssessmentBlueprintCompetency.blueprint_id)
        ).all()
    )
    return [
        {"id": b.id, "code": b.code, "name": b.name, "job_id": b.job_id,
         "assessment_purpose": b.assessment_purpose, "approval_status": b.approval_status,
         "version": b.version, "competency_count": counts.get(b.id, 0)}
        for b in rows
    ]


def _blueprint_detail(db: Session, blueprint_id: str) -> dict:
    bp = db.get(AssessmentBlueprint, blueprint_id)
    if not bp:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "blueprint not found")
    comps = {c.id: c for c in db.execute(select(Competency)).scalars().all()}
    levels = {p.id: p for p in db.execute(select(ProficiencyLevel)).scalars().all()}
    bp_comps = db.execute(
        select(AssessmentBlueprintCompetency).where(AssessmentBlueprintCompetency.blueprint_id == blueprint_id)
    ).scalars().all()
    rules = db.execute(
        select(AssessmentBlueprintRule).where(AssessmentBlueprintRule.blueprint_id == blueprint_id)
    ).scalars().all()
    rubric = db.get(ScoringRubric, bp.scoring_rubric_id) if bp.scoring_rubric_id else None
    return {
        "id": bp.id, "code": bp.code, "name": bp.name, "job_id": bp.job_id,
        "assessment_purpose": bp.assessment_purpose, "approval_status": bp.approval_status,
        "version": bp.version, "passing_threshold": bp.passing_threshold,
        "readiness_threshold": bp.readiness_threshold,
        "scoring_rubric": {"code": rubric.code, "model": rubric.model} if rubric else None,
        "competencies": [
            {"competency_en": comps[c.competency_id].name_en if c.competency_id in comps else c.competency_id,
             "competency_ar": comps[c.competency_id].name_ar if c.competency_id in comps else c.competency_id,
             "required_level": levels[c.required_proficiency_level_id].level_code
                               if c.required_proficiency_level_id in levels else "?",
             "weight": c.weight, "question_count": c.question_count,
             "evidence_required": c.evidence_required_flag}
            for c in bp_comps
        ],
        "rules": [{"rule_type": r.rule_type, "rule_value": r.rule_value} for r in rules],
    }


@router.get("/blueprints/{blueprint_id}")
def blueprint_detail(blueprint_id: str, db: Session = Depends(get_db_for)) -> dict:
    return _blueprint_detail(db, blueprint_id)


@router.post("/blueprints/{blueprint_id}/submit")
def submit_blueprint(
    blueprint_id: str,
    user: CurrentUser = Depends(_designer),
    db: Session = Depends(get_db_for),
) -> dict:
    bp = db.get(AssessmentBlueprint, blueprint_id)
    if not bp:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "blueprint not found")
    blueprint_service.submit_for_approval(db, bp, actor_user_id=user.id)
    db.commit()
    return {"id": bp.id, "approval_status": bp.approval_status}


class ApproveIn(BaseModel):
    publish: bool = False


@router.post("/blueprints/{blueprint_id}/approve")
def approve_blueprint(
    blueprint_id: str,
    body: ApproveIn | None = None,
    user: CurrentUser = Depends(_reviewer),
    db: Session = Depends(get_db_for),
) -> dict:
    bp = db.get(AssessmentBlueprint, blueprint_id)
    if not bp:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "blueprint not found")
    blueprint_service.approve(db, bp, actor_user_id=user.id, publish=(body.publish if body else False))
    db.commit()
    return {"id": bp.id, "approval_status": bp.approval_status}


# ---------------------------------------------------------------- AI question workflow
@router.post("/blueprints/{blueprint_id}/generate-questions")
def generate_questions(
    blueprint_id: str,
    user: CurrentUser = Depends(_designer),
    db: Session = Depends(get_db_for),
) -> dict:
    try:
        result = ai_question_service.generate_questions(
            db, actor_user_id=user.id, blueprint_id=blueprint_id,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    db.commit()
    return result


@router.get("/ai-questions")
def list_ai_questions(
    blueprint_id: str | None = None,
    review_status: str | None = None,
    db: Session = Depends(get_db_for),
) -> list[dict]:
    """List AI-drafted questions, optionally filtered by blueprint or review status."""
    stmt = select(AIGeneratedQuestion)
    if review_status:
        stmt = stmt.where(AIGeneratedQuestion.review_status == review_status)
    rows = db.execute(stmt.order_by(AIGeneratedQuestion.created_at)).scalars().all()
    if blueprint_id:
        from app.models.assessment_v2 import AIQuestionGenerationRequest

        bp_req_ids = {
            r.id for r in db.execute(
                select(AIQuestionGenerationRequest).where(
                    AIQuestionGenerationRequest.blueprint_id == blueprint_id
                )
            ).scalars().all()
        }
        rows = [q for q in rows if q.request_id in bp_req_ids]
    comps = {c.id: c for c in db.execute(select(Competency)).scalars().all()}
    return [
        {"id": q.id, "competency_en": comps[q.competency_id].name_en if q.competency_id in comps else q.competency_id,
         "question_text": q.question_text, "question_text_ar": q.question_text_ar,
         "question_type": q.question_type, "difficulty_level": q.difficulty_level,
         "ai_confidence_score": q.ai_confidence_score, "risk_level": q.risk_level,
         "review_status": q.review_status, "published_question_id": q.published_question_id}
        for q in rows
    ]


class ReviewIn(BaseModel):
    decision: str  # Approved | Returned | Rejected
    review_role: str = "SME"
    comments: str = ""


@router.post("/ai-questions/{ai_question_id}/review")
def review_ai_question(
    ai_question_id: str,
    body: ReviewIn,
    user: CurrentUser = Depends(_reviewer),
    db: Session = Depends(get_db_for),
) -> dict:
    try:
        result = ai_question_service.review_question(
            db, actor_user_id=user.id, ai_question_id=ai_question_id,
            decision=body.decision, review_role=body.review_role, comments=body.comments,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))
    db.commit()
    return result


# ---------------------------------------------------------------- rubrics
@router.get("/scoring-rubrics")
def scoring_rubrics(db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(select(ScoringRubric).order_by(ScoringRubric.code)).scalars().all()
    return [{"id": r.id, "code": r.code, "name": r.name, "model": r.model, "status": r.status} for r in rows]
