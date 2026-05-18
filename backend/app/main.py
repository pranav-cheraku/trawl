"""FastAPI application entry point for Trawl.

Mounts all routers under /api, configures CORS and the DemoAccessMiddleware,
and defines the two health check endpoints used by Railway and Supabase.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.database import engine
from app.middleware.demo import DemoAccessMiddleware
from app.routers import apps, auth, billing, build_next, conversations, projects, sources, specs

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown lifecycle."""
    yield
    await engine.dispose()


app = FastAPI(title="Trawl API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# DemoAccessMiddleware runs inside CORS (added after = executes before in
# Starlette's reverse-add ordering). GET with valid X-Demo-Token injects
# user_id_override; non-GET with valid token returns 403 immediately.
app.add_middleware(DemoAccessMiddleware)

app.include_router(apps.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(sources.router, prefix="/api")
app.include_router(conversations.router, prefix="/api")
app.include_router(specs.router, prefix="/api")
app.include_router(billing.router, prefix="/api")
app.include_router(build_next.router, prefix="/api")


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Return a simple health status for liveness probes.

    Intentionally does NOT touch the database. Railway's container healthcheck
    uses this, and a transient DB blip should not trigger a container restart.
    """
    return {"status": "healthy"}


@app.get("/health/db")
async def health_check_db(response: Response) -> dict[str, str]:
    """Run a trivial query so a scheduled keepalive prevents Supabase idle-pause.

    The Supabase free tier pauses a project after a stretch of inactivity. The
    `supabase-keepalive` GitHub Action curls this endpoint on a schedule; the
    `SELECT 1` it issues counts as activity and keeps the project warm. Returns
    503 if the database is unreachable so the keepalive job fails loudly.
    """
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:
        logger.exception("Database health check failed")
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "unhealthy", "database": "unreachable"}
    return {"status": "healthy", "database": "reachable"}
