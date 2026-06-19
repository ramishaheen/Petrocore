"""Phase P-J APIs: strategy cascade — objectives, KPIs, competency alignment,
and strategic readiness gaps."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_db_for, require_roles
from app.core.rbac import Role
from app.models.strategy import StrategicObjective, StrategicReadinessGap
from app.services import strategy_service as svc

router = APIRouter(prefix="/strategy", tags=["P-J · Strategy Cascade"])

_strategist = require_roles(
    Role.NOC_EXECUTIVE, Role.COMPANY_ADMIN, Role.DEPT_MANAGER, Role.PLATFORM_ADMIN, Role.CONSULTANT)


class ObjectiveIn(BaseModel):
    level: str = "CORPORATE"
    title_en: str
    title_ar: str
    parent_objective_id: str | None = None
    owner_ref: str | None = None
    period: str = ""
    weight: float = 1.0


@router.post("/objectives")
def create_objective(body: ObjectiveIn, user: CurrentUser = Depends(_strategist), db: Session = Depends(get_db_for)) -> dict:
    o = svc.create_objective(
        db, actor_user_id=user.id, tenant_id=user.tenant_id or "*", level=body.level,
        title_en=body.title_en, title_ar=body.title_ar, parent_objective_id=body.parent_objective_id,
        owner_ref=body.owner_ref, period=body.period, weight=body.weight)
    db.commit()
    return {"id": o.id, "level": o.level, "title_en": o.title_en}


@router.get("/objectives")
def list_objectives(db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(select(StrategicObjective).order_by(StrategicObjective.created_at)).scalars().all()
    return [{"id": o.id, "level": o.level, "title_en": o.title_en, "title_ar": o.title_ar,
             "period": o.period, "parent_objective_id": o.parent_objective_id} for o in rows]


@router.get("/objectives/{objective_id}")
def objective_detail(objective_id: str, db: Session = Depends(get_db_for)) -> dict:
    detail = svc.objective_detail(db, objective_id)
    if not detail:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "objective not found")
    return detail


class KpiIn(BaseModel):
    code: str
    name_en: str
    name_ar: str
    target_value: float = 0.0
    current_value: float = 0.0
    unit: str = ""


@router.post("/objectives/{objective_id}/kpis")
def add_kpi(objective_id: str, body: KpiIn, user: CurrentUser = Depends(_strategist), db: Session = Depends(get_db_for)) -> dict:
    if not db.get(StrategicObjective, objective_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "objective not found")
    k = svc.add_kpi(db, tenant_id=user.tenant_id or "*", objective_id=objective_id, code=body.code,
                    name_en=body.name_en, name_ar=body.name_ar, target_value=body.target_value,
                    current_value=body.current_value, unit=body.unit)
    db.commit()
    return {"id": k.id, "code": k.code}


class AlignIn(BaseModel):
    competency_id: str
    required_level: int = 4
    weight: float = 1.0


@router.post("/objectives/{objective_id}/competencies")
def align_competency(objective_id: str, body: AlignIn, user: CurrentUser = Depends(_strategist), db: Session = Depends(get_db_for)) -> dict:
    if not db.get(StrategicObjective, objective_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "objective not found")
    a = svc.align_competency(db, tenant_id=user.tenant_id or "*", objective_id=objective_id,
                             competency_id=body.competency_id, required_level=body.required_level, weight=body.weight)
    db.commit()
    return {"id": a.id, "competency_id": a.competency_id, "required_level": a.required_level}


@router.post("/objectives/{objective_id}/readiness-gap")
def compute_gap(objective_id: str, user: CurrentUser = Depends(_strategist), db: Session = Depends(get_db_for)) -> dict:
    try:
        result = svc.compute_readiness_gap(db, actor_user_id=user.id, objective_id=objective_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    db.commit()
    return result


@router.get("/readiness-gaps")
def list_gaps(db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(select(StrategicReadinessGap)).scalars().all()
    return [{"objective_id": g.objective_id, "competency_id": g.competency_id,
             "required_level": g.required_level, "actual_avg_level": g.actual_avg_level,
             "gap": g.gap, "readiness_pct": g.readiness_pct} for g in rows]
