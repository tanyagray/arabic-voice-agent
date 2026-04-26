"""Smoke tests for /billing routes."""

from unittest.mock import MagicMock, patch

import pytest

from services import plan_service


@pytest.fixture
def auth_user():
    user = MagicMock()
    user.id = "test-user-123"
    user.email = "tester@example.com"
    user.is_anonymous = False
    return user


@pytest.fixture
def anon_user():
    user = MagicMock()
    user.id = "anon-user-1"
    user.email = None
    user.is_anonymous = True
    return user


def test_me_returns_free_by_default(client, auth_user):
    from main import app
    from dependencies.auth import get_current_user

    app.dependency_overrides[get_current_user] = lambda: auth_user
    try:
        with (
            patch("routes.billing.plan_service.get_plan_state") as gp,
            patch("routes.billing.plan_service.get_usage") as gu,
        ):
            gp.return_value = plan_service.PlanState(
                user_id=auth_user.id, plan="free",
                subscription_status=None, current_period_end=None,
                stripe_customer_id=None,
            )
            gu.return_value = plan_service.UsageSnapshot(
                voice_seconds_this_month=0, chat_messages_today=0,
            )
            resp = client.get("/billing/me", headers={"Authorization": "Bearer fake"})
            assert resp.status_code == 200
            data = resp.json()
            assert data["plan"] == "free"
            assert data["limits"]["free_voice_monthly_seconds"] == plan_service.FREE_VOICE_MONTHLY_SECONDS
    finally:
        app.dependency_overrides = {}


def test_checkout_rejects_anonymous(client, anon_user):
    from main import app
    from dependencies.auth import get_current_user

    app.dependency_overrides[get_current_user] = lambda: anon_user
    try:
        resp = client.post(
            "/billing/checkout",
            headers={"Authorization": "Bearer fake"},
            json={"interval": "month", "success_url": "http://x", "cancel_url": "http://y"},
        )
        assert resp.status_code == 400
        assert "Sign up" in resp.json()["detail"]
    finally:
        app.dependency_overrides = {}


def test_webhook_rejects_bad_signature(client):
    with patch("services.stripe_service.verify_webhook", side_effect=Exception("bad sig")):
        resp = client.post(
            "/billing/webhook",
            content=b"{}",
            headers={"stripe-signature": "sig"},
        )
        assert resp.status_code == 400
