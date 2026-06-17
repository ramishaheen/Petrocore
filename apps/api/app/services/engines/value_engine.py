"""Institutional Value Engine (§10/§12) — rolls up the 6 value dimensions.

Readiness Visibility · Risk Control · Training ROI · Succession Strength ·
Decision Speed · Fairness & Transparency.
"""
from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.l5_l6 import CriticalRole, Profile
from app.models.l7_l8 import Gap
from app.models.l9_gov import GovDecision, TrainingImpact

DIMENSIONS = [
    ("readiness_visibility", "Readiness Visibility", "وضوح الجاهزية"),
    ("risk_control", "Risk Control", "ضبط المخاطر"),
    ("training_roi", "Training ROI", "عائد التدريب"),
    ("succession_strength", "Succession Strength", "قوة الإحلال"),
    ("decision_speed", "Decision Speed", "سرعة القرار"),
    ("fairness_transparency", "Fairness & Transparency", "العدالة والشفافية"),
]


def compute(db: Session) -> dict:
    profiles = db.execute(select(Profile)).scalars().all()
    assessed = [p for p in profiles if p.readiness_index > 0]
    crit = db.execute(select(CriticalRole)).scalars().all()
    at_risk = [c for c in crit if c.loss_risk >= 0.6]
    impacts = db.execute(select(TrainingImpact)).scalars().all()
    decisions = db.execute(select(GovDecision)).scalars().all()
    resolved = [d for d in decisions if d.governance_status != "PENDING_REVIEW"]

    visibility = round(100 * len(assessed) / len(profiles), 1) if profiles else 0.0
    risk_control = round(100 * (1 - len(at_risk) / len(crit)), 1) if crit else 0.0
    roi = round(sum(i.gap_closure_pct for i in impacts) / len(impacts), 1) if impacts else 0.0
    ready = [p for p in profiles if p.readiness_index >= 75]
    succession = round(100 * len(ready) / len(crit), 1) if crit else 0.0
    decision_speed = round(100 * len(resolved) / len(decisions), 1) if decisions else 0.0
    avg_conf = db.execute(select(func.avg(Gap.confidence))).scalar() or 0.0
    fairness = round(float(avg_conf) * 100, 1)

    scores = {
        "readiness_visibility": visibility, "risk_control": risk_control,
        "training_roi": roi, "succession_strength": succession,
        "decision_speed": decision_speed, "fairness_transparency": fairness,
    }
    return {
        "dimensions": [
            {"key": k, "en": en, "ar": ar, "score": scores[k]} for k, en, ar in DIMENSIONS
        ],
        "value_index": round(sum(scores.values()) / len(scores), 1),
    }
