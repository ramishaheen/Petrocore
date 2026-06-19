"""Phase P-M APIs: workforce groups (with readiness rollup) + talent pools."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_db_for, require_roles
from app.core.rbac import Role
from app.models.groups import TalentPool, WorkforceGroup
from app.services import groups_service as svc

router = APIRouter(tags=["P-M · Workforce Groups & Talent Pools"])

_mgr = require_roles(
    Role.HR_VALIDATOR, Role.DEPT_MANAGER, Role.LD_MANAGER, Role.COMPANY_ADMIN,
    Role.NOC_EXECUTIVE, Role.PLATFORM_ADMIN, Role.CONSULTANT)


@router.get("/groups")
def list_groups(db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(select(WorkforceGroup).order_by(WorkforceGroup.created_at.desc())).scalars().all()
    return [{"id": g.id, "name_en": g.name_en, "name_ar": g.name_ar, "group_type": g.group_type} for g in rows]


class GroupIn(BaseModel):
    name_en: str
    name_ar: str
    group_type: str = "Custom"
    company_id: str | None = None


@router.post("/groups")
def create_group(body: GroupIn, user: CurrentUser = Depends(_mgr), db: Session = Depends(get_db_for)) -> dict:
    g = svc.create_group(db, actor_user_id=user.id, tenant_id=user.tenant_id or "*", name_en=body.name_en,
                         name_ar=body.name_ar, group_type=body.group_type, company_id=body.company_id)
    db.commit()
    return {"id": g.id, "name_en": g.name_en, "group_type": g.group_type}


class MemberIn(BaseModel):
    employee_id: str
    membership_reason: str = ""


@router.post("/groups/{group_id}/members")
def add_member(group_id: str, body: MemberIn, user: CurrentUser = Depends(_mgr), db: Session = Depends(get_db_for)) -> dict:
    try:
        m = svc.add_member(db, group_id=group_id, employee_id=body.employee_id, membership_reason=body.membership_reason)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    db.commit()
    return {"id": m.id, "employee_id": m.employee_id}


@router.get("/groups/{group_id}/readiness")
def group_readiness(group_id: str, db: Session = Depends(get_db_for)) -> dict:
    try:
        return svc.group_readiness(db, group_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))


@router.get("/talent-pools")
def list_pools(db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(select(TalentPool).order_by(TalentPool.created_at.desc())).scalars().all()
    return [{"id": p.id, "name_en": p.name_en, "name_ar": p.name_ar, "pool_type": p.pool_type} for p in rows]


class PoolIn(BaseModel):
    name_en: str
    name_ar: str
    pool_type: str = "HiPo"


@router.post("/talent-pools")
def create_pool(body: PoolIn, user: CurrentUser = Depends(_mgr), db: Session = Depends(get_db_for)) -> dict:
    p = svc.create_pool(db, actor_user_id=user.id, tenant_id=user.tenant_id or "*", name_en=body.name_en,
                        name_ar=body.name_ar, pool_type=body.pool_type)
    db.commit()
    return {"id": p.id, "name_en": p.name_en, "pool_type": p.pool_type}


class PoolMemberIn(BaseModel):
    employee_id: str


@router.post("/talent-pools/{pool_id}/members")
def add_pool_member(pool_id: str, body: PoolMemberIn, user: CurrentUser = Depends(_mgr), db: Session = Depends(get_db_for)) -> dict:
    try:
        m = svc.add_pool_member(db, pool_id=pool_id, employee_id=body.employee_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    db.commit()
    return {"id": m.id, "employee_id": m.employee_id}
