"""Human-AI Governance & Decision Assurance + tamper-evident audit chain.

AI recommends · Humans review · Evidence validates · Governance assures.
No recommendation enters a decision without review + approval.
"""
from __future__ import annotations

import hashlib
import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.l9_gov import AuditLog, GovDecision


def _hash_entry(prev_hash: str, payload: dict) -> str:
    blob = prev_hash + json.dumps(payload, sort_keys=True, default=str)
    return hashlib.sha256(blob.encode()).hexdigest()


def append_audit(
    db: Session,
    *,
    actor_user_id: str | None,
    action: str,
    entity: str,
    entity_id: str,
    before: dict | None = None,
    after: dict | None = None,
) -> AuditLog:
    """Append an immutable, hash-chained audit entry."""
    last = db.execute(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(1)).scalar_one_or_none()
    prev_hash = last.hash if last else ""
    payload = {
        "actor": actor_user_id, "action": action,
        "entity": entity, "entity_id": entity_id,
        "before": before or {}, "after": after or {},
    }
    entry = AuditLog(
        actor_user_id=actor_user_id, action=action, entity=entity, entity_id=entity_id,
        before=before or {}, after=after or {}, prev_hash=prev_hash,
        hash=_hash_entry(prev_hash, payload),
    )
    db.add(entry)
    return entry


def verify_chain(db: Session) -> bool:
    """Verify the audit hash chain is intact (tamper detection)."""
    entries = db.execute(select(AuditLog).order_by(AuditLog.created_at.asc())).scalars().all()
    prev = ""
    for e in entries:
        payload = {
            "actor": e.actor_user_id, "action": e.action,
            "entity": e.entity, "entity_id": e.entity_id,
            "before": e.before, "after": e.after,
        }
        if e.prev_hash != prev or e.hash != _hash_entry(prev, payload):
            return False
        prev = e.hash
    return True


def open_decision(
    db: Session, *, tenant_id: str, kind: str, subject_ref: str,
    ai_recommendation: str, confidence: float,
) -> GovDecision:
    """Open a pending governance decision for an AI output."""
    dec = GovDecision(
        tenant_id=tenant_id, kind=kind, subject_ref=subject_ref,
        ai_recommendation=ai_recommendation, confidence=confidence,
        governance_status="PENDING_REVIEW",
    )
    db.add(dec)
    return dec


def resolve_decision(
    db: Session, decision: GovDecision, *, reviewer_user_id: str, approve: bool,
) -> GovDecision:
    decision.reviewer_user_id = reviewer_user_id
    decision.governance_status = "APPROVED" if approve else "REJECTED"
    append_audit(
        db, actor_user_id=reviewer_user_id,
        action="GOV_RESOLVE", entity="gov_decision", entity_id=decision.id,
        after={"status": decision.governance_status},
    )
    return decision
