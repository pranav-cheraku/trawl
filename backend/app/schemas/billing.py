from __future__ import annotations

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class _CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class CheckoutRequest(_CamelModel):
    """Body for POST /billing/checkout."""

    price_id: str  # one of settings.STRIPE_PRICE_SMALL / STRIPE_PRICE_LARGE


class CheckoutResponse(_CamelModel):
    """Returned URL the client redirects to (window.location.href = url)."""

    url: str


class CreditBalance(_CamelModel):
    """GET /billing/me — current credit balance for the user."""

    credits_balance: int
