"""Workforce Planning Intelligence (System Analysis §24 / Phase P-F).

Read-only analytics linking readiness to planning: supply vs demand by workforce
family, critical-role coverage, retirement risk, and training demand. Aggregates
existing data (jobs, employees, readiness, gaps, succession, knowledge holders) —
no new persistence.
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.l1_l2 import Employee, Job
from app.models.l3_l4 import Competency
from app.models.l5_l6 import CriticalRole
from app.models.l7_l8 import Gap
from app.models.readiness import ReadinessScore
from app.models.talent import KnowledgeHolder, SuccessionPlan

_READY = {"READY", "READY_MINOR_GAPS"}


def _latest_employee_readiness(db: Session) -> dict[str, ReadinessScore]:
    rows = db.execute(
        select(ReadinessScore).where(ReadinessScore.entity_type == "EMPLOYEE")
        .order_by(ReadinessScore.created_at.desc())
    ).scalars().all()
    latest: dict[str, ReadinessScore] = {}
    for r in rows:
        latest.setdefault(r.entity_id, r)
    return latest


def supply_demand(db: Session) -> list[dict]:
    """Per workforce family (job_family): headcount supply and ready coverage."""
    jobs = {j.id: j for j in db.execute(select(Job)).scalars().all()}
    employees = db.execute(select(Employee)).scalars().all()
    readiness = _latest_employee_readiness(db)

    fam: dict[str, dict] = {}
    for j in jobs.values():
        f = fam.setdefault(j.job_family or "Unassigned", {"family": j.job_family or "Unassigned",
                                                          "roles": 0, "headcount": 0, "ready": 0})
        f["roles"] += 1
    for e in employees:
        job = jobs.get(e.current_job_id) if e.current_job_id else None
        key = (job.job_family if job else None) or "Unassigned"
        f = fam.setdefault(key, {"family": key, "roles": 0, "headcount": 0, "ready": 0})
        f["headcount"] += 1
        rs = readiness.get(e.id)
        if rs and rs.readiness_status in _READY:
            f["ready"] += 1
    out = []
    for f in fam.values():
        hc = f["headcount"]
        f["ready_pct"] = round(100 * f["ready"] / hc, 1) if hc else 0.0
        out.append(f)
    return sorted(out, key=lambda x: -x["headcount"])


def critical_role_coverage(db: Session) -> list[dict]:
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
        bench = plan.bench_strength if plan else 0
        out.append({
            "job_id": c.job_id, "title_en": job.title_en if job else c.job_id,
            "title_ar": job.title_ar if job else c.job_id, "criticality": c.criticality,
            "loss_risk": c.loss_risk, "bench_strength": bench,
            "ready_now": plan.ready_now if plan else 0,
            "coverage": "COVERED" if bench > 0 else "AT_RISK",
        })
    return sorted(out, key=lambda x: (x["coverage"] != "AT_RISK", -x["loss_risk"]))


def retirement_risk(db: Session) -> list[dict]:
    holders = db.execute(select(KnowledgeHolder)).scalars().all()
    names = {e.id: e for e in db.execute(select(Employee)).scalars().all()}
    out = [
        {"id": h.id, "employee_id": h.employee_id,
         "name_en": names[h.employee_id].full_name_en if h.employee_id in names else h.employee_id,
         "name_ar": names[h.employee_id].full_name_ar if h.employee_id in names else h.employee_id,
         "knowledge_domain": h.knowledge_domain, "criticality": h.criticality,
         "retirement_risk": h.retirement_risk, "transfer_status": h.transfer_status}
        for h in holders
    ]
    return sorted(out, key=lambda x: -x["retirement_risk"])


def training_demand(db: Session) -> list[dict]:
    gaps = [g for g in db.execute(select(Gap)).scalars().all() if g.gap_size > 0]
    comps = {c.id: c for c in db.execute(select(Competency)).scalars().all()}
    by_comp: dict[str, dict] = {}
    for g in gaps:
        d = by_comp.setdefault(g.competency_id, {
            "competency_id": g.competency_id,
            "competency_en": comps[g.competency_id].name_en if g.competency_id in comps else g.competency_id,
            "competency_ar": comps[g.competency_id].name_ar if g.competency_id in comps else g.competency_id,
            "learners": 0, "total_gap": 0, "very_high": 0})
        d["learners"] += 1
        d["total_gap"] += g.gap_size
        if g.priority == "VERY_HIGH":
            d["very_high"] += 1
    return sorted(by_comp.values(), key=lambda x: -x["total_gap"])


def overview(db: Session) -> dict:
    employees = db.execute(select(Employee)).scalars().all()
    readiness = _latest_employee_readiness(db)
    ready = sum(1 for e in employees if (readiness.get(e.id) and readiness[e.id].readiness_status in _READY))
    coverage = critical_role_coverage(db)
    holders = db.execute(select(KnowledgeHolder)).scalars().all()
    demand = training_demand(db)
    total = len(employees)
    return {
        "total_employees": total,
        "ready_employees": ready,
        "ready_pct": round(100 * ready / total, 1) if total else 0.0,
        "critical_roles": len(coverage),
        "critical_roles_covered": sum(1 for c in coverage if c["coverage"] == "COVERED"),
        "critical_roles_at_risk": sum(1 for c in coverage if c["coverage"] == "AT_RISK"),
        "open_training_needs": sum(d["learners"] for d in demand),
        "knowledge_holders": len(holders),
        "knowledge_at_risk": sum(1 for h in holders if h.retirement_risk >= 0.6),
    }
