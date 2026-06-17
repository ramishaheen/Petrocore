"""Human-AI Governance & Decision Assurance gate + audit verification."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_db_for, require_roles
from app.core.rbac import GOVERNANCE_APPROVERS
from app.models.l9_gov import GovDecision
from app.schemas import DecisionResolve
from app.services.engines.governance import resolve_decision, verify_chain

router = APIRouter(prefix="/governance", tags=["Governance & Decision Assurance"])

_approver_dep = require_roles(*GOVERNANCE_APPROVERS)


@router.get("/decisions")
def pending_decisions(db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(
        select(GovDecision).where(GovDecision.governance_status == "PENDING_REVIEW")
    ).scalars().all()
    return [
        {
            "id": d.id, "kind": d.kind, "subject_ref": d.subject_ref,
            "ai_recommendation": d.ai_recommendation, "confidence": d.confidence,
            "governance_status": d.governance_status,
        }
        for d in rows
    ]


@router.post("/decisions/{decision_id}/resolve")
def resolve(
    decision_id: str,
    body: DecisionResolve,
    user: CurrentUser = Depends(_approver_dep),
    db: Session = Depends(get_db_for),
) -> dict:
    """Approve or reject an AI recommendation. No decision proceeds without this gate."""
    decision = db.get(GovDecision, decision_id)
    if not decision:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "decision not found")
    resolve_decision(db, decision, reviewer_user_id=user.id, approve=body.approve)
    db.commit()
    return {"id": decision.id, "governance_status": decision.governance_status}


@router.get("/audit/verify")
def audit_verify(db: Session = Depends(get_db_for)) -> dict:
    """Verify the tamper-evident audit hash chain (Governance & Audit Report #8)."""
    return {"intact": verify_chain(db)}
