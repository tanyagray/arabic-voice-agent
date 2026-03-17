"""Tests for the BrainTrust telemetry service."""

import os
import pytest
from unittest.mock import patch, MagicMock


class TestSetupTelemetry:
    """Tests for setup_telemetry()."""

    def test_no_api_key_logs_warning_and_stays_disabled(self):
        """When BRAINTRUST_API_KEY is absent, telemetry is not enabled and a warning is logged."""
        import services.telemetry as tel

        with patch.dict(os.environ, {}, clear=True):
            os.environ.pop("BRAINTRUST_API_KEY", None)
            tel._telemetry_enabled = False

            with patch("services.telemetry.logger") as mock_logger:
                tel.setup_telemetry()

            mock_logger.warning.assert_called_once()
            warning_msg = mock_logger.warning.call_args[0][0]
            assert "BRAINTRUST_API_KEY" in warning_msg

        assert tel._telemetry_enabled is False

    def test_with_api_key_enables_telemetry(self):
        """When BRAINTRUST_API_KEY is set, telemetry is initialized and enabled."""
        import services.telemetry as tel

        mock_braintrust = MagicMock()

        with patch.dict(os.environ, {"BRAINTRUST_API_KEY": "test-key", "BRAINTRUST_PROJECT": "test-project"}):
            tel._telemetry_enabled = False

            with patch.dict("sys.modules", {"braintrust": mock_braintrust}):
                tel.setup_telemetry()

        assert tel._telemetry_enabled is True
        mock_braintrust.init_logger.assert_called_once_with(
            project="test-project",
            api_key="test-key",
            async_flush=True,
        )
        mock_braintrust.auto_instrument.assert_called_once_with(openai=True)

    def test_with_api_key_uses_default_project(self):
        """When BRAINTRUST_PROJECT is not set, defaults to 'mishmish.ai'."""
        import services.telemetry as tel

        mock_braintrust = MagicMock()

        env = {"BRAINTRUST_API_KEY": "test-key"}
        with patch.dict(os.environ, env, clear=False):
            os.environ.pop("BRAINTRUST_PROJECT", None)
            tel._telemetry_enabled = False

            with patch.dict("sys.modules", {"braintrust": mock_braintrust}):
                tel.setup_telemetry()

        mock_braintrust.init_logger.assert_called_once_with(
            project="mishmish.ai",
            api_key="test-key",
            async_flush=True,
        )

    def test_braintrust_exception_logs_warning_and_stays_disabled(self):
        """When braintrust raises during init, telemetry stays disabled and a warning is logged."""
        import services.telemetry as tel

        mock_braintrust = MagicMock()
        mock_braintrust.init_logger.side_effect = RuntimeError("connection refused")

        with patch.dict(os.environ, {"BRAINTRUST_API_KEY": "test-key"}):
            tel._telemetry_enabled = False

            with patch("services.telemetry.logger") as mock_logger:
                with patch.dict("sys.modules", {"braintrust": mock_braintrust}):
                    tel.setup_telemetry()

            mock_logger.warning.assert_called_once()
            warning_msg = mock_logger.warning.call_args[0][0]
            assert "Failed to initialize" in warning_msg

        assert tel._telemetry_enabled is False


class TestIsEnabled:
    """Tests for is_enabled()."""

    def test_returns_false_when_not_initialized(self):
        import services.telemetry as tel
        tel._telemetry_enabled = False
        assert tel.is_enabled() is False

    def test_returns_true_when_initialized(self):
        import services.telemetry as tel
        tel._telemetry_enabled = True
        assert tel.is_enabled() is True
        tel._telemetry_enabled = False


class TestAdminSpan:
    """Tests for admin_span() context manager."""

    def test_noop_when_telemetry_disabled(self):
        """admin_span is a no-op and does not call braintrust when disabled."""
        import services.telemetry as tel
        tel._telemetry_enabled = False

        executed = []
        with tel.admin_span("admin_chat"):
            executed.append(True)

        assert executed == [True]

    def test_creates_span_with_admin_tag_when_enabled(self):
        """admin_span creates a BrainTrust span tagged 'admin' when telemetry is enabled."""
        import services.telemetry as tel
        tel._telemetry_enabled = True

        mock_span = MagicMock()
        mock_span.__enter__ = MagicMock(return_value=mock_span)
        mock_span.__exit__ = MagicMock(return_value=False)

        mock_braintrust = MagicMock()
        mock_braintrust.start_span.return_value = mock_span

        executed = []
        with patch.dict("sys.modules", {"braintrust": mock_braintrust}):
            with tel.admin_span("admin_chat"):
                executed.append(True)

        assert executed == [True]
        mock_braintrust.start_span.assert_called_once_with(name="admin_chat", tags=["admin"])
        tel._telemetry_enabled = False


class TestUserSpan:
    """Tests for user_span() context manager."""

    def test_noop_when_telemetry_disabled(self):
        """user_span is a no-op when disabled."""
        import services.telemetry as tel
        tel._telemetry_enabled = False

        executed = []
        with tel.user_span("user_chat"):
            executed.append(True)

        assert executed == [True]

    def test_creates_span_with_user_tag_when_enabled(self):
        """user_span creates a BrainTrust span tagged 'user' when telemetry is enabled."""
        import services.telemetry as tel
        tel._telemetry_enabled = True

        mock_span = MagicMock()
        mock_span.__enter__ = MagicMock(return_value=mock_span)
        mock_span.__exit__ = MagicMock(return_value=False)

        mock_braintrust = MagicMock()
        mock_braintrust.start_span.return_value = mock_span

        executed = []
        with patch.dict("sys.modules", {"braintrust": mock_braintrust}):
            with tel.user_span("user_chat"):
                executed.append(True)

        assert executed == [True]
        mock_braintrust.start_span.assert_called_once_with(name="user_chat", tags=["user"])
        tel._telemetry_enabled = False
