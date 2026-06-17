"""Aggregate v1 router."""
from fastapi import APIRouter

from app.api.v1.endpoints import (
    assessment, auth, competency, dashboards, enablement, gaps, governance,
    integration, org, profile, reports, training,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(org.router)
api_router.include_router(competency.router)
api_router.include_router(profile.router)
api_router.include_router(assessment.router)
api_router.include_router(gaps.router)
api_router.include_router(training.router)
api_router.include_router(governance.router)
api_router.include_router(dashboards.router)
api_router.include_router(reports.router)
api_router.include_router(enablement.router)
api_router.include_router(integration.router)
