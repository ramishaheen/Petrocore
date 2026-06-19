"""Operational & asset context orchestration (System Analysis §27.3 / Phase P-I).

Thin creators for the asset/operations backbone plus a competency-exposure
analytic that ties critical tasks to the competencies (and readiness) that
de-risk them. Consequential creates (equipment, critical task) are audited.
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.l3_l4 import Competency
from app.models.l5_l6 import CompetencyResult
from app.models.operations import CriticalTask, Equipment, Procedure, ProcessUnit, Site, TaskRisk
from app.services.engines.governance import append_audit

_READY_MIN_RATIO = 1.0  # assessed ≥ required ⇒ "covered" for a task's competency


def create_site(db: Session, *, tenant_id: str, code: str, name_en: str, name_ar: str,
                activity_segment: str | None = None) -> Site:
    s = Site(tenant_id=tenant_id, code=code, name_en=name_en, name_ar=name_ar, activity_segment=activity_segment)
    db.add(s)
    db.flush()
    return s


def create_process_unit(db: Session, *, tenant_id: str, site_id: str, code: str, name_en: str, name_ar: str) -> ProcessUnit:
    u = ProcessUnit(tenant_id=tenant_id, site_id=site_id, code=code, name_en=name_en, name_ar=name_ar)
    db.add(u)
    db.flush()
    return u


def create_equipment(db: Session, *, actor_user_id: str | None, tenant_id: str, tag: str, name_en: str,
                     name_ar: str, equipment_type: str = "", criticality: str = "MED",
                     risk_level: str = "MED", process_unit_id: str | None = None) -> Equipment:
    e = Equipment(tenant_id=tenant_id, process_unit_id=process_unit_id, tag=tag, name_en=name_en,
                  name_ar=name_ar, equipment_type=equipment_type, criticality=criticality, risk_level=risk_level)
    db.add(e)
    db.flush()
    append_audit(db, actor_user_id=actor_user_id, action="CREATE_EQUIPMENT",
                 entity="op_equipment", entity_id=e.id, after={"tag": tag, "criticality": criticality})
    return e


def create_procedure(db: Session, *, tenant_id: str, code: str, title_en: str, title_ar: str,
                     procedure_type: str = "SOP") -> Procedure:
    p = Procedure(tenant_id=tenant_id, code=code, title_en=title_en, title_ar=title_ar, procedure_type=procedure_type)
    db.add(p)
    db.flush()
    return p


def create_critical_task(db: Session, *, actor_user_id: str | None, tenant_id: str, name_en: str, name_ar: str,
                         competency_id: str | None = None, equipment_id: str | None = None,
                         procedure_id: str | None = None, criticality: str = "HIGH") -> CriticalTask:
    t = CriticalTask(tenant_id=tenant_id, name_en=name_en, name_ar=name_ar, competency_id=competency_id,
                     equipment_id=equipment_id, procedure_id=procedure_id, criticality=criticality)
    db.add(t)
    db.flush()
    append_audit(db, actor_user_id=actor_user_id, action="CREATE_CRITICAL_TASK",
                 entity="op_critical_task", entity_id=t.id, after={"name": name_en, "competency": competency_id})
    return t


def add_task_risk(db: Session, *, tenant_id: str, critical_task_id: str, risk_type: str = "Safety",
                  severity: float = 0.5, likelihood: float = 0.5, mitigation: str = "") -> TaskRisk:
    r = TaskRisk(tenant_id=tenant_id, critical_task_id=critical_task_id, risk_type=risk_type,
                 severity=severity, likelihood=likelihood, mitigation=mitigation)
    db.add(r)
    db.flush()
    return r


def competency_exposure(db: Session) -> list[dict]:
    """For each critical task with a required competency: how many employees are
    'covered' (an APPROVED result meeting the required level) — the asset-readiness
    link between operations and the competency engine."""
    tasks = db.execute(select(CriticalTask)).scalars().all()
    comps = {c.id: c for c in db.execute(select(Competency)).scalars().all()}
    results = db.execute(select(CompetencyResult)).scalars().all()
    covered_by_comp: dict[str, int] = {}
    for r in results:
        if r.required_level > 0 and r.assessed_level / r.required_level >= _READY_MIN_RATIO:
            covered_by_comp[r.competency_id] = covered_by_comp.get(r.competency_id, 0) + 1
    risks = db.execute(select(TaskRisk)).scalars().all()
    risk_count: dict[str, int] = {}
    for rk in risks:
        risk_count[rk.critical_task_id] = risk_count.get(rk.critical_task_id, 0) + 1
    out = []
    for t in tasks:
        out.append({
            "task_id": t.id, "name_en": t.name_en, "name_ar": t.name_ar, "criticality": t.criticality,
            "competency_id": t.competency_id,
            "competency_en": comps[t.competency_id].name_en if t.competency_id in comps else None,
            "covered_employees": covered_by_comp.get(t.competency_id, 0) if t.competency_id else 0,
            "risk_count": risk_count.get(t.id, 0),
        })
    return out
