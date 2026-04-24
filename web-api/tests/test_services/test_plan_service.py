"""Unit tests for plan_service quota logic."""

from unittest.mock import MagicMock, patch

import pytest

from services import plan_service


def _mock_client(profile_row, usage_rows):
    client = MagicMock()

    def table(name):
        tbl = MagicMock()
        if name == "profiles":
            tbl.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = (
                [profile_row] if profile_row else []
            )
        elif name == "usage_events":
            tbl.select.return_value.eq.return_value.eq.return_value.gte.return_value.execute.return_value.data = usage_rows
            tbl.insert.return_value.execute.return_value = MagicMock()
        return tbl

    client.table.side_effect = table
    return client


@pytest.fixture
def mock_admin():
    with patch("services.plan_service.get_supabase_admin_client") as m:
        yield m


def test_free_user_under_cap_allowed(mock_admin):
    mock_admin.return_value = _mock_client(
        profile_row={"plan": "free"},
        usage_rows=[{"amount": 600}],  # 10 min used
    )
    state, usage = plan_service.check_voice_quota("user-1")
    assert state.plan == "free"
    assert usage.voice_seconds_this_month == 600


def test_free_user_over_cap_raises(mock_admin):
    mock_admin.return_value = _mock_client(
        profile_row={"plan": "free"},
        usage_rows=[{"amount": plan_service.FREE_VOICE_MONTHLY_SECONDS}],
    )
    with pytest.raises(plan_service.QuotaExceeded) as exc:
        plan_service.check_voice_quota("user-1")
    assert exc.value.kind == "voice"
    assert exc.value.plan == "free"


def test_pro_user_bypasses_monthly_cap(mock_admin):
    mock_admin.return_value = _mock_client(
        profile_row={"plan": "pro"},
        # way over free cap, but Pro only checks daily
        usage_rows=[{"amount": 60}],
    )
    state, _ = plan_service.check_voice_quota("user-1")
    assert state.plan == "pro"


def test_free_dialect_allowed(mock_admin):
    mock_admin.return_value = _mock_client({"plan": "free"}, [])
    plan_service.check_dialect_allowed("user-1", "ar-AR")  # no raise


def test_free_dialect_blocked(mock_admin):
    mock_admin.return_value = _mock_client({"plan": "free"}, [])
    with pytest.raises(plan_service.QuotaExceeded) as exc:
        plan_service.check_dialect_allowed("user-1", "ar-IQ")
    assert exc.value.kind == "dialect"


def test_pro_dialect_any(mock_admin):
    mock_admin.return_value = _mock_client({"plan": "pro"}, [])
    plan_service.check_dialect_allowed("user-1", "ar-IQ")
    plan_service.check_dialect_allowed("user-1", "es-MX")


def test_chat_quota_free_over_cap(mock_admin):
    mock_admin.return_value = _mock_client(
        profile_row={"plan": "free"},
        usage_rows=[{"amount": plan_service.FREE_CHAT_DAILY}],
    )
    with pytest.raises(plan_service.QuotaExceeded) as exc:
        plan_service.check_chat_quota("user-1")
    assert exc.value.kind == "chat"


def test_chat_quota_pro_unlimited(mock_admin):
    mock_admin.return_value = _mock_client(
        profile_row={"plan": "pro"},
        usage_rows=[{"amount": 9999}],
    )
    plan_service.check_chat_quota("user-1")  # no raise
