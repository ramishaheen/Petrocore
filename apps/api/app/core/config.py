"""Application configuration (env-driven)."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "dev-secret-change-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    ALGORITHM: str = "HS256"

    DATABASE_URL: str = "postgresql+psycopg://petrocore:petrocore@db:5432/petrocore"
    REDIS_URL: str = "redis://redis:6379/0"

    API_CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # AI gateway — model is swappable (claude / deepseek / ...)
    AI_GATEWAY_URL: str = "http://ai-gateway:9000"
    AI_MODEL: str = "claude-opus-4-8"
    AI_API_KEY: str = ""
    CONFIDENCE_REVIEW_THRESHOLD: float = 0.75

    # 32-byte url-safe base64 key for field-level PII encryption (Fernet).
    # Dev default — override with a freshly generated key in production:
    #   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    PII_ENCRYPTION_KEY: str = "gLlLqOkE6MJl5Njt0B9la0mdCSa1yQ0LmzPAkROjCeQ="

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.API_CORS_ORIGINS.split(",") if o.strip()]

    @property
    def sqlalchemy_url(self) -> str:
        """Normalize managed-Postgres URLs (e.g. Render/Neon/Heroku give
        ``postgres://`` or ``postgresql://``) to the psycopg 3 driver."""
        u = self.DATABASE_URL
        for prefix in ("postgresql+psycopg://", "postgresql+psycopg2://"):
            if u.startswith(prefix):
                return u
        if u.startswith("postgresql://"):
            return "postgresql+psycopg://" + u[len("postgresql://"):]
        if u.startswith("postgres://"):
            return "postgresql+psycopg://" + u[len("postgres://"):]
        return u


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
