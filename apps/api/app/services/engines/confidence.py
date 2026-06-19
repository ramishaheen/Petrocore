"""Shared confidence scoring + human-review routing.

Confidence is a function of evidence corroboration, consistency across sources,
and assessment signal strength. Every competency result, gap, and recommendation
carries a confidence in [0, 1]; results below the configured threshold route to
human governance review.
"""
from app.core.config import settings


def score_confidence(
    *,
    signal_strength: float,
    evidence_count: int,
    consistency: float,
) -> float:
    """Combine signals into a [0,1] confidence.

    - signal_strength: assessment correctness / proficiency signal (0–1)
    - evidence_count: number of corroborating evidence records
    - consistency: agreement across sources (0–1)
    """
    evidence_factor = min(1.0, evidence_count / 3.0)  # saturates at 3 sources
    raw = 0.5 * signal_strength + 0.3 * evidence_factor + 0.2 * consistency
    return round(max(0.0, min(1.0, raw)), 4)


def needs_human_review(confidence: float) -> bool:
    return confidence < settings.CONFIDENCE_REVIEW_THRESHOLD
