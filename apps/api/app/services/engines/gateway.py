"""Model gateway (LiteLLM-style). The underlying LLM is swappable.

If ``AI_API_KEY`` is unset the gateway runs in **deterministic stub mode** so the
whole platform is runnable and testable offline. Wiring a real key/endpoint
flips the same interface to live model calls without touching the engines.
"""
from __future__ import annotations

import hashlib
import json

import httpx

from app.core.config import settings


class ModelGateway:
    def __init__(self) -> None:
        self.model = settings.AI_MODEL
        self.api_key = settings.AI_API_KEY
        self.base_url = settings.AI_GATEWAY_URL
        self.live = bool(self.api_key)

    def configure(self, *, model: str | None = None, base_url: str | None = None,
                  api_key: str | None = None) -> None:
        """Apply runtime config (from the in-app Settings tab) to the live singleton."""
        if model is not None:
            self.model = model
        if base_url is not None:
            self.base_url = base_url
        if api_key is not None:
            self.api_key = api_key
        self.live = bool(self.api_key)

    # ---- text completion -------------------------------------------------
    def complete(self, system: str, prompt: str, *, max_tokens: int = 512) -> str:
        if not self.live:
            return self._stub_complete(prompt)
        resp = httpx.post(
            f"{self.base_url}/v1/chat/completions",
            headers={"Authorization": f"Bearer {self.api_key}"},
            json={
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
                "max_tokens": max_tokens,
            },
            timeout=60,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]

    # ---- embeddings ------------------------------------------------------
    def embed(self, text: str, dim: int = 1536) -> list[float]:
        """Deterministic pseudo-embedding in stub mode (stable across runs)."""
        if not self.live:
            return self._stub_embed(text, dim)
        resp = httpx.post(
            f"{self.base_url}/v1/embeddings",
            headers={"Authorization": f"Bearer {self.api_key}"},
            json={"model": self.model, "input": text},
            timeout=60,
        )
        resp.raise_for_status()
        return resp.json()["data"][0]["embedding"]

    # ---- deterministic stubs --------------------------------------------
    @staticmethod
    def _stub_complete(prompt: str) -> str:
        digest = hashlib.sha256(prompt.encode()).hexdigest()
        return json.dumps({"stub": True, "ref": digest[:12]})

    @staticmethod
    def _stub_embed(text: str, dim: int) -> list[float]:
        seed = hashlib.sha256(text.encode()).digest()
        vals: list[float] = []
        i = 0
        while len(vals) < dim:
            b = seed[i % len(seed)]
            vals.append((b / 255.0) * 2 - 1)
            i += 1
        norm = sum(v * v for v in vals) ** 0.5 or 1.0
        return [v / norm for v in vals]


gateway = ModelGateway()
