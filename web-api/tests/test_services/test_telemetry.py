"""Tests for BrainTrust telemetry configuration."""

import pytest
from unittest.mock import MagicMock, patch
import os


class TestConfigureTelemetry:
    """Tests for configure_telemetry()."""

    def setup_method(self):
        """Reset telemetry state before each test."""
        import services.telemetry as tel
        tel._telemetry_configured = False

    def test_warns_when_api_key_missing(self, caplog):
        """configure_telemetry logs a warning when BRAINTRUST_API_KEY is not set."""
        import logging
        env = os.environ.copy()
        env.pop("BRAINTRUST_API_KEY", None)

        with patch.dict(os.environ, env, clear=True):
            from services.telemetry import configure_telemetry
            configure_telemetry()

        # loguru records are captured as WARNING level
        assert any("BRAINTRUST_API_KEY" in r.message for r in caplog.records)

    def test_does_not_raise_when_api_key_missing(self):
        """configure_telemetry does not raise when BRAINTRUST_API_KEY is not set."""
        env = os.environ.copy()
        env.pop("BRAINTRUST_API_KEY", None)

        with patch.dict(os.environ, env, clear=True):
            from services.telemetry import configure_telemetry
            configure_telemetry()  # must not raise

    def test_telemetry_not_configured_without_api_key(self):
        """is_telemetry_configured returns False when BRAINTRUST_API_KEY is absent."""
        env = os.environ.copy()
        env.pop("BRAINTRUST_API_KEY", None)

        with patch.dict(os.environ, env, clear=True):
            import services.telemetry as tel
            tel._telemetry_configured = False
            from services.telemetry import configure_telemetry, is_telemetry_configured
            configure_telemetry()
            assert is_telemetry_configured() is False

    def test_warns_when_braintrust_not_installed(self, caplog):
        """configure_telemetry logs a warning when the braintrust package is absent."""
        import builtins
        real_import = builtins.__import__

        def mock_import(name, *args, **kwargs):
            if name == "braintrust":
                raise ImportError("No module named 'braintrust'")
            return real_import(name, *args, **kwargs)

        with patch.dict(os.environ, {"BRAINTRUST_API_KEY": "test-key"}):
            with patch("builtins.__import__", side_effect=mock_import):
                import services.telemetry as tel
                tel._telemetry_configured = False
                tel.configure_telemetry()

        assert not tel._telemetry_configured

    def test_does_not_raise_when_braintrust_not_installed(self):
        """configure_telemetry does not raise when braintrust is not installed."""
        import builtins
        real_import = builtins.__import__

        def mock_import(name, *args, **kwargs):
            if name == "braintrust":
                raise ImportError("No module named 'braintrust'")
            return real_import(name, *args, **kwargs)

        with patch.dict(os.environ, {"BRAINTRUST_API_KEY": "test-key"}):
            with patch("builtins.__import__", side_effect=mock_import):
                import services.telemetry as tel
                tel._telemetry_configured = False
                tel.configure_telemetry()  # must not raise

    def test_configure_telemetry_success(self):
        """configure_telemetry sets _telemetry_configured=True when all deps are present."""
        mock_braintrust = MagicMock()
        mock_braintrust.wrap_openai.return_value = MagicMock()

        import builtins
        real_import = builtins.__import__

        def mock_import(name, *args, **kwargs):
            if name == "braintrust":
                return mock_braintrust
            return real_import(name, *args, **kwargs)

        with patch.dict(os.environ, {"BRAINTRUST_API_KEY": "test-key", "BRAINTRUST_PROJECT": "test-project"}):
            with patch("builtins.__import__", side_effect=mock_import):
                with patch("agents.set_default_openai_client"):
                    import services.telemetry as tel
                    tel._telemetry_configured = False
                    tel.configure_telemetry()

        assert tel._telemetry_configured is True
        mock_braintrust.configure.assert_called_once_with(api_key="test-key", project="test-project")

    def test_configure_telemetry_uses_default_project(self):
        """configure_telemetry defaults BRAINTRUST_PROJECT to 'mishmish'."""
        mock_braintrust = MagicMock()
        mock_braintrust.wrap_openai.return_value = MagicMock()

        import builtins
        real_import = builtins.__import__

        def mock_import(name, *args, **kwargs):
            if name == "braintrust":
                return mock_braintrust
            return real_import(name, *args, **kwargs)

        env = {"BRAINTRUST_API_KEY": "test-key"}
        env.pop("BRAINTRUST_PROJECT", None)  # type: ignore[misc]

        with patch.dict(os.environ, env, clear=False):
            os.environ.pop("BRAINTRUST_PROJECT", None)
            with patch("builtins.__import__", side_effect=mock_import):
                with patch("agents.set_default_openai_client"):
                    import services.telemetry as tel
                    tel._telemetry_configured = False
                    tel.configure_telemetry()

        mock_braintrust.configure.assert_called_once_with(api_key="test-key", project="mishmish")


class TestMakeSpan:
    """Tests for the make_span context manager."""

    def setup_method(self):
        import services.telemetry as tel
        tel._telemetry_configured = False

    def test_make_span_noop_when_telemetry_disabled(self):
        """make_span yields None without error when telemetry is not configured."""
        from services.telemetry import make_span

        with make_span("test-span", "user") as span:
            assert span is None  # no-op

    def test_make_span_does_not_raise_when_telemetry_disabled(self):
        """make_span is safe to use even without telemetry configured."""
        from services.telemetry import make_span

        # Should not raise
        with make_span("test-span", "admin"):
            pass

    def test_make_span_calls_braintrust_when_configured(self):
        """make_span calls braintrust.start_span when telemetry is configured."""
        import services.telemetry as tel
        tel._telemetry_configured = True

        mock_span = MagicMock()
        mock_span.__enter__ = MagicMock(return_value=mock_span)
        mock_span.__exit__ = MagicMock(return_value=False)

        mock_braintrust = MagicMock()
        mock_braintrust.start_span.return_value = mock_span

        import builtins
        real_import = builtins.__import__

        def mock_import(name, *args, **kwargs):
            if name == "braintrust":
                return mock_braintrust
            return real_import(name, *args, **kwargs)

        with patch("builtins.__import__", side_effect=mock_import):
            with tel.make_span("admin-chat", "admin") as s:
                assert s is mock_span

        mock_braintrust.start_span.assert_called_once_with(name="admin-chat")
        mock_span.log.assert_called_once_with(
            metadata={"request_type": "admin"}, tags=["admin"]
        )

        # Reset
        tel._telemetry_configured = False


class TestGetWrappedOpenaiClient:
    """Tests for get_wrapped_openai_client()."""

    def setup_method(self):
        import services.telemetry as tel
        tel._telemetry_configured = False

    def test_returns_plain_client_when_telemetry_disabled(self):
        """get_wrapped_openai_client returns a plain AsyncOpenAI when telemetry is off."""
        from services.telemetry import get_wrapped_openai_client
        from openai import AsyncOpenAI

        client = get_wrapped_openai_client()
        assert isinstance(client, AsyncOpenAI)

    def test_returns_wrapped_client_when_telemetry_enabled(self):
        """get_wrapped_openai_client returns a BrainTrust-wrapped client when enabled."""
        import services.telemetry as tel
        tel._telemetry_configured = True

        wrapped = MagicMock()
        mock_braintrust = MagicMock()
        mock_braintrust.wrap_openai.return_value = wrapped

        import builtins
        real_import = builtins.__import__

        def mock_import(name, *args, **kwargs):
            if name == "braintrust":
                return mock_braintrust
            return real_import(name, *args, **kwargs)

        with patch("builtins.__import__", side_effect=mock_import):
            client = tel.get_wrapped_openai_client()

        assert client is wrapped
        mock_braintrust.wrap_openai.assert_called_once()

        # Reset
        tel._telemetry_configured = False
