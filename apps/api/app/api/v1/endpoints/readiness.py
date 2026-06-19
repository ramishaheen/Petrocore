"""Phase P-D APIs: multi-factor, explainable ReadinessScore per entity."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_db_for, require_roles
from app.core.rbac import Role
from app.models.readiness import ReadinessScore
from app.services import readiness_service
from app.services.engines.readiness_engine import STATUS_CATALOG

router = APIRouter(tags=["P-D · Multi-factor Readiness"])

# Readiness is computed by people accountable for workforce decisions.
_compute = require_roles(
    Role.HR_VALIDATOR, Role.LINE_MANAGER, Role.DEPT_MANAGER, Role.LD_MANAGER,
    Role.COMPANY_ADMIN, Role.NOC_EXECUTIVE, Role.PLATFORM_ADMIN, Role.CONSULTANT,
)


@router.get("/readiness/statuses")
def readiness_statuses() -> list[dict]:
    """The configurable readiness status vocabulary (bilingual)."""
    return [{"code": code, "name_en": en, "name_ar": ar} for code, en, ar in STATUS_CATALOG]


@router.post("/readiness/employees/{employee_id}/compute")
def compute_employee(
    employee_id: str,
    user: CurrentUser = Depends(_compute),
    db: Session = Depends(get_db_for),
) -> dict:
    try:
        result = readiness_service.compute_for_employee(db, actor_user_id=user.id, employee_id=employee_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    db.commit()
    return result


@router.get("/readiness/employees/{employee_id}")
def get_employee_readiness(employee_id: str, db: Session = Depends(get_db_for)) -> dict:
    score = readiness_service.latest_for(db, "EMPLOYEE", employee_id)
    if not score:
        return {"entity_type": "EMPLOYEE", "entity_id": employee_id, "readiness_index": None,
                "readiness_status": None, "factors": None}
    return readiness_service._serialize(score)


@router.post("/readiness/nodes/{node_id}/compute")
def compute_node(
    node_id: str,
    entity_type: str = "DEPARTMENT",
    user: CurrentUser = Depends(_compute),
    db: Session = Depends(get_db_for),
) -> dict:
    result = readiness_service.compute_for_node(
        db, actor_user_id=user.id, node_id=node_id, entity_type=entity_type)
    db.commit()
    return result


@router.get("/readiness/nodes/{node_id}")
def get_node_readiness(
    node_id: str, entity_type: str = "DEPARTMENT", db: Session = Depends(get_db_for)
) -> dict:
    score = readiness_service.latest_for(db, entity_type, node_id)
    if not score:
        return {"entity_type": entity_type, "entity_id": node_id, "readiness_index": None,
                "readiness_status": None, "factors": None}
    return readiness_service._serialize(score)


@router.get("/readiness")
def list_readiness(
    entity_type: str | None = None, db: Session = Depends(get_db_for)
) -> list[dict]:
    """Latest readiness score per entity (RLS-scoped), optionally by entity type."""
    stmt = select(ReadinessScore).order_by(ReadinessScore.created_at.desc())
    if entity_type:
        stmt = stmt.where(ReadinessScore.entity_type == entity_type)
    rows = db.execute(stmt).scalars().all()
    seen: set[tuple[str, str]] = set()
    out: list[dict] = []
    for r in rows:
        key = (r.entity_type, r.entity_id)
        if key in seen:
            continue
        seen.add(key)
        out.append({"entity_type": r.entity_type, "entity_id": r.entity_id,
                    "readiness_index": r.readiness_index, "readiness_status": r.readiness_status,
                    "source_count": r.source_count})
    return out
