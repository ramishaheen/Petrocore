"""Pydantic schemas (request/response DTOs)."""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---- auth ----
class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    role_ar: str
    tenant_id: str | None = None


# ---- L1 ----
class OrgNodeOut(ORMModel):
    id: str
    parent_id: str | None
    node_type: str
    code: str | None
    name_en: str
    name_ar: str
    activity_segment: str | None


# ---- L3 ----
class CompetencyOut(ORMModel):
    id: str
    code: str
    name_en: str
    name_ar: str
    family: str
    description_en: str
    description_ar: str


# ---- L5 ----
class CompetencyResultOut(ORMModel):
    id: str
    competency_id: str
    assessed_level: int
    required_level: int
    confidence: float
    status: str


class ProfileOut(ORMModel):
    id: str
    employee_id: str
    readiness_index: float
    status: str


# ---- L7 ----
class AssessmentSubmit(BaseModel):
    employee_id: str
    competency_id: str
    item_scores: list[float]
    evidence_count: int = 0


class AssessmentResult(BaseModel):
    assessed_level: int
    required_level: int
    confidence: float
    status: str
    needs_human_review: bool


# ---- L8 ----
class GapOut(ORMModel):
    id: str
    scope: str
    subject_id: str
    competency_id: str
    current_level: int
    target_level: int
    gap_size: int
    priority: str
    confidence: float


# ---- Governance ----
class DecisionResolve(BaseModel):
    approve: bool


# ---- Readiness diagnostic ----
class LayerReadiness(BaseModel):
    layer: str
    name_en: str
    name_ar: str
    status: str  # READY | NEEDS_REVIEW | NEEDS_BUILD
    detail: str
