"""AI lifecycle orchestration (System Analysis §3.15, §17 / Phase P-L).

Routes a gateway call through an auditable request → output → review record:
the model stays swappable, every output carries a confidence score, and the
human AI-governance review is recorded. Deterministic offline (stub gateway).
"""
from __future__ import annotations

import hashlib

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.ai_lifecycle import AIModelVersion, AIOutput, AIRequest, AIReview, PromptTemplate
from app.services.engines.gateway import gateway
from app.services.engines.governance import append_audit


def _confidence(text: str) -> float:
    return round(0.55 + (hashlib.sha256(text.encode()).digest()[0] / 255.0) * 0.40, 4)


def run_request(
    db: Session, *, actor_user_id: str | None, tenant_id: str, request_type: str,
    prompt: str, entity_type: str | None = None, entity_id: str | None = None,
    prompt_template_code: str | None = None, input_context: dict | None = None,
) -> dict:
    template = None
    if prompt_template_code:
        template = db.execute(
            select(PromptTemplate).where(PromptTemplate.code == prompt_template_code)
        ).scalars().first()
    model = db.execute(select(AIModelVersion).where(AIModelVersion.status == "ACTIVE")).scalars().first()

    req = AIRequest(
        tenant_id=tenant_id, request_type=request_type, requested_by=actor_user_id,
        entity_type=entity_type, entity_id=entity_id,
        prompt_template_id=template.id if template else None,
        model_version_id=model.id if model else None,
        input_json=input_context or {"prompt": prompt}, status="COMPLETED")
    db.add(req)
    db.flush()

    system = template.prompt_text if template else "You assist with workforce competency analysis."
    text = gateway.complete(system=system, prompt=prompt)
    out = AIOutput(
        tenant_id=tenant_id, ai_request_id=req.id, output_json={"text": text},
        confidence_score=_confidence(prompt), model_version_id=model.id if model else None,
        status="PENDING_REVIEW")
    db.add(out)
    db.flush()
    append_audit(db, actor_user_id=actor_user_id, action="AI_REQUEST",
                 entity="ai_output", entity_id=out.id,
                 after={"request_type": request_type, "confidence": out.confidence_score})
    return {"request_id": req.id, "output_id": out.id, "confidence_score": out.confidence_score,
            "status": out.status, "output": out.output_json}


def review_output(db: Session, *, actor_user_id: str | None, output_id: str, decision: str, comments: str = "") -> dict:
    out = db.get(AIOutput, output_id)
    if not out:
        raise ValueError("output not found")
    if decision not in {"Accepted", "Modified", "Rejected"}:
        raise ValueError("decision must be Accepted, Modified or Rejected")
    db.add(AIReview(tenant_id=out.tenant_id, ai_output_id=output_id, reviewer_id=actor_user_id,
                    review_decision=decision, reviewer_comments=comments))
    out.status = decision.upper()
    db.flush()
    append_audit(db, actor_user_id=actor_user_id, action="AI_REVIEW",
                 entity="ai_output", entity_id=output_id, after={"decision": decision})
    return {"output_id": output_id, "status": out.status}


def create_prompt_template(db: Session, *, code: str, template_name: str, use_case: str, prompt_text: str) -> PromptTemplate:
    t = PromptTemplate(code=code, template_name=template_name, use_case=use_case, prompt_text=prompt_text)
    db.add(t)
    db.flush()
    return t


def create_model_version(db: Session, *, model_name: str, version: str, provider: str) -> AIModelVersion:
    m = AIModelVersion(model_name=model_name, version=version, provider=provider)
    db.add(m)
    db.flush()
    return m


def request_detail(db: Session, request_id: str) -> dict | None:
    req = db.get(AIRequest, request_id)
    if not req:
        return None
    outputs = db.execute(select(AIOutput).where(AIOutput.ai_request_id == request_id)).scalars().all()
    out_ids = [o.id for o in outputs]
    reviews = db.execute(select(AIReview).where(AIReview.ai_output_id.in_(out_ids or ["_"]))).scalars().all()
    return {
        "id": req.id, "request_type": req.request_type, "status": req.status,
        "outputs": [{"id": o.id, "confidence_score": o.confidence_score, "status": o.status,
                     "output": o.output_json} for o in outputs],
        "reviews": [{"output_id": r.ai_output_id, "decision": r.review_decision} for r in reviews],
    }
