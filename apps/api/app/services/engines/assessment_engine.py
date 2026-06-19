"""L7 · AI Assessment Engine.

Pipeline (LangGraph-style nodes):
    build_adaptive_path → generate/serve scenarios → read evidence
    → consistency check → confidence score → (approve | route to human review)
"""
from __future__ import annotations

from dataclasses import dataclass, field

from app.services.engines.confidence import needs_human_review, score_confidence


@dataclass
class AssessmentContext:
    employee_id: str
    competency_id: str
    required_level: int
    item_scores: list[float] = field(default_factory=list)  # per-item 0–1
    evidence_count: int = 0
    audit: list[dict] = field(default_factory=list)


def _log(ctx: AssessmentContext, step: str, **detail) -> None:
    ctx.audit.append({"step": step, **detail})


def build_adaptive_path(ctx: AssessmentContext, difficulties: list[int]) -> list[int]:
    """Order items to converge on the candidate's true level quickly."""
    path = sorted(difficulties)
    _log(ctx, "build_adaptive_path", difficulties=path)
    return path


def consistency(ctx: AssessmentContext) -> float:
    """Low variance across item scores ⇒ high consistency."""
    if len(ctx.item_scores) < 2:
        return 0.6
    mean = sum(ctx.item_scores) / len(ctx.item_scores)
    var = sum((s - mean) ** 2 for s in ctx.item_scores) / len(ctx.item_scores)
    return round(max(0.0, 1.0 - var), 4)


def estimate_level(ctx: AssessmentContext) -> int:
    """Map mean score → proficiency level 1–5."""
    if not ctx.item_scores:
        return 0
    mean = sum(ctx.item_scores) / len(ctx.item_scores)
    return max(1, min(5, round(mean * 5)))


def run(ctx: AssessmentContext) -> dict:
    cons = consistency(ctx)
    signal = (sum(ctx.item_scores) / len(ctx.item_scores)) if ctx.item_scores else 0.0
    level = estimate_level(ctx)
    conf = score_confidence(
        signal_strength=signal,
        evidence_count=ctx.evidence_count,
        consistency=cons,
    )
    review = needs_human_review(conf)
    _log(ctx, "consistency_check", consistency=cons)
    _log(ctx, "confidence_score", confidence=conf, signal=round(signal, 4))
    _log(ctx, "route", status="PENDING_REVIEW" if review else "APPROVED")
    return {
        "assessed_level": level,
        "required_level": ctx.required_level,
        "confidence": conf,
        "status": "PENDING_REVIEW" if review else "APPROVED",
        "needs_human_review": review,
        "audit": ctx.audit,
    }
