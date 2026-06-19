"""Unit test for the Institutional Value Engine dimension contract."""
from app.services.engines.value_engine import DIMENSIONS


def test_six_value_dimensions_bilingual():
    assert len(DIMENSIONS) == 6
    keys = {d[0] for d in DIMENSIONS}
    assert keys == {
        "readiness_visibility", "risk_control", "training_roi",
        "succession_strength", "decision_speed", "fairness_transparency",
    }
    # Every dimension carries an English + Arabic label.
    for key, en, ar in DIMENSIONS:
        assert en and ar
