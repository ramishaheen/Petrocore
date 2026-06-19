"""Governed Assessment-Blueprint engine (System Analysis §2.6 / Phase P-C).

A blueprint is the *approved template* that makes an assessment non-random: it is
derived from the role's latest APPROVED competency profile, pinning competencies,
required proficiency levels, weights, question counts, evidence flags and rules.
It is the bridge between "what the role requires" (P-B) and "what we ask" (P-C).
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assessment_v2 import (
    AssessmentBlueprint, AssessmentBlueprintCompetency, AssessmentBlueprintRule, ScoringRubric,
)
from app.models.competency_v2 import RoleCompetencyProfile, RoleCompetencyRequirement
from app.models.l1_l2 import Job
from app.services.engines.governance import append_audit

# Criticality → how many questions to draw for that competency.
_QUESTION_COUNT_BY_CRITICALITY = {"VERY_HIGH": 5, "HIGH": 4, "MED": 3, "LOW": 2}


def latest_approved_profile(db: Session, job_id: str) -> RoleCompetencyProfile | None:
    return db.execute(
        select(RoleCompetencyProfile)
        .where(
            RoleCompetencyProfile.job_id == job_id,
            RoleCompetencyProfile.approval_status == "APPROVED",
        )
        .order_by(RoleCompetencyProfile.profile_version.desc())
    ).scalars().first()


def _default_rubric_id(db: Session) -> str | None:
    rubric = db.execute(
        select(ScoringRubric).where(ScoringRubric.status == "ACTIVE").order_by(ScoringRubric.code)
    ).scalars().first()
    return rubric.id if rubric else None


def create_blueprint_from_job(
    db: Session,
    *,
    actor_user_id: str | None,
    job_id: str,
    assessment_purpose: str = "Baseline",
) -> AssessmentBlueprint:
    """Build a DRAFT blueprint from a job's latest APPROVED competency profile.

    Raises ValueError when the job has no approved profile to derive from — a
    blueprint must never be built on an unapproved (mutable) matrix.
    """
    job = db.get(Job, job_id)
    if not job:
        raise ValueError("job not found")
    profile = latest_approved_profile(db, job_id)
    if not profile:
        raise ValueError("job has no APPROVED competency profile to derive a blueprint from")

    reqs = db.execute(
        select(RoleCompetencyRequirement).where(RoleCompetencyRequirement.profile_id == profile.id)
    ).scalars().all()

    existing = db.execute(
        select(AssessmentBlueprint).where(AssessmentBlueprint.job_id == job_id)
    ).scalars().all()
    version = max((b.version for b in existing), default=0) + 1

    blueprint = AssessmentBlueprint(
        tenant_id=profile.tenant_id, code=f"{job.code}-BP-v{version}",
        name=f"{job.title_en} — Assessment Blueprint", job_id=job_id,
        assessment_purpose=assessment_purpose, scoring_rubric_id=_default_rubric_id(db),
        approval_status="DRAFT", version=version,
    )
    db.add(blueprint)
    db.flush()

    any_evidence_required = False
    for r in reqs:
        evidence_required = bool(r.evidence_required_flag)
        any_evidence_required = any_evidence_required or evidence_required
        db.add(AssessmentBlueprintCompetency(
            tenant_id=profile.tenant_id, blueprint_id=blueprint.id, competency_id=r.competency_id,
            required_proficiency_level_id=r.required_proficiency_level_id, weight=r.weight,
            question_count=_QUESTION_COUNT_BY_CRITICALITY.get(r.criticality_level, 3),
            evidence_required_flag=evidence_required,
        ))

    # Default governing rules — every blueprint is time-bound, randomized and reviewer-gated.
    rules = [
        ("TimeLimit", "60"),
        ("Randomization", "true"),
        ("ReviewerRequired", "SME"),
    ]
    if any_evidence_required:
        rules.append(("EvidenceRequired", "true"))
    for rule_type, rule_value in rules:
        db.add(AssessmentBlueprintRule(
            tenant_id=profile.tenant_id, blueprint_id=blueprint.id,
            rule_type=rule_type, rule_value=rule_value,
        ))

    append_audit(
        db, actor_user_id=actor_user_id, action="CREATE_BLUEPRINT",
        entity="ab_blueprint", entity_id=blueprint.id,
        after={"job_id": job_id, "profile_id": profile.id, "version": version,
               "competencies": len(reqs)},
    )
    return blueprint


def submit_for_approval(db: Session, blueprint: AssessmentBlueprint, *, actor_user_id: str | None) -> None:
    blueprint.approval_status = "UNDER_REVIEW"
    append_audit(db, actor_user_id=actor_user_id, action="SUBMIT_BLUEPRINT",
                 entity="ab_blueprint", entity_id=blueprint.id, after={"status": "UNDER_REVIEW"})


def approve(db: Session, blueprint: AssessmentBlueprint, *, actor_user_id: str | None, publish: bool = False) -> None:
    blueprint.approval_status = "PUBLISHED" if publish else "APPROVED"
    append_audit(db, actor_user_id=actor_user_id, action="APPROVE_BLUEPRINT",
                 entity="ab_blueprint", entity_id=blueprint.id,
                 after={"status": blueprint.approval_status})
