"""Billing routes: Stripe Checkout, customer portal, webhook, plan/usage status."""

import logging
import os

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from dependencies.auth import get_current_user
from services import plan_service, stripe_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["Billing"])


class CheckoutRequest(BaseModel):
    interval: str = Field(..., description="'month' or 'year'")
    success_url: str = Field(..., description="Redirect after successful checkout")
    cancel_url: str = Field(..., description="Redirect if user cancels checkout")


class CheckoutResponse(BaseModel):
    url: str


class PortalRequest(BaseModel):
    return_url: str


class PortalResponse(BaseModel):
    url: str


class PlanStatusResponse(BaseModel):
    plan: str
    subscription_status: str | None
    current_period_end: str | None
    is_anonymous: bool
    usage: dict
    limits: dict


@router.get("/me", response_model=PlanStatusResponse)
async def get_me(user=Depends(get_current_user)):
    state = plan_service.get_plan_state(user.id)
    usage = plan_service.get_usage(user.id)
    return PlanStatusResponse(
        plan=state.plan,
        subscription_status=state.subscription_status,
        current_period_end=state.current_period_end,
        is_anonymous=bool(getattr(user, "is_anonymous", False)),
        usage={
            "voice_seconds_this_month": usage.voice_seconds_this_month,
            "chat_messages_today": usage.chat_messages_today,
        },
        limits={
            "free_voice_monthly_seconds": plan_service.FREE_VOICE_MONTHLY_SECONDS,
            "free_chat_daily": plan_service.FREE_CHAT_DAILY,
            "free_dialects": sorted(plan_service.FREE_DIALECTS),
        },
    )


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(req: CheckoutRequest, user=Depends(get_current_user)):
    if getattr(user, "is_anonymous", False) or not user.email:
        raise HTTPException(
            status_code=400,
            detail="Sign up with an email before upgrading.",
        )
    if req.interval not in {"month", "year"}:
        raise HTTPException(status_code=400, detail="interval must be 'month' or 'year'")

    state = plan_service.get_plan_state(user.id)
    try:
        url = stripe_service.create_checkout_session(
            user_id=user.id,
            email=user.email,
            interval=req.interval,
            success_url=req.success_url,
            cancel_url=req.cancel_url,
            existing_customer_id=state.stripe_customer_id,
        )
    except Exception as e:
        logger.exception("Stripe checkout creation failed")
        raise HTTPException(status_code=502, detail=f"Stripe error: {e}")
    return CheckoutResponse(url=url)


@router.post("/portal", response_model=PortalResponse)
async def create_portal(req: PortalRequest, user=Depends(get_current_user)):
    state = plan_service.get_plan_state(user.id)
    if not state.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No Stripe customer on file.")
    try:
        url = stripe_service.create_portal_session(
            customer_id=state.stripe_customer_id,
            return_url=req.return_url,
        )
    except Exception as e:
        logger.exception("Stripe portal creation failed")
        raise HTTPException(status_code=502, detail=f"Stripe error: {e}")
    return PortalResponse(url=url)


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Verify and process Stripe subscription lifecycle events."""
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = stripe_service.verify_webhook(payload, sig)
    except Exception as e:
        logger.warning(f"Stripe webhook verification failed: {e}")
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_type = event["type"]
    obj = event["data"]["object"]

    try:
        if event_type == "checkout.session.completed":
            user_id = (obj.get("metadata") or {}).get("user_id") or obj.get("client_reference_id")
            customer_id = obj.get("customer")
            subscription_id = obj.get("subscription")
            # Pull subscription details for period_end + status.
            status = None
            period_end = None
            if subscription_id:
                stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
                sub = stripe.Subscription.retrieve(subscription_id)
                status = sub.get("status")
                period_end = sub.get("current_period_end")
            plan_service.set_plan_from_stripe(
                user_id=user_id,
                stripe_customer_id=customer_id,
                stripe_subscription_id=subscription_id,
                subscription_status=status,
                current_period_end=period_end,
            )

        elif event_type in {"customer.subscription.updated", "customer.subscription.created"}:
            user_id = (obj.get("metadata") or {}).get("user_id")
            plan_service.set_plan_from_stripe(
                user_id=user_id,
                stripe_customer_id=obj.get("customer"),
                stripe_subscription_id=obj.get("id"),
                subscription_status=obj.get("status"),
                current_period_end=obj.get("current_period_end"),
            )

        elif event_type == "customer.subscription.deleted":
            user_id = (obj.get("metadata") or {}).get("user_id")
            plan_service.set_plan_from_stripe(
                user_id=user_id,
                stripe_customer_id=obj.get("customer"),
                stripe_subscription_id=obj.get("id"),
                subscription_status="canceled",
                current_period_end=obj.get("current_period_end"),
                plan="free",
            )
        else:
            logger.debug(f"Ignoring Stripe event type: {event_type}")
    except Exception as e:
        logger.exception(f"Error handling Stripe event {event_type}: {e}")
        raise HTTPException(status_code=500, detail="Webhook handler failed")

    return {"received": True}
