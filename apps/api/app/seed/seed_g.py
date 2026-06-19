"""Seed Phase P-G data: a question bank + tags, and a worked assessment campaign
(enroll → attempt → submit) left at DRAFT results, plus one evidence review.
Idempotent; does not approve results, so it never writes back into L5 competency
results used by other flows/tests."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assessment_exec import QuestionBank
from app.models.assessment_v2 import AssessmentBlueprint, AssessmentBlueprintCompetency
from app.models.l1_l2 import Employee
from app.models.l7_l8 import Evidence, Question
from app.services import assessment_exec_service as svc


def seed_g(db: Session) -> None:
    if db.query(QuestionBank).count() > 0:
        return

    bank = svc.create_bank(db, tenant_id="*", code="CORE-BANK",
                           name_en="Core Question Bank", name_ar="بنك الأسئلة الأساسي")
    questions = db.execute(select(Question)).scalars().all()
    for q in questions[:4]:
        svc.tag_question(db, tenant_id="*", question_id=q.id, tag_type="Competency", tag_value=q.competency_id)
        svc.tag_question(db, tenant_id="*", question_id=q.id, tag_type="Risk", tag_value="MED")
    _ = bank

    blueprint = db.execute(select(AssessmentBlueprint)).scalars().first()
    emps = db.execute(select(Employee)).scalars().all()
    if not blueprint or not emps:
        db.flush()
        return

    camp = svc.create_campaign(
        db, actor_user_id=None, tenant_id=blueprint.tenant_id,
        name=f"{blueprint.name} — Baseline Campaign", blueprint_id=blueprint.id,
        target_entity_type="Employee", target_entity_id=emps[0].id)
    part = svc.enroll(db, actor_user_id=None, assessment_id=camp.id, employee_id=emps[0].id)
    att = svc.start_attempt(db, actor_user_id=None, participant_id=part.id)

    bp_comp_ids = [
        bc.competency_id for bc in db.execute(
            select(AssessmentBlueprintCompetency).where(
                AssessmentBlueprintCompetency.blueprint_id == blueprint.id)
        ).scalars().all()
    ]
    responses = []
    for i, q in enumerate(questions):
        if q.competency_id not in bp_comp_ids:
            continue
        if q.kind == "MCQ":
            correct = q.answer_key.get("correct") if q.answer_key else 1
            responses.append({"question_id": q.id,
                              "selected_option": correct if i % 2 == 0 else 0})
        else:
            responses.append({"question_id": q.id, "score": 0.8 if i % 2 == 0 else 0.4})
    if responses:
        svc.submit_responses(db, actor_user_id=None, attempt_id=att.id, responses=responses)

    ev = db.execute(select(Evidence)).scalars().first()
    if ev:
        svc.review_evidence(db, actor_user_id=None, evidence_id=ev.id, decision="Accepted",
                            confidence_score=0.85, comments="Verified against certificate.")
    db.flush()
