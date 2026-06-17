"""Tests for evidence embedding + grading (no DB / no external model needed)."""
from app.models.l7_l8 import Question
from app.services.assessment_service import grade_item
from app.services.engines.gateway import gateway


def test_embedding_is_deterministic_and_normalized():
    a = gateway.embed("process safety management")
    b = gateway.embed("process safety management")
    assert a == b  # deterministic in stub mode
    assert len(a) == 1536
    norm = sum(x * x for x in a) ** 0.5
    assert abs(norm - 1.0) < 1e-6


def test_different_text_yields_different_embedding():
    assert gateway.embed("drilling") != gateway.embed("refining")


def test_grade_mcq_against_answer_key():
    q = Question(kind="MCQ", answer_key={"correct": 1})
    assert grade_item(q, {"choice": 1}) == 1.0
    assert grade_item(q, {"choice": 2}) == 0.0


def test_grade_scenario_uses_rubric_score():
    q = Question(kind="SCENARIO", answer_key={})
    assert grade_item(q, {"score": 0.8}) == 0.8
