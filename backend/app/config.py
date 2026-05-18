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
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_SMALL: str = ""  # 100 credits / $5
    STRIPE_PRICE_LARGE: str = ""  # 500 credits / $20
    SIGNUP_CREDITS: int = 25
    DEMO_USER_ID: str = "00000000-0000-0000-0000-000000000002"
    DEMO_PROJECT_ID: str = "00000000-0000-0000-0000-0000000000d0"
    DEMO_TOKEN: str = "dev-demo-token-change-in-production"
    FRONTEND_URL: str = "http://localhost:3000"


settings = Settings()
