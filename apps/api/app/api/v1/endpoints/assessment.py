"""L7 · AI-Driven Assessment & Evidence Validation."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_user, get_db_for
from app.models.l7_l8 import Assessment, AuditTrail, Evidence, Question
from app.schemas import (
    AssessmentResult, AssessmentRun, AssessmentSubmit, EvidenceIn, QuestionOut,
)
from app.services import assessment_service
from app.services.assessment_service import generate_scenario, run_assessment
from app.services.engines.assessment_engine import AssessmentContext, run
from app.services.engines.evidence_engine import index_evidence, match_evidence_to_competency
from app.services.engines.governance import append_audit, open_decision

router = APIRouter(prefix="/assessments", tags=["L7 · AI Assessment & Evidence"])


@router.get("/questions/{competency_id}", response_model=list[QuestionOut])
def questions(competency_id: str, db: Session = Depends(get_db_for)) -> list[Question]:
    """Adaptive path: the smart question bank for a competency (easy→hard)."""
    return assessment_service.build_path(db, competency_id)


@router.post("/scenario/{competency_id}")
def scenario(competency_id: str, db: Session = Depends(get_db_for)) -> dict:
    """Generate a scenario-based item via the model gateway."""
    return generate_scenario(db, competency_id)


@router.post("/grade", response_model=AssessmentResult)
def grade(
    body: AssessmentRun,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db_for),
) -> AssessmentResult:
    """Run a question-bank-driven assessment: grade → engine → persist → route."""
    result = run_assessment(
        db, actor_user_id=user.id, tenant_id=user.tenant_id or "*",
        employee_id=body.employee_id, competency_id=body.competency_id,
        responses=[r.model_dump() for r in body.responses],
    )
    return AssessmentResult(**{k: result[k] for k in
                               ("assessed_level", "required_level", "confidence", "status", "needs_human_review")})


@router.post("/run", response_model=AssessmentResult)
def run_simple(
    body: AssessmentSubmit,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db_for),
) -> AssessmentResult:
    """Lightweight path: caller supplies raw per-item scores (no question bank)."""
    ctx = AssessmentContext(
        employee_id=body.employee_id, competency_id=body.competency_id,
        required_level=4, item_scores=body.item_scores, evidence_count=body.evidence_count,
    )
    result = run(ctx)
    assessment = Assessment(
        tenant_id=user.tenant_id or "*", employee_id=body.employee_id,
        competency_id=body.competency_id, status=result["status"],
        assessed_level=result["assessed_level"], confidence=result["confidence"],
        adaptive_path={"item_scores": body.item_scores},
    )
    db.add(assessment)
    db.flush()
    for entry in result["audit"]:
        db.add(AuditTrail(assessment_id=assessment.id, step=entry["step"], detail=entry))
    if result["needs_human_review"]:
        open_decision(
            db, tenant_id=user.tenant_id or "*", kind="COMPETENCY_RESULT",
            subject_ref=f"assessment:{assessment.id}",
            ai_recommendation=f"level={result['assessed_level']}", confidence=result["confidence"],
        )
    append_audit(db, actor_user_id=user.id, action="ASSESSMENT_RUN",
                 entity="l7_assessment", entity_id=assessment.id,
                 after={"level": result["assessed_level"], "confidence": result["confidence"]})
    db.commit()
    return AssessmentResult(**{k: result[k] for k in
                               ("assessed_level", "required_level", "confidence", "status", "needs_human_review")})


@router.post("/evidence")
def add_evidence(
    body: EvidenceIn,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db_for),
) -> dict:
    """Attach a supporting evidence record and index it for semantic matching."""
    ev = Evidence(
        tenant_id=user.tenant_id or "*", employee_id=body.employee_id,
        kind=body.kind, uri=body.uri, text=body.text, confidence=body.confidence,
    )
    index_evidence(db, ev)
    db.commit()
    return {"evidence_id": ev.id, "indexed": ev.embedding is not None}


@router.get("/evidence/match")
def evidence_match(
    employee_id: str, competency_id: str, db: Session = Depends(get_db_for)
) -> list[dict]:
    """Semantically match an employee's evidence to a competency (pgvector)."""
    return match_evidence_to_competency(db, employee_id, competency_id)


@router.get("/{assessment_id}/audit")
def audit(assessment_id: str, db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(
        select(AuditTrail).where(AuditTrail.assessment_id == assessment_id)
    ).scalars().all()
    return [{"step": a.step, "detail": a.detail} for a in rows]
