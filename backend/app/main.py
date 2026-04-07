from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine
from app.routers import auth, projects


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

# Routers — all scoped under /api
app.include_router(auth.router, prefix="/api")
app.include_router(projects.router, prefix="/api")


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Return a simple health status for liveness probes."""
    return {"status": "healthy"}
