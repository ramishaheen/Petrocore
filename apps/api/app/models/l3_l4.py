"""L3 Competency Dictionary & Professional Standards · L4 Department Planning."""
from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, uuid_pk


# ---------------------------------------------------------------- L3
class Competency(Base, TimestampMixin):
    __tablename__ = "l3_competency"

    id: Mapped[str] = uuid_pk()
    code: Mapped[str] = mapped_column(String(40), unique=True)
    name_en: Mapped[str] = mapped_column(String(255))
    name_ar: Mapped[str] = mapped_column(String(255))
    # TECHNICAL | HSE | BEHAVIORAL | LEADERSHIP | DIGITAL | EVIDENCE_STANDARD
    family: Mapped[str] = mapped_column(String(30), index=True)
    description_en: Mapped[str] = mapped_column(Text, default="")
    description_ar: Mapped[str] = mapped_column(Text, default="")


class CompetencyRequirement(Base, TimestampMixin):
    """Calibration: a competency required level by role / admin level / experience / risk."""
    __tablename__ = "l3_competency_requirement"

    id: Mapped[str] = uuid_pk()
    competency_id: Mapped[str] = mapped_column(ForeignKey("l3_competency.id"))
    job_id: Mapped[str | None] = mapped_column(ForeignKey("l2_job.id"), nullable=True)
    admin_level: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1–5
    required_level: Mapped[int] = mapped_column(Integer)                     # 1–5
    # AWARENESS | BASIC | INDEPENDENT | ADVANCED | EXPERT_COACH
    min_experience_band: Mapped[str] = mapped_column(String(20), default="BASIC")
    risk_weight: Mapped[float] = mapped_column(default=1.0)
    activity_segment: Mapped[str | None] = mapped_column(String(30), nullable=True)


# ---------------------------------------------------------------- L4
class DepartmentPlan(Base, TimestampMixin):
    __tablename__ = "l4_department_plan"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    period: Mapped[str] = mapped_column(String(20))
    objectives_en: Mapped[str] = mapped_column(Text, default="")
    objectives_ar: Mapped[str] = mapped_column(Text, default="")


class OperationalRequirement(Base, TimestampMixin):
    """Output of the Operational Requirements Engine: a readiness priority."""
    __tablename__ = "l4_operational_requirement"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    plan_id: Mapped[str] = mapped_column(ForeignKey("l4_department_plan.id"))
    title_en: Mapped[str] = mapped_column(String(255))
    title_ar: Mapped[str] = mapped_column(String(255))
    required_competency_id: Mapped[str | None] = mapped_column(
        ForeignKey("l3_competency.id"), nullable=True
    )
    criticality: Mapped[str] = mapped_column(String(20), default="HIGH")          # MEDIUM|HIGH|VERY_HIGH
    readiness_priority: Mapped[str] = mapped_column(String(20), default="HIGH")
