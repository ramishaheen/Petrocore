"""Database engine, session, and Row-Level Security context helpers."""
from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False, future=True)


def set_tenant_context(db: Session, tenant_id: str | None, role: str | None) -> None:
    """Apply the per-request RLS context.

    Postgres RLS policies read these settings to restrict rows to the
    requester's tenant subtree. PLATFORM_ADMIN / NOC_EXECUTIVE bypass via a
    wildcard tenant ('*').
    """
    db.execute(text("SELECT set_config('app.current_tenant', :t, true)"),
               {"t": tenant_id or ""})
    db.execute(text("SELECT set_config('app.current_role', :r, true)"),
               {"r": role or ""})


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
