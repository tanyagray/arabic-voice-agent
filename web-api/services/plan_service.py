"""Plan, quota, and usage-ledger service.

Single source of truth for:
- reading a user's plan/subscription state from `profiles`
- checking quotas (voice minutes/month, chat messages/day, dialect)
- recording usage events

All writes use the admin client; all reads are scoped to the caller's user_id.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

from services.supabase_client import get_supabase_admin_client


# Quota constants
FREE_VOICE_MONTHLY_SECONDS = 60 * 60          # 60 min / 30 days
FREE_CHAT_DAILY = 30
FREE_DIALECTS = {"ar-AR"}
PRO_VOICE_DAILY_SECONDS = 120 * 60            # soft fair-use cap


Plan = Literal["free", "pro"]


class QuotaExceeded(Exception):
    """Raised when a user tries to exceed their plan limits."""

    def __init__(self, kind: str, plan: Plan, detail: str):
        self.kind = kind
        self.plan = plan
        self.detail = detail
        super().__init__(detail)


@dataclass
class PlanState:
    user_id: str
    plan: Plan
    subscription_status: Optional[str]
    current_period_end: Optional[str]
    stripe_customer_id: Optional[str]


@dataclass
class UsageSnapshot:
    voice_seconds_this_month: int
    chat_messages_today: int


def get_plan_state(user_id: str) -> PlanState:
    """Read plan/subscription state for a user. Creates a free-default view
    if the profiles row is missing columns (pre-migration rows default via DDL)."""
    client = get_supabase_admin_client()
    resp = (
        client.table("profiles")
        .select("id, plan, subscription_status, current_period_end, stripe_customer_id")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    row = (resp.data or [{}])[0]
    return PlanState(
        user_id=user_id,
        plan=(row.get("plan") or "free"),
        subscription_status=row.get("subscription_status"),
        current_period_end=row.get("current_period_end"),
        stripe_customer_id=row.get("stripe_customer_id"),
    )


def _sum_since(user_id: str, kind: str, since: datetime) -> int:
    client = get_supabase_admin_client()
    resp = (
        client.table("usage_events")
        .select("amount")
        .eq("user_id", user_id)
        .eq("kind", kind)
        .gte("occurred_at", since.isoformat())
        .execute()
    )
    return sum(int(r["amount"]) for r in (resp.data or []))


def get_usage(user_id: str) -> UsageSnapshot:
    now = datetime.now(timezone.utc)
    month_start = now - timedelta(days=30)
    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    return UsageSnapshot(
        voice_seconds_this_month=_sum_since(user_id, "voice_seconds", month_start),
        chat_messages_today=_sum_since(user_id, "chat_message", day_start),
    )


def record_usage(user_id: str, kind: str, amount: int) -> None:
    if amount <= 0:
        return
    client = get_supabase_admin_client()
    client.table("usage_events").insert(
        {"user_id": user_id, "kind": kind, "amount": amount}
    ).execute()


def check_voice_quota(user_id: str) -> tuple[PlanState, UsageSnapshot]:
    """Raises QuotaExceeded if the user has no remaining voice budget."""
    state = get_plan_state(user_id)
    usage = get_usage(user_id)
    if state.plan == "free":
        if usage.voice_seconds_this_month >= FREE_VOICE_MONTHLY_SECONDS:
            raise QuotaExceeded(
                kind="voice",
                plan=state.plan,
                detail="Free monthly voice limit reached (60 min). Upgrade to Pro to keep going.",
            )
    else:
        # Pro: daily soft cap
        now = datetime.now(timezone.utc)
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today = _sum_since(user_id, "voice_seconds", day_start)
        if today >= PRO_VOICE_DAILY_SECONDS:
            raise QuotaExceeded(
                kind="voice",
                plan=state.plan,
                detail="Daily fair-use voice limit reached (2 hours). Resets at midnight UTC.",
            )
    return state, usage


def check_chat_quota(user_id: str) -> None:
    state = get_plan_state(user_id)
    if state.plan != "free":
        return
    usage = get_usage(user_id)
    if usage.chat_messages_today >= FREE_CHAT_DAILY:
        raise QuotaExceeded(
            kind="chat",
            plan=state.plan,
            detail=f"Daily free chat limit reached ({FREE_CHAT_DAILY} messages). Upgrade to Pro for unlimited chat.",
        )


def check_dialect_allowed(user_id: str, language_code: str) -> None:
    state = get_plan_state(user_id)
    if state.plan == "pro":
        return
    if language_code not in FREE_DIALECTS:
        raise QuotaExceeded(
            kind="dialect",
            plan=state.plan,
            detail=f"Dialect '{language_code}' is a Pro feature. Upgrade to unlock all dialects.",
        )


def set_plan_from_stripe(
    *,
    stripe_customer_id: str,
    stripe_subscription_id: Optional[str],
    subscription_status: Optional[str],
    current_period_end: Optional[int],
    user_id: Optional[str] = None,
    plan: Optional[Plan] = None,
) -> None:
    """Upsert plan state from a Stripe webhook. Looks up by user_id if provided,
    else by stripe_customer_id."""
    client = get_supabase_admin_client()

    if plan is None:
        plan = "pro" if subscription_status in {"active", "trialing"} else "free"

    payload = {
        "plan": plan,
        "stripe_customer_id": stripe_customer_id,
        "stripe_subscription_id": stripe_subscription_id,
        "subscription_status": subscription_status,
        "current_period_end": (
            datetime.fromtimestamp(current_period_end, tz=timezone.utc).isoformat()
            if current_period_end
            else None
        ),
    }

    if user_id:
        client.table("profiles").update(payload).eq("id", user_id).execute()
    else:
        client.table("profiles").update(payload).eq(
            "stripe_customer_id", stripe_customer_id
        ).execute()
