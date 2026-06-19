"""Talent, succession & knowledge-continuity orchestration (System Analysis §16 / Phase P-E).

Succession ranks candidates for a critical role by their multi-factor readiness
(P-D) and their remaining gaps against that role's approved competency profile
(P-B). Building a plan opens a governance decision (succession is a consequential
workforce call — human-in-the-loop) and every write is audited.
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.competency_v2 import ProficiencyLevel, RoleCompetencyRequirement
from app.models.l1_l2 import Employee, Job
from app.models.l5_l6 import CompetencyResult, CriticalRole, Profile
from app.models.talent import (
    KnowledgeHolder, KnowledgeTransferPlan, SuccessionPlan, SuccessorCandidate, TalentProfile,
)
from app.services import readiness_service
from app.services.blueprint_service import latest_approved_profile
from app.services.engines.governance import append_audit, open_decision

# Readiness statuses that count toward a role's usable bench.
_BENCH = {"READY", "READY_MINOR_GAPS", "SUCCESSION_CANDIDATE", "HIGH_POTENTIAL"}
_MAX_CANDIDATES = 8


def _emp_assessed_levels(db: Session, employee_id: str) -> dict[str, int]:
    profile = db.query(Profile).filter(Profile.employee_id == employee_id).one_or_none()
    if not profile:
        return {}
    rows = db.execute(
        select(CompetencyResult).where(CompetencyResult.profile_id == profile.id)
    ).scalars().all()
    levels: dict[str, int] = {}
    for r in rows:
        levels[r.competency_id] = max(levels.get(r.competency_id, 0), r.assessed_level)
    return levels


def _gaps_against_role(db: Session, employee_id: str, job_id: str, level_rank: dict[str, int]) -> tuple[int, int]:
    """Return (remaining_gaps, total_gap_size) vs the target role's approved profile."""
    profile = latest_approved_profile(db, job_id)
    if not profile:
        return (0, 0)
    reqs = db.execute(
        select(RoleCompetencyRequirement).where(RoleCompetencyRequirement.profile_id == profile.id)
    ).scalars().all()
    actual = _emp_assessed_levels(db, employee_id)
    gaps = total = 0
    for r in reqs:
        req_rank = level_rank.get(r.required_proficiency_level_id, 3)
        have = actual.get(r.competency_id, 0)
        if have < req_rank:
            gaps += 1
            total += req_rank - have
    return (gaps, total)


def build_succession_plan(db: Session, *, actor_user_id: str | None, job_id: str) -> dict:
    """Rank candidates for a critical role by readiness + remaining gaps."""
    job = db.get(Job, job_id)
    if not job:
        raise ValueError("job not found")

    level_rank = {p.id: p.level_rank for p in db.execute(select(ProficiencyLevel)).scalars().all()}
    employees = db.execute(select(Employee)).scalars().all()
    incumbents = {e.id for e in employees if e.current_job_id == job_id}

    scored: list[dict] = []
    for emp in employees:
        if emp.id in incumbents:
            continue
        rs = readiness_service.latest_for(db, "EMPLOYEE", emp.id)
        idx = rs.readiness_index if rs else 0.0
        status = rs.readiness_status if rs else "EVIDENCE_INSUFFICIENT"
        gaps, total_gap = _gaps_against_role(db, emp.id, job_id, level_rank)
        scored.append({
            "employee_id": emp.id, "name_en": emp.full_name_en, "name_ar": emp.full_name_ar,
            "readiness_index": idx, "readiness_status": status,
            "remaining_gaps": gaps, "time_to_ready_months": total_gap * 3,
        })
    # Best first: higher readiness, then fewer remaining gaps.
    scored.sort(key=lambda c: (-c["readiness_index"], c["remaining_gaps"]))
    scored = scored[:_MAX_CANDIDATES]

    bench = sum(1 for c in scored if c["readiness_status"] in _BENCH)
    ready_now = sum(1 for c in scored if c["readiness_status"] == "READY")

    plan = SuccessionPlan(
        tenant_id=job.tenant_id, job_id=job_id,
        plan_name=f"{job.title_en} — Succession Plan", bench_strength=bench,
        ready_now=ready_now, candidate_count=len(scored), approval_status="UNDER_REVIEW",
    )
    db.add(plan)
    db.flush()

    for i, c in enumerate(scored, start=1):
        db.add(SuccessorCandidate(
            tenant_id=job.tenant_id, plan_id=plan.id, employee_id=c["employee_id"],
            readiness_index=c["readiness_index"], readiness_status=c["readiness_status"],
            remaining_gaps=c["remaining_gaps"], time_to_ready_months=c["time_to_ready_months"],
            rank=i, recommendation_status="PENDING",
        ))

    top = scored[0] if scored else None
    open_decision(
        db, tenant_id=job.tenant_id, kind="SUCCESSION",
        subject_ref=f"succession_plan:{plan.id}",
        ai_recommendation=(f"Top candidate: {top['name_en']} (readiness {top['readiness_index']})"
                           if top else "No eligible candidates"),
        confidence=round((top["readiness_index"] / 100.0) if top else 0.0, 4),
    )
    append_audit(db, actor_user_id=actor_user_id, action="BUILD_SUCCESSION_PLAN",
                 entity="tal_succession_plan", entity_id=plan.id,
                 after={"job_id": job_id, "candidates": len(scored), "bench_strength": bench})
    return serialize_plan(db, plan)


def serialize_plan(db: Session, plan: SuccessionPlan) -> dict:
    cands = db.execute(
        select(SuccessorCandidate).where(SuccessorCandidate.plan_id == plan.id)
        .order_by(SuccessorCandidate.rank)
    ).scalars().all()
    names = {e.id: e for e in db.execute(select(Employee)).scalars().all()}
    return {
        "id": plan.id, "job_id": plan.job_id, "plan_name": plan.plan_name,
        "bench_strength": plan.bench_strength, "ready_now": plan.ready_now,
        "candidate_count": plan.candidate_count, "approval_status": plan.approval_status,
        "candidates": [
            {"id": c.id, "employee_id": c.employee_id,
             "name_en": names[c.employee_id].full_name_en if c.employee_id in names else c.employee_id,
             "name_ar": names[c.employee_id].full_name_ar if c.employee_id in names else c.employee_id,
             "readiness_index": c.readiness_index, "readiness_status": c.readiness_status,
             "remaining_gaps": c.remaining_gaps, "time_to_ready_months": c.time_to_ready_months,
             "rank": c.rank, "recommendation_status": c.recommendation_status}
            for c in cands
        ],
    }


def decide_successor(db: Session, *, actor_user_id: str | None, candidate_id: str, approve: bool) -> dict:
    cand = db.get(SuccessorCandidate, candidate_id)
    if not cand:
        raise ValueError("candidate not found")
    cand.recommendation_status = "APPROVED" if approve else "REJECTED"
    append_audit(db, actor_user_id=actor_user_id, action="SUCCESSOR_DECISION",
                 entity="tal_successor", entity_id=cand.id,
                 after={"status": cand.recommendation_status})
    return {"id": cand.id, "recommendation_status": cand.recommendation_status}


def flag_talent(
    db: Session, *, actor_user_id: str | None, employee_id: str,
    talent_segment: str, potential_rating: str = "MED", notes: str = "",
) -> dict:
    emp = db.get(Employee, employee_id)
    if not emp:
        raise ValueError("employee not found")
    rs = readiness_service.latest_for(db, "EMPLOYEE", employee_id)
    prof = db.execute(
        select(TalentProfile).where(TalentProfile.employee_id == employee_id)
    ).scalars().first()
    if not prof:
        prof = TalentProfile(tenant_id=emp.tenant_id, employee_id=employee_id)
        db.add(prof)
    prof.talent_segment = talent_segment
    prof.potential_rating = potential_rating
    prof.notes = notes
    prof.flagged_by = actor_user_id
    prof.readiness_status = rs.readiness_status if rs else ""
    db.flush()
    append_audit(db, actor_user_id=actor_user_id, action="FLAG_TALENT",
                 entity="tal_profile", entity_id=prof.id,
                 after={"employee_id": employee_id, "segment": talent_segment})
    return {"id": prof.id, "employee_id": employee_id, "talent_segment": prof.talent_segment,
            "potential_rating": prof.potential_rating, "readiness_status": prof.readiness_status}


def register_knowledge_holder(
    db: Session, *, actor_user_id: str | None, employee_id: str, knowledge_domain: str,
    criticality: str = "HIGH", retirement_risk: float = 0.0,
) -> dict:
    emp = db.get(Employee, employee_id)
    if not emp:
        raise ValueError("employee not found")
    kh = KnowledgeHolder(
        tenant_id=emp.tenant_id, employee_id=employee_id, knowledge_domain=knowledge_domain,
        criticality=criticality, retirement_risk=retirement_risk,
    )
    db.add(kh)
    db.flush()
    append_audit(db, actor_user_id=actor_user_id, action="REGISTER_KNOWLEDGE_HOLDER",
                 entity="tal_knowledge_holder", entity_id=kh.id,
                 after={"employee_id": employee_id, "domain": knowledge_domain})
    return {"id": kh.id, "employee_id": employee_id, "knowledge_domain": kh.knowledge_domain,
            "criticality": kh.criticality, "retirement_risk": kh.retirement_risk,
            "transfer_status": kh.transfer_status}


def create_transfer_plan(
    db: Session, *, actor_user_id: str | None, knowledge_holder_id: str, plan_name: str,
    successor_employee_id: str | None = None, mentoring_flag: bool = True,
) -> dict:
    kh = db.get(KnowledgeHolder, knowledge_holder_id)
    if not kh:
        raise ValueError("knowledge holder not found")
    plan = KnowledgeTransferPlan(
        tenant_id=kh.tenant_id, knowledge_holder_id=knowledge_holder_id, plan_name=plan_name,
        successor_employee_id=successor_employee_id, mentoring_flag=mentoring_flag, status="ACTIVE",
    )
    db.add(plan)
    kh.transfer_status = "IN_PROGRESS"
    db.flush()
    append_audit(db, actor_user_id=actor_user_id, action="CREATE_KT_PLAN",
                 entity="tal_kt_plan", entity_id=plan.id,
                 after={"knowledge_holder_id": knowledge_holder_id, "plan_name": plan_name})
    return {"id": plan.id, "knowledge_holder_id": knowledge_holder_id, "plan_name": plan.plan_name,
            "mentoring_flag": plan.mentoring_flag, "status": plan.status}


def critical_roles(db: Session) -> list[dict]:
    crit = db.execute(select(CriticalRole)).scalars().all()
    jobs = {j.id: j for j in db.execute(select(Job)).scalars().all()}
    plans = db.execute(select(SuccessionPlan)).scalars().all()
    latest_plan: dict[str, SuccessionPlan] = {}
    for p in plans:
        cur = latest_plan.get(p.job_id)
        if not cur or (p.created_at and cur.created_at and p.created_at > cur.created_at):
            latest_plan[p.job_id] = p
    out = []
    for c in crit:
        job = jobs.get(c.job_id)
        plan = latest_plan.get(c.job_id)
        out.append({
            "job_id": c.job_id, "job_code": job.code if job else c.job_id,
            "title_en": job.title_en if job else c.job_id, "title_ar": job.title_ar if job else c.job_id,
            "criticality": c.criticality, "loss_risk": c.loss_risk, "business_impact": c.business_impact,
            "bench_strength": plan.bench_strength if plan else 0,
            "ready_now": plan.ready_now if plan else 0,
            "has_plan": plan is not None,
        })
    return out


def talent_pipeline(db: Session) -> dict:
    profiles = db.execute(select(TalentProfile)).scalars().all()
    by_segment: dict[str, int] = {}
    for p in profiles:
        by_segment[p.talent_segment] = by_segment.get(p.talent_segment, 0) + 1
    crit = db.execute(select(CriticalRole)).scalars().all()
    plans = db.execute(select(SuccessionPlan)).scalars().all()
    covered = {p.job_id for p in plans if p.bench_strength > 0}
    holders = db.execute(select(KnowledgeHolder)).scalars().all()
    return {
        "talent_profiles": len(profiles),
        "by_segment": [{"segment": k, "count": v} for k, v in sorted(by_segment.items())],
        "critical_roles_total": len(crit),
        "critical_roles_covered": len([c for c in crit if c.job_id in covered]),
        "knowledge_holders": len(holders),
        "knowledge_at_risk": len([h for h in holders if h.retirement_risk >= 0.6]),
    }
