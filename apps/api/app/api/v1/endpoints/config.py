"""Configurable master data + generic entity links (System Analysis §3.1)."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_user, get_db_for, require_roles
from app.core.rbac import Role
from app.models.core_ext import EntityLink, EntityType, LookupType, LookupValue
from app.services.engines.governance import append_audit

router = APIRouter(prefix="/config", tags=["Configurable Core · Master Data & Links"])

_admin = require_roles(Role.PLATFORM_ADMIN, Role.COMPANY_ADMIN, Role.HR_VALIDATOR, Role.CONSULTANT)


class EntityLinkIn(BaseModel):
    source_entity_type: str
    source_entity_id: str
    target_entity_type: str
    target_entity_id: str
    link_type: str = "Supports"
    relationship_weight: float = 1.0
    criticality_level: str | None = None


@router.get("/lookup-types")
def lookup_types(db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(select(LookupType).order_by(LookupType.code)).scalars().all()
    return [{"id": t.id, "code": t.code, "name": t.name, "is_system": t.is_system} for t in rows]


@router.get("/lookups")
def lookups(type_code: str, db: Session = Depends(get_db_for)) -> list[dict]:
    """Values for a master-data list, e.g. ?type_code=EVIDENCE_TYPE."""
    lt = db.execute(select(LookupType).where(LookupType.code == type_code)).scalar_one_or_none()
    if not lt:
        return []
    rows = db.execute(
        select(LookupValue).where(LookupValue.lookup_type_id == lt.id).order_by(LookupValue.sort_order)
    ).scalars().all()
    return [{"id": v.id, "value_code": v.value_code, "name_en": v.name_en, "name_ar": v.name_ar} for v in rows]


@router.get("/entity-types")
def entity_types(db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(select(EntityType).order_by(EntityType.code)).scalars().all()
    return [{"id": e.id, "code": e.code, "name": e.name} for e in rows]


@router.post("/entity-links")
def create_link(
    body: EntityLinkIn,
    user: CurrentUser = Depends(_admin),
    db: Session = Depends(get_db_for),
) -> dict:
    """Link any entity to any entity — the platform's future-proofing seam."""
    link = EntityLink(
        tenant_id=user.tenant_id or "*", source_entity_type=body.source_entity_type,
        source_entity_id=body.source_entity_id, target_entity_type=body.target_entity_type,
        target_entity_id=body.target_entity_id, link_type=body.link_type,
        relationship_weight=body.relationship_weight, criticality_level=body.criticality_level,
    )
    db.add(link)
    db.flush()
    append_audit(db, actor_user_id=user.id, action="ENTITY_LINK_CREATE",
                 entity="cfg_entity_link", entity_id=link.id,
                 after={"type": body.link_type, "src": body.source_entity_type, "tgt": body.target_entity_type})
    db.commit()
    return {"id": link.id, "link_type": link.link_type, "status": link.status}


@router.get("/entity-links")
def list_links(
    source_entity_type: str | None = None, source_entity_id: str | None = None,
    db: Session = Depends(get_db_for),
) -> list[dict]:
    stmt = select(EntityLink)
    if source_entity_type:
        stmt = stmt.where(EntityLink.source_entity_type == source_entity_type)
    if source_entity_id:
        stmt = stmt.where(EntityLink.source_entity_id == source_entity_id)
    rows = db.execute(stmt).scalars().all()
    return [
        {"id": l.id, "source_entity_type": l.source_entity_type, "source_entity_id": l.source_entity_id,
         "target_entity_type": l.target_entity_type, "target_entity_id": l.target_entity_id,
         "link_type": l.link_type, "relationship_weight": l.relationship_weight}
        for l in rows
    ]
