"""Stripe integration: checkout sessions, billing portal, webhook verification."""

import os
from typing import Optional

import stripe


def _configure() -> None:
    key = os.getenv("STRIPE_SECRET_KEY")
    if not key:
        raise RuntimeError("STRIPE_SECRET_KEY is not set")
    stripe.api_key = key


def _price_id(interval: str) -> str:
    if interval == "month":
        value = os.getenv("STRIPE_PRICE_ID_MONTHLY")
    elif interval == "year":
        value = os.getenv("STRIPE_PRICE_ID_YEARLY")
    else:
        raise ValueError(f"Unknown interval: {interval}")
    if not value:
        raise RuntimeError(f"Missing Stripe price ID for interval '{interval}'")
    return value


def create_checkout_session(
    *,
    user_id: str,
    email: str,
    interval: str,
    success_url: str,
    cancel_url: str,
    existing_customer_id: Optional[str] = None,
) -> str:
    """Create a Stripe Checkout session and return its URL."""
    _configure()
    kwargs: dict = {
        "mode": "subscription",
        "line_items": [{"price": _price_id(interval), "quantity": 1}],
        "success_url": success_url,
        "cancel_url": cancel_url,
        "client_reference_id": user_id,
        "metadata": {"user_id": user_id},
        "subscription_data": {"metadata": {"user_id": user_id}},
        "allow_promotion_codes": True,
    }
    if existing_customer_id:
        kwargs["customer"] = existing_customer_id
    else:
        kwargs["customer_email"] = email
    session = stripe.checkout.Session.create(**kwargs)
    return session.url


def create_portal_session(*, customer_id: str, return_url: str) -> str:
    _configure()
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=return_url,
    )
    return session.url


def verify_webhook(payload: bytes, sig_header: str) -> stripe.Event:
    _configure()
    secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    if not secret:
        raise RuntimeError("STRIPE_WEBHOOK_SECRET is not set")
    return stripe.Webhook.construct_event(payload, sig_header, secret)
