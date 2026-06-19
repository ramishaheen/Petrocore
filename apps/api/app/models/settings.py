"""Runtime platform settings (Phase P-N — self-service configuration).

Key/value settings editable from the in-app Settings tab (AI gateway, etc.) so
the platform can be configured + connection-tested from the UI without code or
redeploys. Global, admin-managed config (no tenant scope); secret values are
write-only (never returned to the client).
"""
from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, uuid_pk


class PlatformSetting(Base, TimestampMixin):
    __tablename__ = "cfg_setting"

    id: Mapped[str] = uuid_pk()
    key: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    value: Mapped[str] = mapped_column(Text, default="")
    is_secret: Mapped[bool] = mapped_column(Boolean, default=False)
    category: Mapped[str] = mapped_column(String(40), default="general")
    updated_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
