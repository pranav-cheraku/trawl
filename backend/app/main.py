from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine
from app.middleware.demo import DemoAccessMiddleware
from app.routers import apps, auth, billing, build_next, conversations, projects, sources, specs


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
    """Return a simple health status for liveness probes."""
    return {"status": "healthy"}
