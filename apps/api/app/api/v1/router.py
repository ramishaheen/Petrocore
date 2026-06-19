"""Aggregate v1 router."""
from fastapi import APIRouter

from app.api.v1.endpoints import (
    analytics, assessment, assessment_blueprint, assessment_exec, auth, competency,
    competency_depth, config, dashboards, development, enablement, gaps, governance,
    integration, operations, org, profile, readiness, reports, strategy, talent,
    training, workflow, workforce,
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
api_router.include_router(config.router)
api_router.include_router(workforce.router)
api_router.include_router(competency_depth.router)
api_router.include_router(assessment_blueprint.router)
api_router.include_router(readiness.router)
api_router.include_router(talent.router)
api_router.include_router(analytics.router)
api_router.include_router(assessment_exec.router)
api_router.include_router(development.router)
api_router.include_router(operations.router)
api_router.include_router(strategy.router)
api_router.include_router(workflow.router)
