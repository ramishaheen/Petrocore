"""L5 Employee 360° Profile (Competency Passport) · L6 Asset & Critical Role."""
from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, uuid_pk


# ---------------------------------------------------------------- L5
class Profile(Base, TimestampMixin):
    """Single trusted profile per employee. Headline metric: readiness_index."""
    __tablename__ = "l5_profile"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(ForeignKey("l2_employee.id"), unique=True)
    readiness_index: Mapped[float] = mapped_column(Float, default=0.0)  # 0–100
    # DRAFT | MANAGER_APPROVED | HR_VALIDATED | TRUSTED
    status: Mapped[str] = mapped_column(String(20), default="DRAFT")


class ProfileApproval(Base, TimestampMixin):
    """Dual sign-off chain: LINE_MANAGER + HR_VALIDATOR ⇒ TRUSTED profile."""
    __tablename__ = "l5_profile_approval"

    id: Mapped[str] = uuid_pk()
    profile_id: Mapped[str] = mapped_column(ForeignKey("l5_profile.id"))
    approver_user_id: Mapped[str] = mapped_column(String(36))
    role: Mapped[str] = mapped_column(String(20))      # LINE_MANAGER | HR_VALIDATOR
    decision: Mapped[str] = mapped_column(String(20))  # APPROVED | REJECTED
    note: Mapped[str] = mapped_column(Text, default="")


class CompetencyResult(Base, TimestampMixin):
    """An evidence-backed competency result on a profile (produced by L7)."""
    __tablename__ = "l5_competency_result"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    profile_id: Mapped[str] = mapped_column(ForeignKey("l5_profile.id"))
    competency_id: Mapped[str] = mapped_column(ForeignKey("l3_competency.id"))
    assessed_level: Mapped[int] = mapped_column(Integer, default=0)   # 1–5
    required_level: Mapped[int] = mapped_column(Integer, default=0)   # 1–5
    confidence: Mapped[float] = mapped_column(Float, default=0.0)     # 0–1
    evidence_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    source: Mapped[str] = mapped_column(String(40), default="ASSESSMENT")
    # APPROVED | PENDING_REVIEW
    status: Mapped[str] = mapped_column(String(20), default="PENDING_REVIEW")


# ---------------------------------------------------------------- L6
class Asset(Base, TimestampMixin):
    __tablename__ = "l6_asset"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    name_en: Mapped[str] = mapped_column(String(255))
    name_ar: Mapped[str] = mapped_column(String(255))
    asset_type: Mapped[str] = mapped_column(String(60))
    activity_segment: Mapped[str | None] = mapped_column(String(30), nullable=True)


class CompetencyAssetLink(Base):
    __tablename__ = "l6_competency_asset_link"

    id: Mapped[str] = uuid_pk()
    competency_id: Mapped[str] = mapped_column(ForeignKey("l3_competency.id"))
    asset_id: Mapped[str] = mapped_column(ForeignKey("l6_asset.id"))


class CriticalRole(Base, TimestampMixin):
    __tablename__ = "l6_critical_role"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    job_id: Mapped[str] = mapped_column(ForeignKey("l2_job.id"))
    criticality: Mapped[str] = mapped_column(String(20), default="HIGH")
    loss_risk: Mapped[float] = mapped_column(Float, default=0.0)        # 0–1 likelihood
    business_impact: Mapped[float] = mapped_column(Float, default=0.0)  # 0–1 impact
