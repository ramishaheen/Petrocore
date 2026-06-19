"""L8 · AI Data Fusion Engine.

Steps: normalize → context-match → gap analysis → impact prioritization → confidence score.
Turns multi-source competency results into decision-ready gap outputs.
"""
from __future__ import annotations

from dataclasses import dataclass

from app.services.engines.confidence import score_confidence


@dataclass
class CompetencySignal:
    competency_id: str
    current_level: int
    target_level: int
    evidence_count: int = 0
    consistency: float = 0.7


def _priority(gap_size: int, risk_weight: float) -> str:
    weighted = gap_size * max(1.0, risk_weight)
    if weighted >= 3:
        return "VERY_HIGH"
    if weighted >= 2:
        return "HIGH"
    return "MEDIUM"


def analyze_gap(sig: CompetencySignal, risk_weight: float = 1.0) -> dict:
    gap_size = max(0, sig.target_level - sig.current_level)
    signal_strength = 1.0 - (gap_size / 5.0)
    conf = score_confidence(
        signal_strength=signal_strength,
        evidence_count=sig.evidence_count,
        consistency=sig.consistency,
    )
    return {
        "competency_id": sig.competency_id,
        "current_level": sig.current_level,
        "target_level": sig.target_level,
        "gap_size": gap_size,
        "priority": _priority(gap_size, risk_weight),
        "confidence": conf,
    }


def fuse(signals: list[CompetencySignal], risk_weights: dict[str, float] | None = None) -> list[dict]:
    """Run the fusion pipeline over many signals, returning prioritized gaps."""
    risk_weights = risk_weights or {}
    gaps = [analyze_gap(s, risk_weights.get(s.competency_id, 1.0)) for s in signals]
    # Impact prioritization: VERY_HIGH first, then by gap size.
    order = {"VERY_HIGH": 0, "HIGH": 1, "MEDIUM": 2}
    gaps.sort(key=lambda g: (order[g["priority"]], -g["gap_size"]))
    return gaps


def readiness_index(signals: list[CompetencySignal]) -> float:
    """0–100 readiness: how close current is to target across competencies."""
    if not signals:
        return 0.0
    ratios = []
    for s in signals:
        if s.target_level <= 0:
            continue
        ratios.append(min(1.0, s.current_level / s.target_level))
    if not ratios:
        return 0.0
    return round(100.0 * sum(ratios) / len(ratios), 1)
