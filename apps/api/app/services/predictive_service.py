"""Predictive Readiness (System Analysis §31 Phase 4 / Phase P-F).

A deterministic, explainable projection: given an employee's latest readiness
factors and whether development is active, project where readiness lands at a
horizon by closing the competency gap. No black-box model — the drivers are
returned so the forecast is defensible (and the gateway stays swappable for a
real model later).
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.l1_l2 import Employee
from app.models.l7_l8 import Gap
from app.models.l9_gov import Nomination
from app.models.readiness import ReadinessScore
from app.services.engines.readiness_engine import ReadinessFactors, compute_readiness


def _factors_from_score(rs: ReadinessScore) -> ReadinessFactors:
    return ReadinessFactors(
        competency_score=rs.competency_score, evidence_confidence=rs.evidence_confidence,
        data_quality=rs.data_quality, risk_adjustment=rs.risk_adjustment,
        role_criticality=rs.role_criticality, recency=rs.recency,
    )


def _latest(db: Session, employee_id: str) -> ReadinessScore | None:
    return db.execute(
        select(ReadinessScore).where(
            ReadinessScore.entity_type == "EMPLOYEE", ReadinessScore.entity_id == employee_id)
        .order_by(ReadinessScore.created_at.desc())
    ).scalars().first()


def _has_active_development(db: Session, employee_id: str) -> bool:
    noms = db.execute(
        select(Nomination).where(Nomination.employee_id == employee_id)
    ).scalars().all()
    return any(n.stage in {"DURING", "AFTER"} or n.status == "IN_PROGRESS" for n in noms)


def forecast_employee(db: Session, employee_id: str, horizon_months: int = 12) -> dict:
    rs = _latest(db, employee_id)
    if not rs:
        return {"employee_id": employee_id, "current_index": None, "current_status": None,
                "projected_index": None, "projected_status": None,
                "horizon_months": horizon_months, "drivers": ["no readiness score yet"]}

    factors = _factors_from_score(rs)
    is_critical = bool(rs.breakdown.get("is_critical_role")) if isinstance(rs.breakdown, dict) else False

    # Drivers: training velocity (active development closes gaps faster), horizon, and
    # the size of the remaining competency headroom.
    active = _has_active_development(db, employee_id)
    velocity = 1.0 if active else 0.5
    horizon_factor = min(1.0, horizon_months / 12.0)
    headroom = 1.0 - factors.competency_score

    projected = ReadinessFactors(
        competency_score=min(1.0, factors.competency_score + headroom * velocity * horizon_factor),
        # evidence & recency improve as new assessments/evidence are gathered.
        evidence_confidence=min(1.0, factors.evidence_confidence + 0.10 * velocity * horizon_factor),
        data_quality=min(1.0, factors.data_quality + 0.05 * horizon_factor),
        risk_adjustment=min(1.0, factors.risk_adjustment + 0.10 * velocity * horizon_factor),
        role_criticality=factors.role_criticality,
        recency=min(1.0, max(factors.recency, 0.8)),  # a fresh reassessment at the horizon
    )
    now = compute_readiness(factors, is_critical_role=is_critical)
    fut = compute_readiness(projected, is_critical_role=is_critical)
    drivers = [
        f"active development: {'yes' if active else 'planned'}",
        f"competency headroom: {round(headroom * 100)}%",
        f"horizon: {horizon_months} months",
    ]
    return {
        "employee_id": employee_id,
        "current_index": now["readiness_index"], "current_status": now["readiness_status"],
        "projected_index": fut["readiness_index"], "projected_status": fut["readiness_status"],
        "horizon_months": horizon_months, "drivers": drivers,
    }


def pipeline_forecast(db: Session, horizon_months: int = 12) -> dict:
    emp_ids = [
        r.entity_id for r in db.execute(
            select(ReadinessScore).where(ReadinessScore.entity_type == "EMPLOYEE")
        ).scalars().all()
    ]
    seen: set[str] = set()
    current_ready = projected_ready = assessed = 0
    for eid in emp_ids:
        if eid in seen:
            continue
        seen.add(eid)
        f = forecast_employee(db, eid, horizon_months)
        if f["current_index"] is None:
            continue
        assessed += 1
        if f["current_status"] == "READY":
            current_ready += 1
        if f["projected_status"] == "READY":
            projected_ready += 1
    open_gaps = sum(1 for g in db.execute(select(Gap)).scalars().all() if g.gap_size > 0)
    return {
        "assessed_employees": assessed,
        "current_ready": current_ready,
        "projected_ready": projected_ready,
        "projected_uplift": projected_ready - current_ready,
        "open_gaps": open_gaps,
        "horizon_months": horizon_months,
    }
