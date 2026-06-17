"""Unit tests for the AI engines (deterministic, no DB or external model needed)."""
from app.services.engines.assessment_engine import AssessmentContext, run
from app.services.engines.confidence import needs_human_review, score_confidence
from app.services.engines.fusion_engine import CompetencySignal, fuse, readiness_index


def test_confidence_bounds_and_threshold():
    low = score_confidence(signal_strength=0.2, evidence_count=0, consistency=0.1)
    high = score_confidence(signal_strength=1.0, evidence_count=5, consistency=1.0)
    assert 0.0 <= low <= 1.0 <= 1.0
    assert high > low
    assert needs_human_review(low) is True
    assert needs_human_review(high) is False


def test_assessment_engine_estimates_level_and_routes():
    ctx = AssessmentContext(
        employee_id="e1", competency_id="c1", required_level=4,
        item_scores=[0.9, 0.85, 0.95], evidence_count=3,
    )
    result = run(ctx)
    assert 1 <= result["assessed_level"] <= 5
    assert result["status"] in {"APPROVED", "PENDING_REVIEW"}
    assert any(a["step"] == "confidence_score" for a in result["audit"])


def test_low_signal_routes_to_human_review():
    ctx = AssessmentContext(
        employee_id="e1", competency_id="c1", required_level=4,
        item_scores=[0.2, 0.1], evidence_count=0,
    )
    result = run(ctx)
    assert result["needs_human_review"] is True
    assert result["status"] == "PENDING_REVIEW"


def test_fusion_prioritizes_and_scores_gaps():
    signals = [
        CompetencySignal("c1", current_level=2, target_level=5, evidence_count=1),
        CompetencySignal("c2", current_level=4, target_level=4, evidence_count=2),
        CompetencySignal("c3", current_level=1, target_level=4, evidence_count=0),
    ]
    gaps = fuse(signals)
    assert gaps[0]["priority"] == "VERY_HIGH"  # largest gap first
    assert gaps[-1]["gap_size"] == 0           # no-gap competency last
    assert all(0.0 <= g["confidence"] <= 1.0 for g in gaps)


def test_readiness_index_range():
    signals = [
        CompetencySignal("c1", current_level=3, target_level=5),
        CompetencySignal("c2", current_level=4, target_level=4),
    ]
    idx = readiness_index(signals)
    assert 0.0 <= idx <= 100.0
    assert readiness_index([]) == 0.0
