"""AI question generation → human review → approved bank (System Analysis §2.7, §9, §10 / P-C).

The model gateway *drafts* questions from an approved blueprint; nothing the AI
produces is usable until a human reviewer (SME / HR / Governance) approves it, at
which point the draft is **promoted** into the live ``l7_question`` bank. Every
draft carries an ``ai_confidence_score`` and every review + promotion is audited.
"""
from __future__ import annotations

import hashlib

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assessment_v2 import (
    AIGeneratedQuestion, AIQuestionGenerationRequest, AssessmentBlueprint,
    AssessmentBlueprintCompetency, QuestionReview,
)
from app.models.competency_v2 import ProficiencyLevel
from app.models.l3_l4 import Competency
from app.models.l7_l8 import Question
from app.services.engines.gateway import gateway
from app.services.engines.governance import append_audit

# question_type → live bank kind.
_KIND_MAP = {"MCQ": "MCQ", "SCENARIO": "SCENARIO", "CASE": "SCENARIO", "INTERVIEW": "EVIDENCE"}


def _confidence_for(prompt: str) -> float:
    """Deterministic, stable pseudo-confidence in [0.55, 0.95] for offline runs."""
    digest = hashlib.sha256(prompt.encode()).digest()
    return round(0.55 + (digest[0] / 255.0) * 0.40, 4)


def generate_questions(
    db: Session,
    *,
    actor_user_id: str | None,
    blueprint_id: str,
    generation_purpose: str = "Question",
) -> dict:
    """Draft AIGeneratedQuestion rows for every competency in the blueprint."""
    blueprint = db.get(AssessmentBlueprint, blueprint_id)
    if not blueprint:
        raise ValueError("blueprint not found")
    bp_comps = db.execute(
        select(AssessmentBlueprintCompetency).where(
            AssessmentBlueprintCompetency.blueprint_id == blueprint_id
        )
    ).scalars().all()
    comps = {c.id: c for c in db.execute(select(Competency)).scalars().all()}
    levels = {p.id: p for p in db.execute(select(ProficiencyLevel)).scalars().all()}

    request = AIQuestionGenerationRequest(
        tenant_id=blueprint.tenant_id, blueprint_id=blueprint_id, requested_by=actor_user_id,
        generation_purpose=generation_purpose,
        input_context={"blueprint_code": blueprint.code, "competency_count": len(bp_comps)},
        status="COMPLETED",
    )
    db.add(request)
    db.flush()

    created = 0
    for bc in bp_comps:
        comp = comps.get(bc.competency_id)
        level = levels.get(bc.required_proficiency_level_id) if bc.required_proficiency_level_id else None
        name_en = comp.name_en if comp else bc.competency_id
        name_ar = comp.name_ar if comp else bc.competency_id
        lvl_en = level.name_en if level else "target"
        lvl_ar = level.name_ar if level else "المستهدف"
        rank = level.level_rank if level else 3
        for i in range(max(1, bc.question_count)):
            qtype = "MCQ" if i % 2 == 0 else "SCENARIO"
            prompt = (
                f"blueprint={blueprint.code};competency={name_en};level={lvl_en};"
                f"type={qtype};index={i}"
            )
            ref = gateway.complete(
                system="You draft competency assessment questions for review.",
                prompt=prompt,
            )
            confidence = _confidence_for(prompt)
            db.add(AIGeneratedQuestion(
                tenant_id=blueprint.tenant_id, request_id=request.id, competency_id=bc.competency_id,
                proficiency_level_id=bc.required_proficiency_level_id,
                question_text=(f"[{qtype}] At the {lvl_en} level, demonstrate {name_en}. "
                               f"(draft ref {ref})"),
                question_text_ar=(f"[{qtype}] عند مستوى {lvl_ar}، أظهر {name_ar}."),
                question_type=qtype, difficulty_level=max(1, min(5, rank)),
                expected_answer="See scoring guidance.",
                scoring_guidance=f"Award full marks when {lvl_en}-level behaviour is evidenced.",
                risk_level="HIGH" if confidence < 0.75 else "MED",
                ai_confidence_score=confidence, review_status="DRAFT",
            ))
            created += 1

    append_audit(
        db, actor_user_id=actor_user_id, action="GENERATE_AI_QUESTIONS",
        entity="qg_request", entity_id=request.id,
        after={"blueprint_id": blueprint_id, "drafted": created},
    )
    return {"request_id": request.id, "drafted": created}


def review_question(
    db: Session,
    *,
    actor_user_id: str | None,
    ai_question_id: str,
    decision: str,
    review_role: str = "SME",
    comments: str = "",
) -> dict:
    """Record a human review; an Approved review promotes the draft into the live bank.

    ``decision`` ∈ {Approved, Returned, Rejected}. Promotion is idempotent — a
    question already published is not duplicated.
    """
    if decision not in {"Approved", "Returned", "Rejected"}:
        raise ValueError("decision must be Approved, Returned or Rejected")
    q = db.get(AIGeneratedQuestion, ai_question_id)
    if not q:
        raise ValueError("AI question not found")

    review = QuestionReview(
        tenant_id=q.tenant_id, ai_question_id=ai_question_id, reviewer_id=actor_user_id,
        review_role=review_role, review_decision=decision, comments=comments,
    )
    db.add(review)
    db.flush()

    status_map = {"Approved": "APPROVED", "Returned": "RETURNED", "Rejected": "REJECTED"}
    q.review_status = status_map[decision]

    published_question_id = q.published_question_id
    if decision == "Approved" and not q.published_question_id:
        bank_q = Question(
            competency_id=q.competency_id,
            kind=_KIND_MAP.get(q.question_type, "EVIDENCE"),
            difficulty=q.difficulty_level,
            body_en=q.question_text, body_ar=q.question_text_ar or q.question_text,
            options={"choices": ["A", "B", "C", "D"]} if q.question_type == "MCQ" else {},
            answer_key={"correct": 1} if q.question_type == "MCQ" else {},
        )
        db.add(bank_q)
        db.flush()
        q.published_question_id = bank_q.id
        published_question_id = bank_q.id
        append_audit(
            db, actor_user_id=actor_user_id, action="PROMOTE_QUESTION",
            entity="l7_question", entity_id=bank_q.id,
            after={"from_ai_question": ai_question_id, "competency_id": q.competency_id},
        )

    append_audit(
        db, actor_user_id=actor_user_id, action="REVIEW_AI_QUESTION",
        entity="qg_question", entity_id=ai_question_id,
        after={"decision": decision, "review_role": review_role},
    )
    return {
        "ai_question_id": ai_question_id, "review_status": q.review_status,
        "published_question_id": published_question_id,
    }
