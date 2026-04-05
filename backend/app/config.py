from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    DATABASE_URL: str = "postgresql+asyncpg://trawl:trawl@localhost:5432/trawl"
    REDIS_URL: str = "redis://localhost:6379/0"
    ANTHROPIC_API_KEY: str = ""
    VOYAGE_API_KEY: str = ""
    JWT_SECRET: str = "dev-secret-change-in-production"
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]


settings = Settings()
