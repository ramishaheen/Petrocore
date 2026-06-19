"""Workforce segmentation reference data (System Analysis §6)."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db_for
from app.models.workforce import CareerStream, RoleArchetype, RoleLevel, WorkforceFamily

router = APIRouter(prefix="/workforce", tags=["Workforce Architecture"])


@router.get("/families")
def families(db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(select(WorkforceFamily).order_by(WorkforceFamily.code)).scalars().all()
    return [{"id": f.id, "code": f.code, "name_en": f.name_en, "name_ar": f.name_ar,
             "family_domain": f.family_domain} for f in rows]


@router.get("/streams")
def streams(db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(select(CareerStream).order_by(CareerStream.code)).scalars().all()
    return [{"id": s.id, "code": s.code, "name_en": s.name_en, "name_ar": s.name_ar} for s in rows]


@router.get("/levels")
def levels(db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(select(RoleLevel).order_by(RoleLevel.level_rank)).scalars().all()
    return [{"id": l.id, "level_code": l.level_code, "name_en": l.name_en, "name_ar": l.name_ar,
             "level_rank": l.level_rank} for l in rows]


@router.get("/archetypes")
def archetypes(db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(select(RoleArchetype).order_by(RoleArchetype.code)).scalars().all()
    return [{"id": a.id, "code": a.code, "name_en": a.name_en, "name_ar": a.name_ar} for a in rows]
