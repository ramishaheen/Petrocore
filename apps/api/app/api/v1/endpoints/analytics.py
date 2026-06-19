"""Phase P-F APIs: workforce planning, predictive readiness, knowledge graph,
psychometrics & calibration, and cross-company benchmarking (read-only analytics)."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db_for
from app.services import (
    benchmarking_service, knowledge_graph_service, predictive_service,
    psychometrics_service, workforce_planning_service,
)

router = APIRouter(tags=["P-F · Planning, Prediction & Intelligence"])


# ---------------------------------------------------------------- workforce planning
@router.get("/workforce-planning/overview")
def wfp_overview(db: Session = Depends(get_db_for)) -> dict:
    return workforce_planning_service.overview(db)


@router.get("/workforce-planning/supply-demand")
def wfp_supply_demand(db: Session = Depends(get_db_for)) -> list[dict]:
    return workforce_planning_service.supply_demand(db)


@router.get("/workforce-planning/coverage")
def wfp_coverage(db: Session = Depends(get_db_for)) -> list[dict]:
    return workforce_planning_service.critical_role_coverage(db)


@router.get("/workforce-planning/retirement-risk")
def wfp_retirement(db: Session = Depends(get_db_for)) -> list[dict]:
    return workforce_planning_service.retirement_risk(db)


@router.get("/workforce-planning/training-demand")
def wfp_training_demand(db: Session = Depends(get_db_for)) -> list[dict]:
    return workforce_planning_service.training_demand(db)


# ---------------------------------------------------------------- predictive readiness
@router.get("/readiness/forecast/{employee_id}")
def readiness_forecast(employee_id: str, horizon_months: int = 12, db: Session = Depends(get_db_for)) -> dict:
    return predictive_service.forecast_employee(db, employee_id, horizon_months)


@router.get("/readiness/forecast")
def readiness_pipeline_forecast(horizon_months: int = 12, db: Session = Depends(get_db_for)) -> dict:
    return predictive_service.pipeline_forecast(db, horizon_months)


# ---------------------------------------------------------------- knowledge graph
@router.get("/knowledge-graph")
def knowledge_graph(
    entity_type: str | None = None, entity_id: str | None = None,
    depth: int = 2, db: Session = Depends(get_db_for),
) -> dict:
    return knowledge_graph_service.graph(db, entity_type=entity_type, entity_id=entity_id, depth=depth)


@router.get("/knowledge-graph/summary")
def knowledge_graph_summary(db: Session = Depends(get_db_for)) -> dict:
    return knowledge_graph_service.summary(db)


# ---------------------------------------------------------------- psychometrics
@router.get("/psychometrics/question-quality")
def question_quality(db: Session = Depends(get_db_for)) -> list[dict]:
    return psychometrics_service.question_quality(db)


@router.get("/psychometrics/reliability")
def assessment_reliability(db: Session = Depends(get_db_for)) -> dict:
    return psychometrics_service.assessment_reliability(db)


# ---------------------------------------------------------------- benchmarking
@router.get("/benchmarking/companies")
def benchmarking_companies(db: Session = Depends(get_db_for)) -> list[dict]:
    return benchmarking_service.companies(db)
