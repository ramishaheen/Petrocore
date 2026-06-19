"""Extensible core (System Analysis §1, §3.1) — configurability-first foundations.

These make the platform a scalable core rather than a closed tool:
- LookupType/LookupValue   — configurable master data (no code changes to add lists)
- EntityType/EntityLink    — link any entity to any entity (future-proof relationships)
- CustomFieldDefinition/Value — per-entity custom attributes without schema changes

Config tables (lookups, entity types, custom-field definitions) are global; the
*data* tables (EntityLink, CustomFieldValue) are tenant-scoped (RLS).
"""
from datetime import date

from sqlalchemy import Boolean, Date, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, uuid_pk


# ---------------------------------------------------------------- Master data
class LookupType(Base, TimestampMixin):
    __tablename__ = "cfg_lookup_type"

    id: Mapped[str] = uuid_pk()
    code: Mapped[str] = mapped_column(String(60), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class LookupValue(Base, TimestampMixin):
    __tablename__ = "cfg_lookup_value"

    id: Mapped[str] = uuid_pk()
    lookup_type_id: Mapped[str] = mapped_column(ForeignKey("cfg_lookup_type.id"), index=True)
    value_code: Mapped[str] = mapped_column(String(60))
    name_ar: Mapped[str] = mapped_column(String(200))
    name_en: Mapped[str] = mapped_column(String(200))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    parent_value_id: Mapped[str | None] = mapped_column(ForeignKey("cfg_lookup_value.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


# ---------------------------------------------------------------- Generic links
class EntityType(Base, TimestampMixin):
    __tablename__ = "cfg_entity_type"

    id: Mapped[str] = uuid_pk()
    code: Mapped[str] = mapped_column(String(60), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class EntityLink(Base, TimestampMixin):
    """Any entity ↔ any entity. The future-proofing seam for the whole platform."""
    __tablename__ = "cfg_entity_link"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    source_entity_type: Mapped[str] = mapped_column(String(60), index=True)
    source_entity_id: Mapped[str] = mapped_column(String(36), index=True)
    target_entity_type: Mapped[str] = mapped_column(String(60), index=True)
    target_entity_id: Mapped[str] = mapped_column(String(36), index=True)
    # Required | Supports | DependsOn | Impacts | EvidenceFor | …
    link_type: Mapped[str] = mapped_column(String(40), default="Supports")
    relationship_weight: Mapped[float] = mapped_column(Float, default=1.0)
    criticality_level: Mapped[str | None] = mapped_column(String(20), nullable=True)
    effective_from: Mapped[date | None] = mapped_column(Date, nullable=True)
    effective_to: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


# ---------------------------------------------------------------- Custom fields
class CustomFieldDefinition(Base, TimestampMixin):
    __tablename__ = "cfg_custom_field_def"

    id: Mapped[str] = uuid_pk()
    entity_type: Mapped[str] = mapped_column(String(60), index=True)
    field_code: Mapped[str] = mapped_column(String(60))
    name_ar: Mapped[str] = mapped_column(String(200))
    name_en: Mapped[str] = mapped_column(String(200))
    data_type: Mapped[str] = mapped_column(String(20), default="Text")  # Text|Number|Date|Boolean|JSON
    is_required: Mapped[bool] = mapped_column(Boolean, default=False)
    validation_rule: Mapped[str] = mapped_column(Text, default="")
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")


class CustomFieldValue(Base, TimestampMixin):
    __tablename__ = "cfg_custom_field_value"

    id: Mapped[str] = uuid_pk()
    tenant_id: Mapped[str] = mapped_column(String(36), index=True, default="*")
    entity_type: Mapped[str] = mapped_column(String(60), index=True)
    entity_id: Mapped[str] = mapped_column(String(36), index=True)
    custom_field_id: Mapped[str] = mapped_column(ForeignKey("cfg_custom_field_def.id"))
    value_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    value_number: Mapped[float | None] = mapped_column(Float, nullable=True)
    value_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    value_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")
