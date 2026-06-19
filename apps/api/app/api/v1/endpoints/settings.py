"""Self-service settings APIs (Phase P-N).

Admin-only configuration for runtime integrations/connections, editable from the
in-app Settings tab with a Save & Test flow. Secret values are write-only — reads
return only whether a key is set and the resulting mode.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_db_for, require_roles
from app.core.rbac import Role
from app.services import settings_service
from app.services.engines.governance import append_audit

router = APIRouter(prefix="/settings", tags=["Settings · Configuration"])

_admin = require_roles(Role.PLATFORM_ADMIN, Role.COMPANY_ADMIN)


class AIConfigIn(BaseModel):
    model: str | None = None
    gateway_url: str | None = None
    api_key: str | None = None  # write-only; blank leaves the stored key unchanged


@router.get("/ai")
def get_ai_config(user: CurrentUser = Depends(_admin), db: Session = Depends(get_db_for)) -> dict:
    return settings_service.ai_config_public(db)


@router.put("/ai")
def put_ai_config(
    body: AIConfigIn, user: CurrentUser = Depends(_admin), db: Session = Depends(get_db_for),
) -> dict:
    result = settings_service.save_ai_config(
        db, model=body.model, gateway_url=body.gateway_url,
        api_key=body.api_key, updated_by=user.id)
    append_audit(db, actor_user_id=user.id, action="UPDATE_AI_CONFIG",
                 entity="cfg_setting", entity_id="ai",
                 after={"model": result["model"], "mode": result["mode"]})
    db.commit()
    return result


@router.post("/ai/test")
def test_ai_config(user: CurrentUser = Depends(_admin), db: Session = Depends(get_db_for)) -> dict:
    return settings_service.test_ai_config(db)
