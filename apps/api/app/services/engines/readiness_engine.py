"""Multi-factor Readiness Engine (System Analysis §4).

The spec defines readiness as a *product* of six factors:

    Readiness = CompetencyScore × EvidenceConfidence × DataQuality
                × RiskAdjustment × RoleCriticality × Recency

Each factor is normalized to [0, 1]. A raw product of six sub-unit factors
collapses toward zero and is not human-interpretable, so we surface the
**geometric mean** of the factors as the 0–100 index (monotonic in the product,
so the multiplicative semantics hold) while still returning the raw product and
every individual factor for full explainability — "what was measured, evidence,
confidence, gap, action". Status bands and quality floors are configurable.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass

from app.core.config import settings

# The full readiness status vocabulary (System Analysis §4). The core engine
# assigns the first six; SUCCESSION_CANDIDATE / HIGH_POTENTIAL are talent flags
# set by the talent layer (P-E) — listed here so the catalog is complete.
STATUS_CATALOG: list[tuple[str, str, str]] = [
    ("READY", "Ready", "جاهز"),
    ("READY_MINOR_GAPS", "Ready with minor gaps", "جاهز مع فجوات طفيفة"),
    ("DEVELOPMENT_REQUIRED", "Development required", "يتطلب تطويراً"),
    ("NOT_READY_CRITICAL", "Not ready for critical role", "غير جاهز لدور حرج"),
    ("EVIDENCE_INSUFFICIENT", "Evidence insufficient", "الأدلة غير كافية"),
    ("REASSESSMENT_REQUIRED", "Reassessment required", "إعادة التقييم مطلوبة"),
    ("SUCCESSION_CANDIDATE", "Succession candidate", "مرشح للإحلال"),
    ("HIGH_POTENTIAL", "High potential", "إمكانات عالية"),
]


@dataclass
class ReadinessFactors:
    competency_score: float      # attainment vs required level, evidence-weighted
    evidence_confidence: float   # how well evidence corroborates the results
    data_quality: float          # completeness/verification of the underlying records
    risk_adjustment: float       # discount when high-risk competencies are unmet
    role_criticality: float      # stringency for critical roles (1.0 = non-critical)
    recency: float               # time-decay of the assessment evidence

    def clamped(self) -> "ReadinessFactors":
        def c(v: float) -> float:
            return round(max(0.0, min(1.0, float(v))), 4)
        return ReadinessFactors(
            c(self.competency_score), c(self.evidence_confidence), c(self.data_quality),
            c(self.risk_adjustment), c(self.role_criticality), c(self.recency),
        )


def _values(f: ReadinessFactors) -> list[float]:
    return [f.competency_score, f.evidence_confidence, f.data_quality,
            f.risk_adjustment, f.role_criticality, f.recency]


def classify(index: float, factors: ReadinessFactors, *, is_critical_role: bool = False) -> tuple[str, str, str]:
    """Return (status_code, status_en, status_ar). Floors are checked before bands
    so an insufficiently-evidenced or stale result never reads as 'Ready'. The
    critical-role gate is driven by an explicit flag, not the multiplier factor."""
    if factors.evidence_confidence < settings.READINESS_EVIDENCE_FLOOR:
        return ("EVIDENCE_INSUFFICIENT", "Evidence insufficient", "الأدلة غير كافية")
    if factors.recency < settings.READINESS_RECENCY_FLOOR:
        return ("REASSESSMENT_REQUIRED", "Reassessment required", "إعادة التقييم مطلوبة")
    if index >= settings.READINESS_READY_THRESHOLD:
        return ("READY", "Ready", "جاهز")
    if is_critical_role:
        return ("NOT_READY_CRITICAL", "Not ready for critical role", "غير جاهز لدور حرج")
    if index >= settings.READINESS_MINOR_GAPS_THRESHOLD:
        return ("READY_MINOR_GAPS", "Ready with minor gaps", "جاهز مع فجوات طفيفة")
    return ("DEVELOPMENT_REQUIRED", "Development required", "يتطلب تطويراً")


def compute_readiness(factors: ReadinessFactors, *, is_critical_role: bool = False) -> dict:
    """Combine the six factors into an explainable readiness verdict."""
    f = factors.clamped()
    vals = _values(f)
    raw_product = 1.0
    for v in vals:
        raw_product *= v
    geo_mean = raw_product ** (1.0 / len(vals)) if all(v > 0 for v in vals) else 0.0
    index = round(100.0 * geo_mean, 1)
    status_code, status_en, status_ar = classify(index, f, is_critical_role=is_critical_role)
    return {
        "readiness_index": index,
        "readiness_status": status_code,
        "status_en": status_en,
        "status_ar": status_ar,
        "raw_product": round(raw_product, 6),
        "is_critical_role": is_critical_role,
        "factors": asdict(f),
        "method_version": "rs-v1",
    }
