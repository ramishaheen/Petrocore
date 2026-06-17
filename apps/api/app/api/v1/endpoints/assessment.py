"""L7 · AI-Driven Assessment & Evidence Validation."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_db_for, get_current_user
from app.models.l5_l6 import CompetencyResult, Profile
from app.models.l7_l8 import Assessment, AuditTrail
from app.schemas import AssessmentResult, AssessmentSubmit
from app.services.engines.assessment_engine import AssessmentContext, run
from app.services.engines.governance import append_audit, open_decision

router = APIRouter(prefix="/assessments", tags=["L7 · AI Assessment & Evidence"])


@router.post("/run", response_model=AssessmentResult)
def run_assessment(
    body: AssessmentSubmit,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db_for),
) -> AssessmentResult:
    """Run the AI Assessment Engine, persist result + audit trail, and route
    low-confidence results to the human governance gate."""
    # In a fuller build, required_level comes from L3 calibration for this employee's job.
    required_level = 4
    ctx = AssessmentContext(
        employee_id=body.employee_id,
        competency_id=body.competency_id,
        required_level=required_level,
        item_scores=body.item_scores,
        evidence_count=body.evidence_count,
    )
    result = run(ctx)

    assessment = Assessment(
        tenant_id=user.tenant_id or "*",
        employee_id=body.employee_id, competency_id=body.competency_id,
        status=result["status"], assessed_level=result["assessed_level"],
        confidence=result["confidence"], adaptive_path={"item_scores": body.item_scores},
    )
    db.add(assessment)
    db.flush()

    for entry in result["audit"]:
        db.add(AuditTrail(assessment_id=assessment.id, step=entry["step"], detail=entry))

    # Write result onto the employee's 360° profile (created on demand).
    profile = db.query(Profile).filter(Profile.employee_id == body.employee_id).one_or_none()
    if profile:
        db.add(CompetencyResult(
            tenant_id=user.tenant_id or "*", profile_id=profile.id,
            competency_id=body.competency_id, assessed_level=result["assessed_level"],
            required_level=required_level, confidence=result["confidence"],
            source="ASSESSMENT", status=result["status"],
        ))

    # Human-in-the-loop: low confidence ⇒ open a governance decision.
    if result["needs_human_review"]:
        open_decision(
            db, tenant_id=user.tenant_id or "*", kind="COMPETENCY_RESULT",
            subject_ref=f"assessment:{assessment.id}",
            ai_recommendation=f"level={result['assessed_level']}",
            confidence=result["confidence"],
        )

    append_audit(
        db, actor_user_id=user.id, action="ASSESSMENT_RUN",
        entity="l7_assessment", entity_id=assessment.id,
        after={"level": result["assessed_level"], "confidence": result["confidence"]},
    )
    db.commit()
    return AssessmentResult(**{k: result[k] for k in
                               ("assessed_level", "required_level", "confidence", "status", "needs_human_review")})
