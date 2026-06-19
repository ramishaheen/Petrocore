"""Multi-factor ReadinessScore (System Analysis §4 / Phase P-D).

A computed, explainable readiness verdict for any entity — employee, department,
company, workforce family or role level — persisted with every contributing
factor so the result can be defended ("what was measured + how"). Tenant-scoped.
"""
from sqlalchemy import Float, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, uuid_pk


class ReadinessScore(Base, TimestampMixin):
    __tablename__ = "rs_score"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    # EMPLOYEE | DEPARTMENT | COMPANY | FAMILY | LEVEL | GROUP
    entity_type: Mapped[str] = mapped_column(String(20), index=True)
    entity_id: Mapped[str] = mapped_column(String(36), index=True)

    # Six normalized factors (0–1) — the spec's multiplicative inputs.
    competency_score: Mapped[float] = mapped_column(Float, default=0.0)
    evidence_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    data_quality: Mapped[float] = mapped_column(Float, default=0.0)
    risk_adjustment: Mapped[float] = mapped_column(Float, default=1.0)
    role_criticality: Mapped[float] = mapped_column(Float, default=1.0)
    recency: Mapped[float] = mapped_column(Float, default=1.0)

    readiness_index: Mapped[float] = mapped_column(Float, default=0.0)  # 0–100
    readiness_status: Mapped[str] = mapped_column(String(30), default="DEVELOPMENT_REQUIRED")
    # Full explainable breakdown (raw product, factors, method version, source counts).
    breakdown: Mapped[dict] = mapped_column(JSONB, default=dict)
    source_count: Mapped[int] = mapped_column(Integer, default=0)
    method_version: Mapped[str] = mapped_column(String(20), default="rs-v1")
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")
