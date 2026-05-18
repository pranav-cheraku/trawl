from __future__ import annotations

import logging
import uuid
from typing import Any

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.billing import CheckoutRequest, CheckoutResponse, CreditBalance
from app.services.credits import increment_credits

logger = logging.getLogger(__name__)
stripe.api_key = settings.STRIPE_SECRET_KEY
if not settings.STRIPE_SECRET_KEY:
    logger.warning(
        "STRIPE_SECRET_KEY is not configured; billing endpoints will return 502 on every request"
    )

# Stripe price_id → credits. Configured via env, not hardcoded.
CREDITS_PER_PRICE: dict[str, int] = {}


def _credits_for_price(price_id: str) -> int | None:
    """Lazy-build the mapping so settings are read at request time, not import."""
    if not CREDITS_PER_PRICE:
        if settings.STRIPE_PRICE_SMALL:
            CREDITS_PER_PRICE[settings.STRIPE_PRICE_SMALL] = 100
        if settings.STRIPE_PRICE_LARGE:
            CREDITS_PER_PRICE[settings.STRIPE_PRICE_LARGE] = 500
    return CREDITS_PER_PRICE.get(price_id)


router = APIRouter(tags=["billing"])


@router.get(
    "/billing/me",
    response_model=CreditBalance,
    summary="Return the current user's credit balance",
)
async def get_balance(
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user),
) -> CreditBalance:
    """Return the authenticated user's current credit balance."""
    result = await db.execute(select(User.credits_balance).where(User.id == user_id))
    balance = result.scalar_one_or_none()
    if balance is None:
        raise HTTPException(status_code=404, detail="User not found")
    return CreditBalance(credits_balance=int(balance))


@router.post(
    "/billing/checkout",
    response_model=CheckoutResponse,
    summary="Create a Stripe Checkout Session and return its URL",
)
async def create_checkout(
    body: CheckoutRequest,
    user_id: uuid.UUID = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CheckoutResponse:
    """Create a Stripe Checkout Session for a one-time credit purchase."""
    if _credits_for_price(body.price_id) is None:
        raise HTTPException(status_code=400, detail="Unknown price_id")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one()

    try:
        # consent_collection.terms_of_service renders a required "I agree to
        # the Terms of Service" checkbox on the Stripe-hosted Checkout page.
        # The linked URL is pulled from the Terms of Service URL configured in
        # the Stripe Dashboard — it MUST be set in both test and live mode, or
        # Session.create raises a StripeError and checkout returns 502.
        session = await stripe.checkout.Session.create_async(
            mode="payment",
            line_items=[{"price": body.price_id, "quantity": 1}],
            success_url=f"{settings.FRONTEND_URL}/billing?status=success",
            cancel_url=f"{settings.FRONTEND_URL}/billing?status=cancelled",
            customer_email=user.email,
            client_reference_id=str(user.id),
            consent_collection={"terms_of_service": "required"},
            metadata={"user_id": str(user.id), "price_id": body.price_id},
        )
    except stripe.StripeError as exc:
        # Log the underlying Stripe error; the client gets a generic message.
        logger.exception("Stripe checkout creation failed")
        raise HTTPException(
            status_code=502,
            detail="Could not start checkout. Please try again later.",
        ) from exc

    if session.url is None:
        raise HTTPException(status_code=502, detail="Stripe did not return a URL")
    return CheckoutResponse(url=session.url)


@router.post(
    "/billing/webhook",
    status_code=status.HTTP_200_OK,
    summary="Stripe webhook receiver — credits balance on checkout completion",
)
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Verify the Stripe signature, dedupe by event_id, and credit the user."""
    sig_header = request.headers.get("Stripe-Signature", "")
    payload = await request.body()

    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=sig_header,
            secret=settings.STRIPE_WEBHOOK_SECRET,
        )
    except (ValueError, stripe.SignatureVerificationError) as exc:
        raise HTTPException(status_code=400, detail="Invalid signature") from exc

    event_id = event.id

    # Atomic dedup: INSERT ... ON CONFLICT returns the row only if newly inserted.
    # Concurrent duplicate deliveries: exactly one INSERT wins, others return zero rows.
    # No exception handling needed — transient DB errors surface as 500, not silent
    # duplicate: True, so Stripe will retry on genuine failures.
    insert_result = await db.execute(
        text(
            "INSERT INTO stripe_processed_events (event_id) "
            "VALUES (:event_id) "
            "ON CONFLICT (event_id) DO NOTHING "
            "RETURNING event_id"
        ),
        {"event_id": event_id},
    )
    if insert_result.fetchone() is None:
        return {"received": True, "duplicate": True}

    if event.type != "checkout.session.completed":
        await db.commit()
        return {"received": True, "ignored": True}

    obj = event.data.object
    user_id_str: str | None = getattr(obj, "client_reference_id", None)
    raw_metadata = getattr(obj, "metadata", None)
    price_id: str | None = (
        raw_metadata["price_id"] if raw_metadata and "price_id" in raw_metadata else None
    )

    if not user_id_str or not price_id:
        logger.warning("Webhook event %s missing user_id/price_id", event_id)
        await db.commit()
        return {"received": True, "skipped": True}

    credits = _credits_for_price(price_id)
    if credits is None:
        logger.warning("Webhook event %s unknown price_id %s", event_id, price_id)
        await db.commit()
        return {"received": True, "unknown_price": True}

    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        logger.warning("Webhook event %s bad user_id %s", event_id, user_id_str)
        await db.commit()
        return {"received": True, "bad_user_id": True}

    new_balance = await increment_credits(db, user_uuid, amount=credits)
    await db.commit()
    logger.info(
        "Webhook %s credited %d to user %s (new balance %d)",
        event_id, credits, user_uuid, new_balance,
    )
    return {"received": True, "credited": credits}
