"""Evidence matching (L7) — semantic match of evidence to competency requirements.

Uses pgvector cosine distance when embeddings are present. Embeddings are
produced via the model gateway (deterministic in stub mode), so matching is
reproducible offline and upgrades to real semantics when a model key is set.
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.l3_l4 import Competency
from app.models.l7_l8 import Evidence
from app.services.engines.gateway import gateway


def embed_text(text: str) -> list[float]:
    return gateway.embed(text)


def index_evidence(db: Session, evidence: Evidence) -> Evidence:
    """Compute and store the embedding for an evidence record."""
    source = evidence.text or evidence.kind
    evidence.embedding = embed_text(source)
    db.add(evidence)
    return evidence


def match_evidence_to_competency(
    db: Session, employee_id: str, competency_id: str, *, limit: int = 5
) -> list[dict]:
    """Return the employee's evidence most semantically similar to the competency."""
    comp = db.get(Competency, competency_id)
    if not comp:
        return []
    query_vec = embed_text(f"{comp.name_en} {comp.description_en}")

    # pgvector cosine distance ordering (<=> operator via SQLAlchemy).
    stmt = (
        select(Evidence, Evidence.embedding.cosine_distance(query_vec).label("distance"))
        .where(Evidence.employee_id == employee_id, Evidence.embedding.isnot(None))
        .order_by("distance")
        .limit(limit)
    )
    rows = db.execute(stmt).all()
    return [
        {
            "evidence_id": ev.id,
            "kind": ev.kind,
            "text": ev.text[:160],
            "similarity": round(1.0 - float(dist), 4),
        }
        for ev, dist in rows
    ]
