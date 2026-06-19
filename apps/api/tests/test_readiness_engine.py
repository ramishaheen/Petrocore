"""Unit tests for the multi-factor readiness engine (offline, no DB)."""
from app.services.engines.readiness_engine import (
    STATUS_CATALOG, ReadinessFactors, compute_readiness,
)


def _strong() -> ReadinessFactors:
    return ReadinessFactors(0.95, 0.9, 0.9, 1.0, 1.0, 0.95)


def test_strong_profile_is_ready():
    v = compute_readiness(_strong())
    assert v["readiness_status"] == "READY"
    assert v["readiness_index"] >= 85.0
    assert set(v["factors"]) == {
        "competency_score", "evidence_confidence", "data_quality",
        "risk_adjustment", "role_criticality", "recency",
    }


def test_evidence_floor_overrides_high_index():
    f = ReadinessFactors(0.95, 0.2, 0.9, 1.0, 1.0, 0.95)  # evidence below floor
    assert compute_readiness(f)["readiness_status"] == "EVIDENCE_INSUFFICIENT"


def test_stale_evidence_requires_reassessment():
    f = ReadinessFactors(0.9, 0.8, 0.9, 1.0, 1.0, 0.1)  # recency below floor
    assert compute_readiness(f)["readiness_status"] == "REASSESSMENT_REQUIRED"


def test_critical_role_gate():
    # A solid-but-not-stellar profile on a critical role is not "ready".
    f = ReadinessFactors(0.7, 0.7, 0.7, 0.9, 0.9, 0.9)
    v = compute_readiness(f, is_critical_role=True)
    assert v["readiness_index"] < 85.0
    assert v["readiness_status"] == "NOT_READY_CRITICAL"
    # The same profile on a non-critical role is allowed minor gaps / development.
    v2 = compute_readiness(f, is_critical_role=False)
    assert v2["readiness_status"] in {"READY_MINOR_GAPS", "DEVELOPMENT_REQUIRED"}


def test_index_is_monotonic_in_competency_score():
    low = compute_readiness(ReadinessFactors(0.4, 0.8, 0.8, 1.0, 1.0, 0.9))["readiness_index"]
    high = compute_readiness(ReadinessFactors(0.9, 0.8, 0.8, 1.0, 1.0, 0.9))["readiness_index"]
    assert high > low


def test_factors_clamped_to_unit_interval():
    v = compute_readiness(ReadinessFactors(1.5, -0.2, 0.8, 2.0, 0.9, 0.9))
    f = v["factors"]
    assert f["competency_score"] == 1.0 and f["evidence_confidence"] == 0.0
    assert f["risk_adjustment"] == 1.0


def test_status_catalog_complete_and_bilingual():
    codes = {c for c, _, _ in STATUS_CATALOG}
    assert {"READY", "NOT_READY_CRITICAL", "EVIDENCE_INSUFFICIENT",
            "SUCCESSION_CANDIDATE", "HIGH_POTENTIAL"} <= codes
    assert all(ar for _, _, ar in STATUS_CATALOG)
