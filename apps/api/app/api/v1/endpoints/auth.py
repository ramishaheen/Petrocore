"""Auth endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, CurrentUser
from app.core.rbac import ROLE_LABELS_AR
from app.core.security import create_access_token, verify_password
from app.db.session import get_db
from app.models.user import AppUser
from app.schemas import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.execute(select(AppUser).where(AppUser.email == body.email)).scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid credentials")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "inactive user")
    token = create_access_token(user.id, user.role, user.tenant_id)
    return TokenResponse(
        access_token=token, role=user.role,
        role_ar=ROLE_LABELS_AR.get(user.role, user.role), tenant_id=user.tenant_id,
    )


@router.get("/me")
def me(user: CurrentUser = Depends(get_current_user)) -> dict:
    return {
        "id": user.id, "role": user.role,
        "role_ar": ROLE_LABELS_AR.get(user.role, user.role),
        "tenant_id": user.tenant_id,
    }
