"""L9 · Learning Governance Engine — Before / During / After lifecycle.

Training starts from a verified gap and ends with measured impact written back
to the Employee 360° Profile and Readiness Index.
"""
from __future__ import annotations

from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.l3_l4 import Competency
from app.models.l5_l6 import CompetencyResult, Profile
from app.models.l7_l8 import Gap
from app.models.l9_gov import Nomination, Program, TrainingImpact, TrainingNeed
from app.services.engines.governance import append_audit


# ---------------------------------------------------------------- BEFORE
def derive_needs(db: Session, *, tenant_id: str, min_priority: str = "HIGH") -> list[dict]:
    """Verified gaps → training needs (never a generic course title)."""
    rank = {"MEDIUM": 0, "HIGH": 1, "VERY_HIGH": 2}
    threshold = rank.get(min_priority, 1)
    # Only real gaps (gap_size > 0); unknown priorities sort lowest rather than crashing.
    gaps = [g for g in db.execute(select(Gap)).scalars().all()
            if g.gap_size > 0 and rank.get(g.priority, -1) >= threshold]
    created = []
    for g in gaps:
        need = TrainingNeed(
            tenant_id=tenant_id, gap_id=g.id, competency_id=g.competency_id,
            target_level=g.target_level, priority=g.priority,
        )
        db.add(need)
        db.flush()
        created.append({"need_id": need.id, "competency_id": g.competency_id,
                        "target_level": g.target_level, "priority": g.priority,
                        "subject_id": g.subject_id})
    db.commit()
    return created


def group_learners(db: Session) -> list[dict]:
    """Group learners by (competency, target level) similarity → directed cohorts."""
    needs = db.execute(select(TrainingNeed)).scalars().all()
    gaps = {g.id: g for g in db.execute(select(Gap)).scalars().all()}
    cohorts: dict[tuple, list[str]] = defaultdict(list)
    for n in needs:
        gap = gaps.get(n.gap_id)
        if gap:
            cohorts[(n.competency_id, n.target_level)].append(gap.subject_id)
    return [
        {"competency_id": cid, "target_level": lvl, "learners": sorted(set(subjects)),
         "size": len(set(subjects))}
        for (cid, lvl), subjects in cohorts.items()
    ]


def design_program(db: Session, *, tenant_id: str, competency_id: str, target_level: int,
                   method: str = "BLENDED", provider: str = "Murzuq Academy",
                   impact_kpi: str = "Readiness Index uplift") -> dict:
    comp = db.get(Competency, competency_id)
    name_en = comp.name_en if comp else competency_id
    name_ar = comp.name_ar if comp else competency_id
    prog = Program(
        tenant_id=tenant_id,
        title_en=f"{name_en} — Level {target_level} Development",
        title_ar=f"{name_ar} — تطوير المستوى {target_level}",
        method=method, provider=provider,
        target_group=f"Gap cohort: {name_en} → L{target_level}", impact_kpi=impact_kpi,
    )
    db.add(prog)
    db.commit()
    return {"program_id": prog.id, "title_en": prog.title_en, "title_ar": prog.title_ar,
            "method": prog.method, "provider": prog.provider, "impact_kpi": prog.impact_kpi}


def nominate(db: Session, *, tenant_id: str, employee_id: str, program_id: str,
             gap_id: str | None = None) -> dict:
    nom = Nomination(tenant_id=tenant_id, employee_id=employee_id, program_id=program_id,
                     gap_id=gap_id, stage="BEFORE", status="NOMINATED")
    db.add(nom)
    db.commit()
    return {"nomination_id": nom.id, "stage": nom.stage, "status": nom.status}


# ---------------------------------------------------------------- DURING
def advance_stage(db: Session, *, nomination_id: str, stage: str, status: str) -> dict:
    """Move a nomination through BEFORE → DURING → AFTER with monitoring status."""
    nom = db.get(Nomination, nomination_id)
    if not nom:
        return {"error": "nomination not found"}
    nom.stage = stage
    nom.status = status
    db.commit()
    return {"nomination_id": nom.id, "stage": nom.stage, "status": nom.status}


# ---------------------------------------------------------------- AFTER
def measure_impact(db: Session, *, actor_user_id: str, tenant_id: str, nomination_id: str,
                   pre_level: int, post_level: int, performance_link: str = "") -> dict:
    """Impact = pre/post level + gap closure; write back to profile & readiness."""
    nom = db.get(Nomination, nomination_id)
    if not nom:
        return {"error": "nomination not found"}

    # The gap this nomination targets defines the competency + required (target) level.
    gap = db.get(Gap, nom.gap_id) if nom.gap_id else None
    target = gap.target_level if gap else max(pre_level + 1, post_level)
    denom = target - pre_level
    # Gap closure as a share of the gap that existed before training, clamped to [0, 100].
    closure = round(max(0.0, min(100.0, 100 * (post_level - pre_level) / denom)), 1) if denom > 0 else 0.0

    impact = TrainingImpact(
        tenant_id=tenant_id, nomination_id=nomination_id, pre_level=pre_level,
        post_level=post_level, gap_closure_pct=closure, performance_link=performance_link,
    )
    db.add(impact)
    db.flush()  # populate impact.id before it is referenced by the audit log
    nom.stage = "AFTER"
    nom.status = "COMPLETED"

    # Write back: bump ONLY the trained competency, then recompute readiness.
    profile = db.query(Profile).filter(Profile.employee_id == nom.employee_id).one_or_none()
    if profile:
        results = db.execute(
            select(CompetencyResult).where(CompetencyResult.profile_id == profile.id)
        ).scalars().all()
        target_competency = gap.competency_id if gap else None
        for r in results:
            if r.competency_id == target_competency and post_level > r.assessed_level:
                r.assessed_level = post_level
        if results:
            ratios = [min(1.0, r.assessed_level / r.required_level) for r in results if r.required_level]
            if ratios:
                profile.readiness_index = round(100 * sum(ratios) / len(ratios), 1)

    # Retire the closed gap so it isn't re-nominated by /gaps, dashboards, or
    # /training/needs (those treat gap_size > 0 as open).
    if gap:
        gap.current_level = max(gap.current_level, post_level)
        gap.gap_size = max(0, gap.target_level - gap.current_level)

    append_audit(db, actor_user_id=actor_user_id, action="TRAINING_IMPACT",
                 entity="l9_impact", entity_id=impact.id,
                 after={"pre": pre_level, "post": post_level, "closure_pct": closure})
    db.commit()
    return {"impact_id": impact.id, "pre_level": pre_level, "post_level": post_level,
            "gap_closure_pct": closure,
            "new_readiness_index": profile.readiness_index if profile else None}
