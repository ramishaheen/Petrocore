"""L7 orchestration: question-bank-driven adaptive assessment + evidence validation."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.l3_l4 import Competency, CompetencyRequirement
from app.models.l5_l6 import CompetencyResult, Profile
from app.models.l7_l8 import Assessment, AssessmentItem, AuditTrail, Evidence, Question
from app.services.engines import assessment_engine as engine
from app.services.engines.gateway import gateway
from app.services.engines.governance import append_audit, open_decision


def required_level_for(db: Session, employee_id: str, competency_id: str) -> int:
    """Resolve the calibrated required level for this employee's job (L3)."""
    from app.models.l1_l2 import Employee

    emp = db.get(Employee, employee_id)
    if emp and emp.current_job_id:
        req = db.execute(
            select(CompetencyRequirement).where(
                CompetencyRequirement.competency_id == competency_id,
                CompetencyRequirement.job_id == emp.current_job_id,
            )
        ).scalar_one_or_none()
        if req:
            return req.required_level
    return 4  # sensible default


def build_path(db: Session, competency_id: str) -> list[Question]:
    """Adaptive path: questions ordered easy→hard so the engine converges fast."""
    questions = db.execute(
        select(Question).where(Question.competency_id == competency_id).order_by(Question.difficulty)
    ).scalars().all()
    return list(questions)


def generate_scenario(db: Session, competency_id: str) -> dict:
    """Generate a scenario-based item via the model gateway (stubbed offline)."""
    comp = db.get(Competency, competency_id)
    name = comp.name_en if comp else competency_id
    text = gateway.complete(
        system="You are an oil & gas competency assessor. Write one scenario question.",
        prompt=f"Scenario assessment item for competency '{name}'.",
    )
    return {"kind": "SCENARIO", "competency_id": competency_id, "generated": text}


def grade_item(question: Question, response: dict) -> float:
    """Grade a single response in [0,1]. MCQ checks answer_key; others use confidence."""
    if question.kind == "MCQ":
        chosen = response.get("choice")
        correct = question.answer_key.get("correct")
        return 1.0 if chosen is not None and chosen == correct else 0.0
    # SCENARIO / EVIDENCE: caller supplies a self/assessor rubric score 0–1.
    return float(response.get("score", 0.0))


def run_assessment(
    db: Session, *, actor_user_id: str, tenant_id: str,
    employee_id: str, competency_id: str, responses: list[dict],
) -> dict:
    """Grade responses, run the engine, persist result + audit, route low confidence."""
    path = build_path(db, competency_id)
    by_id = {q.id: q for q in path}

    required = required_level_for(db, employee_id, competency_id)
    evidence_count = db.execute(
        select(Evidence).where(Evidence.employee_id == employee_id)
    ).scalars().all()

    assessment = Assessment(
        tenant_id=tenant_id, employee_id=employee_id, competency_id=competency_id,
        status="IN_PROGRESS", adaptive_path={"question_ids": [q.id for q in path]},
    )
    db.add(assessment)
    db.flush()

    item_scores: list[float] = []
    for resp in responses:
        q = by_id.get(resp.get("question_id"))
        if not q:
            continue
        score = grade_item(q, resp)
        item_scores.append(score)
        db.add(AssessmentItem(
            assessment_id=assessment.id, question_id=q.id, response=resp,
            correct=score >= 0.5, score=score,
        ))

    ctx = engine.AssessmentContext(
        employee_id=employee_id, competency_id=competency_id, required_level=required,
        item_scores=item_scores, evidence_count=len(evidence_count),
    )
    result = engine.run(ctx)

    assessment.status = result["status"]
    assessment.assessed_level = result["assessed_level"]
    assessment.confidence = result["confidence"]
    for entry in result["audit"]:
        db.add(AuditTrail(assessment_id=assessment.id, step=entry["step"], detail=entry))

    profile = db.query(Profile).filter(Profile.employee_id == employee_id).one_or_none()
    if profile:
        db.add(CompetencyResult(
            tenant_id=tenant_id, profile_id=profile.id, competency_id=competency_id,
            assessed_level=result["assessed_level"], required_level=required,
            confidence=result["confidence"], source="ASSESSMENT", status=result["status"],
            evidence_id=evidence_count[0].id if evidence_count else None,
        ))

    if result["needs_human_review"]:
        open_decision(
            db, tenant_id=tenant_id, kind="COMPETENCY_RESULT",
            subject_ref=f"assessment:{assessment.id}",
            ai_recommendation=f"level={result['assessed_level']}",
            confidence=result["confidence"],
        )

    append_audit(
        db, actor_user_id=actor_user_id, action="ASSESSMENT_RUN",
        entity="l7_assessment", entity_id=assessment.id,
        after={"level": result["assessed_level"], "confidence": result["confidence"]},
    )
    db.commit()
    return {"assessment_id": assessment.id, **result}
