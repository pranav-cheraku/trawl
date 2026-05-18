"""Integration tests for the Stripe webhook handler.

Uses a real HMAC signature built with the test webhook secret so the handler
goes through the full Stripe SDK verification path. Tests commit rows to the
dev DB and clean them up explicitly in finally blocks because the db fixture's
rollback is a no-op after an explicit commit.
"""
from __future__ import annotations

import hmac
import json
import time
import uuid
from hashlib import sha256

from httpx import AsyncClient, ASGITransport
from sqlalchemy import text

from app.config import settings
from app.database import engine as _app_engine
from app.main import app
from app.routers import billing as _billing_module


def _stripe_signed(body: bytes, secret: str) -> str:
    """Build a Stripe-Signature header for a given payload."""
    timestamp = int(time.time())
    signed_payload = f"{timestamp}.{body.decode()}"
    sig = hmac.new(secret.encode(), signed_payload.encode(), sha256).hexdigest()
    return f"t={timestamp},v1={sig}"


def _make_event(user_id: uuid.UUID, price_id: str, event_id: str) -> dict:
    # "object": "event" at the top level and "object": "checkout.session" in the
    # nested object are required by Stripe SDK 15.x's construct_event parser.
    return {
        "id": event_id,
        "object": "event",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_123",
                "object": "checkout.session",
                "client_reference_id": str(user_id),
                "metadata": {
                    "user_id": str(user_id),
                    "price_id": price_id,
                },
            }
        },
    }


async def _cleanup(db, user_id: uuid.UUID, event_id: str) -> None:
    """Delete committed test rows so the dev DB stays predictable across runs.

    Also disposes the app's module-level engine pool so the next test starts
    with fresh connections on its own event loop (prevents asyncpg cross-loop
    errors when asyncio_mode=function gives each test a separate loop).
    """
    await db.execute(
        text("DELETE FROM stripe_processed_events WHERE event_id = :eid"),
        {"eid": event_id},
    )
    await db.execute(
        text("DELETE FROM users WHERE id = :uid"),
        {"uid": user_id},
    )
    await db.commit()
    # Force the app's connection pool to drop its connections. Without this,
    # pool connections created during one test's event loop are reused in the
    # next test's loop, triggering "Future attached to a different loop".
    await _app_engine.dispose()


async def test_webhook_credits_user_on_completed_checkout(db, test_user, monkeypatch):
    _billing_module.CREDITS_PER_PRICE.clear()  # reset lazy cache before monkeypatch
    monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test")
    monkeypatch.setattr(settings, "STRIPE_PRICE_SMALL", "price_small_test")

    event_id = f"evt_happy_{uuid.uuid4().hex}"
    event = _make_event(test_user.id, "price_small_test", event_id)
    body = json.dumps(event).encode()
    sig = _stripe_signed(body, "whsec_test")

    await db.commit()  # persist fixture

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/billing/webhook",
                content=body,
                headers={"Stripe-Signature": sig, "Content-Type": "application/json"},
            )
        assert response.status_code == 200
        await db.refresh(test_user)
        assert test_user.credits_balance == 110  # 10 starting + 100 from small
    finally:
        await _cleanup(db, test_user.id, event_id)


async def test_webhook_idempotent_replay(db, test_user, monkeypatch):
    """Same event delivered twice credits only once."""
    _billing_module.CREDITS_PER_PRICE.clear()  # reset lazy cache before monkeypatch
    monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test")
    monkeypatch.setattr(settings, "STRIPE_PRICE_SMALL", "price_small_test")

    event_id = f"evt_replay_{uuid.uuid4().hex}"
    event = _make_event(test_user.id, "price_small_test", event_id)
    body = json.dumps(event).encode()
    sig = _stripe_signed(body, "whsec_test")
    await db.commit()

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            await client.post(
                "/api/billing/webhook", content=body, headers={"Stripe-Signature": sig}
            )
            await client.post(
                "/api/billing/webhook", content=body, headers={"Stripe-Signature": sig}
            )

        await db.refresh(test_user)
        assert test_user.credits_balance == 110  # not 210
    finally:
        await _cleanup(db, test_user.id, event_id)


async def test_webhook_rejects_bad_signature(db, test_user, monkeypatch):
    monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_test")
    event_id = f"evt_bad_{uuid.uuid4().hex}"
    event = _make_event(test_user.id, "price_small_test", event_id)
    body = json.dumps(event).encode()
    await db.commit()

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/billing/webhook",
                content=body,
                headers={"Stripe-Signature": "bogus"},
            )
        assert response.status_code == 400
    finally:
        # Bad-signature test never inserts a stripe_processed_events row (the
        # handler returns 400 before touching the DB), but still must remove
        # the committed test_user and dispose the app engine pool.
        await db.execute(
            text("DELETE FROM users WHERE id = :uid"), {"uid": test_user.id}
        )
        await db.commit()
        await _app_engine.dispose()
