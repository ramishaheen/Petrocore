"""360° PETROCORE API entrypoint."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api.v1.router import api_router
from app.core.config import settings

app = FastAPI(
    title="360° PETROCORE API",
    description="AI-Driven Competency & Workforce Readiness Intelligence Platform",
    version=__version__,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request, call_next):
    """Baseline security headers (hardening)."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


app.include_router(api_router, prefix="/api/v1")


@app.on_event("startup")
def _apply_runtime_settings() -> None:
    """Apply self-service settings (e.g. AI gateway config saved from the Settings
    tab) to the live process at boot. Best-effort — never block startup."""
    try:
        from app.db.session import SessionLocal
        from app.services.settings_service import apply_ai_config

        db = SessionLocal()
        try:
            apply_ai_config(db)
        finally:
            db.close()
    except Exception:  # noqa: BLE001 — settings are optional; stub mode is the default
        pass


@app.get("/health", tags=["meta"])
def health() -> dict:
    return {"status": "ok", "version": __version__, "environment": settings.ENVIRONMENT}
