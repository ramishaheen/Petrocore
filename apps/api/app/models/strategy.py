"""Strategy cascade (System Analysis §27.1 / Phase P-J).

Corporate → department → role → employee objectives, KPIs, objective↔competency
alignment, and a computed Strategic Readiness Gap that ties strategy to the
competency/readiness engine. Tenant-scoped.
"""
from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, uuid_pk


class StrategicObjective(Base, TimestampMixin):
    __tablename__ = "st_objective"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    # CORPORATE | DEPARTMENT | ROLE | EMPLOYEE
    level: Mapped[str] = mapped_column(String(20), default="CORPORATE")
    parent_objective_id: Mapped[str | None] = mapped_column(ForeignKey("st_objective.id"), nullable=True)
    owner_ref: Mapped[str | None] = mapped_column(String(36), nullable=True)  # node/role/employee id
    title_en: Mapped[str] = mapped_column(String(255))
    title_ar: Mapped[str] = mapped_column(String(255))
    period: Mapped[str] = mapped_column(String(40), default="")
    weight: Mapped[float] = mapped_column(Float, default=1.0)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class StrategicKpi(Base, TimestampMixin):
    __tablename__ = "st_kpi"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    objective_id: Mapped[str | None] = mapped_column(ForeignKey("st_objective.id"), nullable=True)
    code: Mapped[str] = mapped_column(String(60))
    name_en: Mapped[str] = mapped_column(String(200))
    name_ar: Mapped[str] = mapped_column(String(200))
    target_value: Mapped[float] = mapped_column(Float, default=0.0)
    current_value: Mapped[float] = mapped_column(Float, default=0.0)
    unit: Mapped[str] = mapped_column(String(40), default="")
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class ObjectiveCompetency(Base, TimestampMixin):
    """Objective ↔ competency alignment with the level the objective demands."""
    __tablename__ = "st_objective_competency"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    objective_id: Mapped[str] = mapped_column(ForeignKey("st_objective.id"), index=True)
    competency_id: Mapped[str] = mapped_column(ForeignKey("l3_competency.id"))
    required_level: Mapped[int] = mapped_column(Integer, default=4)
    weight: Mapped[float] = mapped_column(Float, default=1.0)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class StrategicReadinessGap(Base, TimestampMixin):
    __tablename__ = "st_readiness_gap"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    objective_id: Mapped[str] = mapped_column(ForeignKey("st_objective.id"), index=True)
    competency_id: Mapped[str] = mapped_column(ForeignKey("l3_competency.id"))
    required_level: Mapped[int] = mapped_column(Integer, default=0)
    actual_avg_level: Mapped[float] = mapped_column(Float, default=0.0)
    gap: Mapped[float] = mapped_column(Float, default=0.0)
    readiness_pct: Mapped[float] = mapped_column(Float, default=0.0)
    notes: Mapped[str] = mapped_column(Text, default="")
