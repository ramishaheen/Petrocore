"""Self-service runtime settings (Phase P-N).

Reads/writes the global ``cfg_setting`` store and applies effective config to the
live process (e.g. reconfiguring the AI gateway singleton) so an admin can
configure + connection-test the platform entirely from the in-app Settings tab —
no code edits or redeploys. Secret values are never returned to the client; the
API exposes only a ``*_set`` boolean and the resulting mode.
"""
from __future__ import annotations

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings as env_settings
from app.models.settings import PlatformSetting
from app.services.engines.gateway import gateway

# Settings keys (kept stable — referenced by endpoints and the startup hook).
AI_MODEL = "ai.model"
AI_GATEWAY_URL = "ai.gateway_url"
AI_API_KEY = "ai.api_key"  # secret


def _get(db: Session, key: str) -> str | None:
    row = db.execute(select(PlatformSetting).where(PlatformSetting.key == key)).scalar_one_or_none()
    return row.value if row else None


def _upsert(db: Session, key: str, value: str, *, is_secret: bool = False,
            category: str = "general", updated_by: str | None = None) -> None:
    row = db.execute(select(PlatformSetting).where(PlatformSetting.key == key)).scalar_one_or_none()
    if row is None:
        db.add(PlatformSetting(key=key, value=value, is_secret=is_secret,
                               category=category, updated_by=updated_by))
    else:
        row.value = value
        row.is_secret = is_secret
        row.category = category
        row.updated_by = updated_by


def effective_ai_config(db: Session) -> dict:
    """Resolve effective AI config: DB overrides env, defaults otherwise."""
    model = _get(db, AI_MODEL) or env_settings.AI_MODEL
    gateway_url = _get(db, AI_GATEWAY_URL) or env_settings.AI_GATEWAY_URL
    api_key = _get(db, AI_API_KEY) or env_settings.AI_API_KEY
    return {"model": model, "gateway_url": gateway_url, "api_key": api_key}


def ai_config_public(db: Session) -> dict:
    """Client-safe view of the AI config — never returns the secret value."""
    cfg = effective_ai_config(db)
    return {
        "model": cfg["model"],
        "gateway_url": cfg["gateway_url"],
        "api_key_set": bool(cfg["api_key"]),
        "mode": "live" if cfg["api_key"] else "stub",
    }


def apply_ai_config(db: Session) -> None:
    """Push the effective AI config onto the live gateway singleton."""
    cfg = effective_ai_config(db)
    gateway.configure(model=cfg["model"], base_url=cfg["gateway_url"], api_key=cfg["api_key"])


def save_ai_config(db: Session, *, model: str | None = None, gateway_url: str | None = None,
                   api_key: str | None = None, updated_by: str | None = None) -> dict:
    """Persist provided AI settings (blank/omitted fields are left unchanged) and
    apply them to the live gateway. ``api_key`` is stored as a write-only secret;
    sending an empty string leaves the existing key untouched."""
    if model is not None and model.strip():
        _upsert(db, AI_MODEL, model.strip(), category="ai", updated_by=updated_by)
    if gateway_url is not None and gateway_url.strip():
        _upsert(db, AI_GATEWAY_URL, gateway_url.strip(), category="ai", updated_by=updated_by)
    if api_key is not None and api_key.strip():
        _upsert(db, AI_API_KEY, api_key.strip(), is_secret=True, category="ai", updated_by=updated_by)
    db.flush()
    apply_ai_config(db)
    return ai_config_public(db)


def test_ai_config(db: Session) -> dict:
    """Connection-test the effective AI config. In stub mode (no key) this always
    succeeds deterministically; in live mode it probes the gateway base URL."""
    cfg = effective_ai_config(db)
    if not cfg["api_key"]:
        return {"ok": True, "mode": "stub",
                "message": "Running in deterministic stub mode — no API key configured."}
    try:
        resp = httpx.get(cfg["gateway_url"], timeout=5.0)
        ok = resp.status_code < 500
        return {"ok": ok, "mode": "live",
                "message": f"Reached {cfg['gateway_url']} (HTTP {resp.status_code})."}
    except Exception as exc:  # noqa: BLE001 — surface any connection failure to the UI
        return {"ok": False, "mode": "live",
                "message": f"Could not reach {cfg['gateway_url']}: {exc}"}
