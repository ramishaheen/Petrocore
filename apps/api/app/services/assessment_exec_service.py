"""Assessment-execution orchestration (System Analysis §2.8 / Phase P-G).

Campaign → participant → attempt → response → result, with auto-scoring, a
per-competency result split, and (on approval) write-back into the L5 competency
results that feed gaps and readiness. Plus evidence review and question tagging.
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assessment_exec import (
    AssessmentAttempt, AssessmentCampaign, AssessmentParticipant, AssessmentResponse,
    AssessmentResultRow, EvidenceReview, QuestionBank, QuestionTag,
)
from app.models.assessment_v2 import AssessmentBlueprint, AssessmentBlueprintCompetency
from app.models.competency_v2 import ProficiencyLevel
from app.models.l1_l2 import Employee
from app.models.l5_l6 import CompetencyResult, Profile
from app.models.l7_l8 import Evidence, Question
from app.services.engines.governance import append_audit


def _level_from_pct(pct: float) -> int:
    if pct >= 0.85:
        return 5
    if pct >= 0.70:
        return 4
    if pct >= 0.50:
        return 3
    if pct >= 0.30:
        return 2
    return 1


def create_campaign(
    db: Session, *, actor_user_id: str | None, tenant_id: str, name: str,
    blueprint_id: str | None = None, target_entity_type: str = "Employee",
    target_entity_id: str | None = None,
) -> AssessmentCampaign:
    camp = AssessmentCampaign(
        tenant_id=tenant_id, blueprint_id=blueprint_id, name=name,
        target_entity_type=target_entity_type, target_entity_id=target_entity_id,
        status="PUBLISHED", created_by=actor_user_id,
    )
    db.add(camp)
    db.flush()
    append_audit(db, actor_user_id=actor_user_id, action="CREATE_CAMPAIGN",
                 entity="ax_assessment", entity_id=camp.id, after={"name": name, "blueprint": blueprint_id})
    return camp


def enroll(db: Session, *, actor_user_id: str | None, assessment_id: str, employee_id: str) -> AssessmentParticipant:
    camp = db.get(AssessmentCampaign, assessment_id)
    if not camp:
        raise ValueError("campaign not found")
    emp = db.get(Employee, employee_id)
    if not emp:
        raise ValueError("employee not found")
    p = AssessmentParticipant(
        tenant_id=camp.tenant_id, assessment_id=assessment_id, employee_id=employee_id,
        role_id=emp.current_job_id, status="INVITED")
    db.add(p)
    db.flush()
    return p


def start_attempt(db: Session, *, actor_user_id: str | None, participant_id: str) -> AssessmentAttempt:
    p = db.get(AssessmentParticipant, participant_id)
    if not p:
        raise ValueError("participant not found")
    att = AssessmentAttempt(
        tenant_id=p.tenant_id, assessment_id=p.assessment_id, participant_id=participant_id,
        start_time=datetime.now(timezone.utc), attempt_status="STARTED")
    db.add(att)
    p.status = "STARTED"
    db.flush()
    return att


def _required_levels(db: Session, blueprint_id: str | None) -> dict[str, int]:
    """competency_id → required level rank, from the blueprint (default 4)."""
    if not blueprint_id:
        return {}
    ranks = {p.id: p.level_rank for p in db.execute(select(ProficiencyLevel)).scalars().all()}
    out: dict[str, int] = {}
    for bc in db.execute(
        select(AssessmentBlueprintCompetency).where(AssessmentBlueprintCompetency.blueprint_id == blueprint_id)
    ).scalars().all():
        out[bc.competency_id] = ranks.get(bc.required_proficiency_level_id, 4)
    return out


def submit_responses(
    db: Session, *, actor_user_id: str | None, attempt_id: str, responses: list[dict],
) -> dict:
    """Score responses, persist them, and produce a per-competency result split."""
    att = db.get(AssessmentAttempt, attempt_id)
    if not att:
        raise ValueError("attempt not found")
    camp = db.get(AssessmentCampaign, att.assessment_id)
    questions = {q.id: q for q in db.execute(select(Question)).scalars().all()}
    required = _required_levels(db, camp.blueprint_id if camp else None)

    by_comp: dict[str, list[float]] = {}
    for r in responses:
        q = questions.get(r.get("question_id"))
        if not q:
            continue
        if q.kind == "MCQ":
            chosen = r.get("selected_option")
            correct = q.answer_key.get("correct") if q.answer_key else None
            auto = 1.0 if (chosen is not None and chosen == correct) else 0.0
        else:
            auto = float(r.get("score", 0.0))
        manual = r.get("manual_score")
        final = float(manual) if manual is not None else auto
        db.add(AssessmentResponse(
            tenant_id=att.tenant_id, attempt_id=attempt_id, question_id=q.id,
            response_text=r.get("response_text", ""), selected_option=r.get("selected_option"),
            attachment_evidence_id=r.get("attachment_evidence_id"),
            auto_score=auto, manual_score=manual, final_score=final))
        by_comp.setdefault(q.competency_id, []).append(final)

    employee_id = db.get(AssessmentParticipant, att.participant_id).employee_id
    results = []
    all_scores: list[float] = []
    for cid, scores in by_comp.items():
        pct = sum(scores) / len(scores) if scores else 0.0
        all_scores.extend(scores)
        req = required.get(cid, 4)
        row = AssessmentResultRow(
            tenant_id=att.tenant_id, attempt_id=attempt_id, employee_id=employee_id,
            competency_id=cid, actual_level=_level_from_pct(pct), required_level=req,
            score_percentage=round(pct * 100, 1), evidence_confidence_score=round(pct, 3),
            result_status="DRAFT")
        db.add(row)
        results.append(row)

    att.total_score = round(sum(all_scores) / len(all_scores), 3) if all_scores else 0.0
    att.system_confidence_score = att.total_score
    att.end_time = datetime.now(timezone.utc)
    att.attempt_status = "SUBMITTED"
    p = db.get(AssessmentParticipant, att.participant_id)
    p.status = "SUBMITTED"
    db.flush()
    append_audit(db, actor_user_id=actor_user_id, action="SUBMIT_ATTEMPT",
                 entity="ax_attempt", entity_id=attempt_id,
                 after={"total_score": att.total_score, "results": len(results)})
    return {"attempt_id": attempt_id, "total_score": att.total_score,
            "results": [_result_dict(r) for r in results]}


def _result_dict(r: AssessmentResultRow) -> dict:
    return {"id": r.id, "competency_id": r.competency_id, "actual_level": r.actual_level,
            "required_level": r.required_level, "score_percentage": r.score_percentage,
            "result_status": r.result_status}


def review_result(db: Session, *, actor_user_id: str | None, result_id: str, approve: bool) -> dict:
    """Approve a result → write it back to the employee's L5 competency results
    (so it flows into gaps and readiness). The human review is the governance gate."""
    row = db.get(AssessmentResultRow, result_id)
    if not row:
        raise ValueError("result not found")
    row.result_status = "APPROVED" if approve else "REVIEWED"
    if approve:
        profile = db.query(Profile).filter(Profile.employee_id == row.employee_id).one_or_none()
        if profile:
            existing = db.execute(
                select(CompetencyResult).where(
                    CompetencyResult.profile_id == profile.id,
                    CompetencyResult.competency_id == row.competency_id)
            ).scalars().first()
            if existing:
                existing.assessed_level = row.actual_level
                existing.required_level = row.required_level
                existing.confidence = row.evidence_confidence_score
                existing.status = "APPROVED"
            else:
                db.add(CompetencyResult(
                    tenant_id=row.tenant_id, profile_id=profile.id, competency_id=row.competency_id,
                    assessed_level=row.actual_level, required_level=row.required_level,
                    confidence=row.evidence_confidence_score, source="ASSESSMENT", status="APPROVED"))
    db.flush()
    append_audit(db, actor_user_id=actor_user_id, action="REVIEW_ASSESSMENT_RESULT",
                 entity="ax_result", entity_id=result_id,
                 after={"status": row.result_status, "approved": approve})
    return {"id": row.id, "result_status": row.result_status}


def review_evidence(
    db: Session, *, actor_user_id: str | None, evidence_id: str, decision: str,
    confidence_score: float = 0.0, comments: str = "",
) -> dict:
    ev = db.get(Evidence, evidence_id)
    if not ev:
        raise ValueError("evidence not found")
    rev = EvidenceReview(
        tenant_id=ev.tenant_id, evidence_id=evidence_id, reviewer_id=actor_user_id,
        review_decision=decision, confidence_score=confidence_score, comments=comments)
    db.add(rev)
    if decision == "Accepted":
        ev.confidence = max(ev.confidence, confidence_score)
    db.flush()
    append_audit(db, actor_user_id=actor_user_id, action="REVIEW_EVIDENCE",
                 entity="ev_review", entity_id=rev.id, after={"decision": decision})
    return {"id": rev.id, "evidence_id": evidence_id, "review_decision": decision}


def create_bank(db: Session, *, tenant_id: str, code: str, name_en: str, name_ar: str) -> QuestionBank:
    b = QuestionBank(tenant_id=tenant_id, code=code, name_en=name_en, name_ar=name_ar)
    db.add(b)
    db.flush()
    return b


def tag_question(db: Session, *, tenant_id: str, question_id: str, tag_type: str, tag_value: str) -> QuestionTag:
    tg = QuestionTag(tenant_id=tenant_id, question_id=question_id, tag_type=tag_type, tag_value=tag_value)
    db.add(tg)
    db.flush()
    return tg
