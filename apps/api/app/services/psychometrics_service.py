"""Assessment quality, calibration & psychometrics (System Analysis §12 / Phase P-F).

Read-only item analytics over recorded assessment responses: difficulty,
discrimination (top vs bottom performers), usage, a reliability flag, and a
retire recommendation for items that no longer discriminate. Defensible and
configurable; surfaces weak items for SME calibration.
"""
from __future__ import annotations

from statistics import mean

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.l3_l4 import Competency
from app.models.l7_l8 import Assessment, AssessmentItem, Question

_MIN_USAGE = 5  # below this we can't judge an item's psychometrics


def question_quality(db: Session) -> list[dict]:
    items = db.execute(select(AssessmentItem)).scalars().all()
    questions = {q.id: q for q in db.execute(select(Question)).scalars().all()}
    comps = {c.id: c for c in db.execute(select(Competency)).scalars().all()}

    by_q: dict[str, list[AssessmentItem]] = {}
    for it in items:
        by_q.setdefault(it.question_id, []).append(it)

    out = []
    for qid, its in by_q.items():
        q = questions.get(qid)
        scores = [i.score for i in its]
        usage = len(its)
        avg = round(mean(scores), 3) if scores else 0.0
        difficulty = round(1.0 - avg, 3)  # higher = harder
        # Discrimination: mean score of the top third minus the bottom third.
        ordered = sorted(scores)
        third = max(1, usage // 3)
        discrimination = round(mean(ordered[-third:]) - mean(ordered[:third]), 3) if usage >= 3 else 0.0
        enough = usage >= _MIN_USAGE
        retire = enough and (avg >= 0.95 or avg <= 0.1 or discrimination < 0.1)
        out.append({
            "question_id": qid,
            "competency_en": comps[q.competency_id].name_en if q and q.competency_id in comps else "",
            "body_en": q.body_en if q else "", "kind": q.kind if q else "",
            "usage": usage, "avg_score": avg, "difficulty": difficulty,
            "discrimination": discrimination,
            "reliability": "OK" if enough else "INSUFFICIENT_DATA",
            "retire_recommended": retire,
        })
    return sorted(out, key=lambda x: (-x["usage"], -x["difficulty"]))


def assessment_reliability(db: Session) -> dict:
    items = db.execute(select(AssessmentItem)).scalars().all()
    assessments = db.execute(select(Assessment)).scalars().all()
    questions_used = {i.question_id for i in items}
    total_items = len(items)
    qcount = len(questions_used)
    mean_usage = round(total_items / qcount, 2) if qcount else 0.0
    # Heuristic reliability: saturates as items-per-question approaches the minimum.
    reliability_score = round(min(1.0, mean_usage / _MIN_USAGE), 2)
    quality = question_quality(db)
    return {
        "assessments": len(assessments),
        "items_recorded": total_items,
        "questions_used": qcount,
        "mean_usage_per_question": mean_usage,
        "reliability_score": reliability_score,
        "items_needing_calibration": sum(1 for q in quality if q["retire_recommended"]),
        "items_insufficient_data": sum(1 for q in quality if q["reliability"] == "INSUFFICIENT_DATA"),
        "bias_flags": [],  # placeholder — no demographic data ingested in this scope
    }
