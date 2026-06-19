"""Strategy cascade orchestration (System Analysis §27.1, §27.2 / Phase P-J).

Objectives (corporate → employee), KPIs, objective↔competency alignment, and a
computed Strategic Readiness Gap that measures how far the workforce's actual
competency levels are from what each objective demands. Consequential writes audited.
"""
from __future__ import annotations

from statistics import mean

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.l3_l4 import Competency
from app.models.l5_l6 import CompetencyResult
from app.models.strategy import (
    ObjectiveCompetency, StrategicKpi, StrategicObjective, StrategicReadinessGap,
)
from app.services.engines.governance import append_audit


def create_objective(
    db: Session, *, actor_user_id: str | None, tenant_id: str, level: str, title_en: str,
    title_ar: str, parent_objective_id: str | None = None, owner_ref: str | None = None,
    period: str = "", weight: float = 1.0,
) -> StrategicObjective:
    o = StrategicObjective(
        tenant_id=tenant_id, level=level, title_en=title_en, title_ar=title_ar,
        parent_objective_id=parent_objective_id, owner_ref=owner_ref, period=period, weight=weight)
    db.add(o)
    db.flush()
    append_audit(db, actor_user_id=actor_user_id, action="CREATE_OBJECTIVE",
                 entity="st_objective", entity_id=o.id, after={"level": level, "title": title_en})
    return o


def add_kpi(db: Session, *, tenant_id: str, objective_id: str | None, code: str, name_en: str,
            name_ar: str, target_value: float = 0.0, current_value: float = 0.0, unit: str = "") -> StrategicKpi:
    k = StrategicKpi(tenant_id=tenant_id, objective_id=objective_id, code=code, name_en=name_en,
                     name_ar=name_ar, target_value=target_value, current_value=current_value, unit=unit)
    db.add(k)
    db.flush()
    return k


def align_competency(db: Session, *, tenant_id: str, objective_id: str, competency_id: str,
                     required_level: int = 4, weight: float = 1.0) -> ObjectiveCompetency:
    a = ObjectiveCompetency(tenant_id=tenant_id, objective_id=objective_id, competency_id=competency_id,
                            required_level=required_level, weight=weight)
    db.add(a)
    db.flush()
    return a


def compute_readiness_gap(db: Session, *, actor_user_id: str | None, objective_id: str) -> dict:
    """For each aligned competency, compare the workforce's average APPROVED
    assessed level to what the objective demands → a strategic readiness gap."""
    obj = db.get(StrategicObjective, objective_id)
    if not obj:
        raise ValueError("objective not found")
    aligns = db.execute(
        select(ObjectiveCompetency).where(ObjectiveCompetency.objective_id == objective_id)
    ).scalars().all()
    results = db.execute(select(CompetencyResult)).scalars().all()
    by_comp: dict[str, list[int]] = {}
    for r in results:
        by_comp.setdefault(r.competency_id, []).append(r.assessed_level)
    comps = {c.id: c for c in db.execute(select(Competency)).scalars().all()}

    # Replace any previous gap rows for this objective.
    for old in db.execute(
        select(StrategicReadinessGap).where(StrategicReadinessGap.objective_id == objective_id)
    ).scalars().all():
        db.delete(old)

    rows, pcts = [], []
    for a in aligns:
        levels = by_comp.get(a.competency_id, [])
        avg = round(mean(levels), 2) if levels else 0.0
        gap = round(max(0.0, a.required_level - avg), 2)
        pct = round(min(1.0, avg / a.required_level) * 100, 1) if a.required_level else 0.0
        pcts.append(pct)
        g = StrategicReadinessGap(
            tenant_id=obj.tenant_id, objective_id=objective_id, competency_id=a.competency_id,
            required_level=a.required_level, actual_avg_level=avg, gap=gap, readiness_pct=pct)
        db.add(g)
        rows.append({"competency_id": a.competency_id,
                     "competency_en": comps[a.competency_id].name_en if a.competency_id in comps else a.competency_id,
                     "required_level": a.required_level, "actual_avg_level": avg, "gap": gap, "readiness_pct": pct})
    db.flush()
    overall = round(mean(pcts), 1) if pcts else 0.0
    append_audit(db, actor_user_id=actor_user_id, action="COMPUTE_STRATEGIC_GAP",
                 entity="st_objective", entity_id=objective_id,
                 after={"overall_readiness_pct": overall, "competencies": len(rows)})
    return {"objective_id": objective_id, "overall_readiness_pct": overall, "gaps": rows}


def objective_detail(db: Session, objective_id: str) -> dict | None:
    obj = db.get(StrategicObjective, objective_id)
    if not obj:
        return None
    kpis = db.execute(select(StrategicKpi).where(StrategicKpi.objective_id == objective_id)).scalars().all()
    aligns = db.execute(select(ObjectiveCompetency).where(ObjectiveCompetency.objective_id == objective_id)).scalars().all()
    gaps = db.execute(select(StrategicReadinessGap).where(StrategicReadinessGap.objective_id == objective_id)).scalars().all()
    comps = {c.id: c for c in db.execute(select(Competency)).scalars().all()}
    return {
        "id": obj.id, "level": obj.level, "title_en": obj.title_en, "title_ar": obj.title_ar,
        "period": obj.period, "parent_objective_id": obj.parent_objective_id,
        "kpis": [{"code": k.code, "name_en": k.name_en, "name_ar": k.name_ar,
                  "target_value": k.target_value, "current_value": k.current_value, "unit": k.unit} for k in kpis],
        "competencies": [{"competency_id": a.competency_id,
                          "competency_en": comps[a.competency_id].name_en if a.competency_id in comps else a.competency_id,
                          "required_level": a.required_level, "weight": a.weight} for a in aligns],
        "readiness_gaps": [{"competency_id": g.competency_id, "required_level": g.required_level,
                            "actual_avg_level": g.actual_avg_level, "gap": g.gap,
                            "readiness_pct": g.readiness_pct} for g in gaps],
    }
