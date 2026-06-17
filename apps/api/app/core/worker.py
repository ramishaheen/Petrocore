"""Celery worker for async assessment scoring, fusion jobs, impact recompute."""
from celery import Celery

from app.core.config import settings

celery_app = Celery("petrocore", broker=settings.REDIS_URL, backend=settings.REDIS_URL)


@celery_app.task
def recompute_readiness(employee_id: str) -> dict:
    """Placeholder async task: recompute a profile's readiness index (L8 → L5)."""
    return {"employee_id": employee_id, "recomputed": True}
