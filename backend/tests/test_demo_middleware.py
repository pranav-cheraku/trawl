"""Tests for DemoAccessMiddleware behavior.

Verifies that a valid X-Demo-Token bypasses JWT auth for GETs (the demo
project may or may not be seeded, so 200 and 404 are both acceptable), and
that non-GET requests with a valid token are rejected with 403.
"""
from __future__ import annotations

from httpx import ASGITransport, AsyncClient

from app.config import settings
from app.main import app


async def test_demo_token_grants_get_access_to_demo_project(monkeypatch):
    """GET with X-Demo-Token resolves to demo user and bypasses JWT auth."""
    monkeypatch.setattr(settings, "DEMO_TOKEN", "demo-test-token")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            f"/api/projects/{settings.DEMO_PROJECT_ID}",
            headers={"X-Demo-Token": "demo-test-token"},
        )
    # If the demo project is seeded, this should be 200. If not, 404.
    # In either case, NOT 401 (auth bypass worked).
    assert response.status_code in (200, 404)


async def test_demo_token_rejects_non_get(monkeypatch):
    """Non-GET with valid X-Demo-Token returns 403 (demo is read-only)."""
    monkeypatch.setattr(settings, "DEMO_TOKEN", "demo-test-token")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/projects",
            headers={"X-Demo-Token": "demo-test-token", "Content-Type": "application/json"},
            json={"name": "evil"},
        )
    assert response.status_code == 403
