"""Phase P-I APIs: operational & asset context (sites, units, equipment,
procedures, critical tasks + risks) and competency-exposure analytics."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_db_for, require_roles
from app.core.rbac import Role
from app.models.operations import CriticalTask, Equipment, Procedure, Site
from app.services import operations_service as svc

router = APIRouter(prefix="/operations", tags=["P-I · Operational & Asset Context"])

_ops = require_roles(
    Role.COMPANY_ADMIN, Role.DEPT_MANAGER, Role.HR_VALIDATOR, Role.PLATFORM_ADMIN, Role.CONSULTANT)


@router.get("/sites")
def list_sites(db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(select(Site).order_by(Site.code)).scalars().all()
    return [{"id": s.id, "code": s.code, "name_en": s.name_en, "name_ar": s.name_ar,
             "activity_segment": s.activity_segment} for s in rows]


class SiteIn(BaseModel):
    code: str
    name_en: str
    name_ar: str
    activity_segment: str | None = None


@router.post("/sites")
def create_site(body: SiteIn, user: CurrentUser = Depends(_ops), db: Session = Depends(get_db_for)) -> dict:
    s = svc.create_site(db, tenant_id=user.tenant_id or "*", code=body.code, name_en=body.name_en,
                        name_ar=body.name_ar, activity_segment=body.activity_segment)
    db.commit()
    return {"id": s.id, "code": s.code}


@router.get("/equipment")
def list_equipment(db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(select(Equipment).order_by(Equipment.tag)).scalars().all()
    return [{"id": e.id, "tag": e.tag, "name_en": e.name_en, "name_ar": e.name_ar,
             "equipment_type": e.equipment_type, "criticality": e.criticality, "risk_level": e.risk_level} for e in rows]


class EquipmentIn(BaseModel):
    tag: str
    name_en: str
    name_ar: str
    equipment_type: str = ""
    criticality: str = "MED"
    risk_level: str = "MED"
    process_unit_id: str | None = None


@router.post("/equipment")
def create_equipment(body: EquipmentIn, user: CurrentUser = Depends(_ops), db: Session = Depends(get_db_for)) -> dict:
    e = svc.create_equipment(db, actor_user_id=user.id, tenant_id=user.tenant_id or "*", tag=body.tag,
                             name_en=body.name_en, name_ar=body.name_ar, equipment_type=body.equipment_type,
                             criticality=body.criticality, risk_level=body.risk_level,
                             process_unit_id=body.process_unit_id)
    db.commit()
    return {"id": e.id, "tag": e.tag, "criticality": e.criticality}


@router.get("/procedures")
def list_procedures(db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(select(Procedure).order_by(Procedure.code)).scalars().all()
    return [{"id": p.id, "code": p.code, "title_en": p.title_en, "title_ar": p.title_ar,
             "procedure_type": p.procedure_type} for p in rows]


class ProcedureIn(BaseModel):
    code: str
    title_en: str
    title_ar: str
    procedure_type: str = "SOP"


@router.post("/procedures")
def create_procedure(body: ProcedureIn, user: CurrentUser = Depends(_ops), db: Session = Depends(get_db_for)) -> dict:
    p = svc.create_procedure(db, tenant_id=user.tenant_id or "*", code=body.code, title_en=body.title_en,
                            title_ar=body.title_ar, procedure_type=body.procedure_type)
    db.commit()
    return {"id": p.id, "code": p.code}


@router.get("/critical-tasks")
def list_critical_tasks(db: Session = Depends(get_db_for)) -> list[dict]:
    rows = db.execute(select(CriticalTask).order_by(CriticalTask.created_at.desc())).scalars().all()
    return [{"id": t.id, "name_en": t.name_en, "name_ar": t.name_ar, "criticality": t.criticality,
             "competency_id": t.competency_id, "equipment_id": t.equipment_id} for t in rows]


class CriticalTaskIn(BaseModel):
    name_en: str
    name_ar: str
    competency_id: str | None = None
    equipment_id: str | None = None
    procedure_id: str | None = None
    criticality: str = "HIGH"


@router.post("/critical-tasks")
def create_critical_task(body: CriticalTaskIn, user: CurrentUser = Depends(_ops), db: Session = Depends(get_db_for)) -> dict:
    t = svc.create_critical_task(db, actor_user_id=user.id, tenant_id=user.tenant_id or "*", name_en=body.name_en,
                                name_ar=body.name_ar, competency_id=body.competency_id, equipment_id=body.equipment_id,
                                procedure_id=body.procedure_id, criticality=body.criticality)
    db.commit()
    return {"id": t.id, "name_en": t.name_en, "criticality": t.criticality}


class TaskRiskIn(BaseModel):
    risk_type: str = "Safety"
    severity: float = 0.5
    likelihood: float = 0.5
    mitigation: str = ""


@router.post("/critical-tasks/{task_id}/risks")
def add_task_risk(task_id: str, body: TaskRiskIn, user: CurrentUser = Depends(_ops), db: Session = Depends(get_db_for)) -> dict:
    if not db.get(CriticalTask, task_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "task not found")
    r = svc.add_task_risk(db, tenant_id=user.tenant_id or "*", critical_task_id=task_id, risk_type=body.risk_type,
                          severity=body.severity, likelihood=body.likelihood, mitigation=body.mitigation)
    db.commit()
    return {"id": r.id, "risk_type": r.risk_type}


@router.get("/competency-exposure")
def competency_exposure(db: Session = Depends(get_db_for)) -> list[dict]:
    return svc.competency_exposure(db)
