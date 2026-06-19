"""Workforce segmentation layer (System Analysis §2.2, §6, §3.3).

Every employee is classified before assessment: Family → Stream → Archetype →
Level → Context. These are global configuration (not tenant-scoped) so the same
professional reference applies across all companies.
"""
from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, uuid_pk


class WorkforceFamily(Base, TimestampMixin):
    __tablename__ = "wf_family"

    id: Mapped[str] = uuid_pk()
    code: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    name_ar: Mapped[str] = mapped_column(String(160))
    name_en: Mapped[str] = mapped_column(String(160))
    # Technical | Administrative | Financial | Leadership | Support
    family_domain: Mapped[str] = mapped_column(String(40), default="Technical")
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class CareerStream(Base, TimestampMixin):
    __tablename__ = "wf_career_stream"

    id: Mapped[str] = uuid_pk()
    code: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    name_ar: Mapped[str] = mapped_column(String(160))
    name_en: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class RoleLevel(Base, TimestampMixin):
    __tablename__ = "wf_role_level"

    id: Mapped[str] = uuid_pk()
    level_code: Mapped[str] = mapped_column(String(10), unique=True, index=True)  # L1..L8
    name_ar: Mapped[str] = mapped_column(String(120))
    name_en: Mapped[str] = mapped_column(String(120))
    level_rank: Mapped[int] = mapped_column(Integer, default=1)
    typical_authority: Mapped[str] = mapped_column(Text, default="")
    typical_complexity: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class RoleArchetype(Base, TimestampMixin):
    __tablename__ = "wf_role_archetype"

    id: Mapped[str] = uuid_pk()
    code: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    name_ar: Mapped[str] = mapped_column(String(160))
    name_en: Mapped[str] = mapped_column(String(160))
    family_id: Mapped[str | None] = mapped_column(ForeignKey("wf_family.id"), nullable=True)
    stream_id: Mapped[str | None] = mapped_column(ForeignKey("wf_career_stream.id"), nullable=True)
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")
