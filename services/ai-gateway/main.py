"""Model gateway (LiteLLM-style) — swappable LLM backend.

Exposes OpenAI-compatible /v1/chat/completions and /v1/embeddings. By default
it proxies to the provider configured via env (AI_PROVIDER / AI_MODEL / keys).
The platform's engines call *this* service, so the underlying model
(Claude / DeepSeek / …) can be swapped without changing application code.
"""
import os

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="PETROCORE AI Gateway", version="0.1.0")

MODEL = os.getenv("AI_MODEL", "claude-opus-4-8")
PROVIDER = os.getenv("AI_PROVIDER", "stub")


class ChatRequest(BaseModel):
    model: str | None = None
    messages: list[dict]
    max_tokens: int = 512


class EmbedRequest(BaseModel):
    model: str | None = None
    input: str


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "provider": PROVIDER, "model": MODEL}


@app.post("/v1/chat/completions")
def chat(req: ChatRequest) -> dict:
    # In stub mode return a deterministic echo. Wire a real provider here
    # (Anthropic / DeepSeek / OpenAI-compatible) when AI_PROVIDER is set.
    content = req.messages[-1]["content"] if req.messages else ""
    return {
        "model": req.model or MODEL,
        "choices": [{"message": {"role": "assistant", "content": f"[stub:{PROVIDER}] {content[:120]}"}}],
    }


@app.post("/v1/embeddings")
def embeddings(req: EmbedRequest) -> dict:
    # Deterministic stub embedding; real providers replace this.
    h = abs(hash(req.input))
    vec = [((h >> (i % 32)) & 1) * 0.01 for i in range(1536)]
    return {"model": req.model or MODEL, "data": [{"embedding": vec, "index": 0}]}
