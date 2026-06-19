"""Integration registry & sync log (System Analysis §25 / Phase P-F).

A registry of external-system connectors (HR/LMS/ERP/CMMS/HSE/DMS/IAM/BI) and an
append-only sync log. Platform-level configuration (not tenant-scoped) — only
platform/integration admins manage it — so these tables carry no RLS.
"""
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, uuid_pk


class IntegrationConnector(Base, TimestampMixin):
    __tablename__ = "intg_connector"

    id: Mapped[str] = uuid_pk()
    code: Mapped[str] = mapped_column(String(60), unique=True, index=True)
    name_en: Mapped[str] = mapped_column(String(160))
    name_ar: Mapped[str] = mapped_column(String(160))
    # HR | LMS | ERP | CMMS | HSE | DMS | IAM | BI
    system_type: Mapped[str] = mapped_column(String(20), index=True)
    direction: Mapped[str] = mapped_column(String(20), default="INBOUND")  # INBOUND|OUTBOUND|BIDIRECTIONAL
    # PLANNED | CONFIGURED | ACTIVE | DISABLED
    status: Mapped[str] = mapped_column(String(20), default="PLANNED")
    sync_mode: Mapped[str] = mapped_column(String(20), default="MANUAL")  # MANUAL|SCHEDULED|REALTIME
    config: Mapped[dict] = mapped_column(JSONB, default=dict)
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class IntegrationSyncLog(Base, TimestampMixin):
    __tablename__ = "intg_sync_log"

    id: Mapped[str] = uuid_pk()
    connector_code: Mapped[str] = mapped_column(String(60), index=True)
    direction: Mapped[str] = mapped_column(String(20), default="INBOUND")
    entity_type: Mapped[str] = mapped_column(String(60), default="")
    records_in: Mapped[int] = mapped_column(Integer, default=0)
    records_ok: Mapped[int] = mapped_column(Integer, default=0)
    records_failed: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="SUCCESS")  # SUCCESS|PARTIAL|FAILED
    message: Mapped[str] = mapped_column(Text, default="")
