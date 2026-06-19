"""Shared API dependencies: current user, RLS context, RBAC guards."""
from collections.abc import Generator

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.rbac import Role
from app.core.security import decode_token
from app.db.session import SessionLocal, set_tenant_context
from app.models.user import AppUser


class CurrentUser:
    def __init__(self, user_id: str, role: str, tenant_id: str | None):
        self.id = user_id
        self.role = role
        self.tenant_id = tenant_id


def get_current_user(authorization: str = Header(default="")) -> CurrentUser:
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "missing bearer token")
    token = authorization.split(" ", 1)[1]
    try:
        claims = decode_token(token)
    except ValueError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid token")
    return CurrentUser(claims["sub"], claims.get("role", ""), claims.get("tenant"))


def get_db_for(user: CurrentUser = Depends(get_current_user)) -> Generator[Session, None, None]:
    """Session with RLS tenant/role context applied for the request's user."""
    db = SessionLocal()
    try:
        set_tenant_context(db, user.tenant_id, user.role)
        yield db
    finally:
        db.close()


def require_roles(*roles: Role):
    allowed = {r.value for r in roles}

    def guard(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in allowed:
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"requires one of {sorted(allowed)}")
        return user

    return guard
