"""Seed Phase P-C data: scoring rubrics + a governed blueprint per job, with a
small batch of AI-drafted questions waiting in the review queue (idempotent)."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assessment_v2 import AssessmentBlueprint, ScoringRubric
from app.models.l1_l2 import Job
from app.services import ai_question_service, blueprint_service

RUBRICS = [
    ("WEIGHTED", "Weighted competency score", "weighted",
     "Per-competency scores combined by blueprint weights."),
    ("RUBRIC", "Behaviour rubric", "rubric",
     "Levelled rubric scoring against proficiency descriptors."),
    ("PASS_FAIL", "Pass / fail gate", "pass_fail",
     "Single threshold for mandatory/HSE certifications."),
]


def seed_c(db: Session) -> None:
    if db.query(ScoringRubric).count() > 0:
        return

    for code, name, model, desc in RUBRICS:
        db.add(ScoringRubric(code=code, name=name, model=model, description=desc))
    db.flush()

    first = True
    for job in db.execute(select(Job)).scalars().all():
        if blueprint_service.latest_approved_profile(db, job.id) is None:
            continue
        if db.execute(
            select(AssessmentBlueprint).where(AssessmentBlueprint.job_id == job.id)
        ).scalars().first():
            continue
        bp = blueprint_service.create_blueprint_from_job(db, actor_user_id=None, job_id=job.id)
        db.flush()
        # Draft AI questions for the first blueprint so the review queue isn't empty.
        if first:
            ai_question_service.generate_questions(db, actor_user_id=None, blueprint_id=bp.id)
            first = False
    db.flush()
