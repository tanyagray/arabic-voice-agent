"""
Shared pytest fixtures for web-api tests.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, AsyncMock
import os


@pytest.fixture
def test_env():
    """Set up test environment variables."""
    original_env = os.environ.copy()

    # Set test environment variables
    test_vars = {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "test-service-key",
        "SUPABASE_PUBLISHABLE_KEY": "test-publishable-key",
        "OPENAI_API_KEY": "test-openai-key",
        "ELEVENLABS_API_KEY": "test-elevenlabs-key",
    }

    os.environ.update(test_vars)

    yield test_vars

    # Restore original environment
    os.environ.clear()
    os.environ.update(original_env)


@pytest.fixture
def client(test_env):
    """Create a FastAPI test client.

    Overrides:
    - `get_current_user` + `plan_service.check_chat_quota` / `check_dialect_allowed` /
      `record_usage` → no-ops by default, so existing route tests don't need to
      mock billing/quota concerns. Opt-out by clearing `app.dependency_overrides`
      in the test.
    """
    from main import app
    from dependencies.auth import get_current_user
    from unittest.mock import patch

    fake_user = Mock()
    fake_user.id = "test-user-123"
    fake_user.email = "tester@example.com"
    fake_user.is_anonymous = False

    app.dependency_overrides[get_current_user] = lambda: fake_user
    with (
        patch("services.plan_service.check_chat_quota"),
        patch("services.plan_service.check_dialect_allowed"),
        patch("services.plan_service.record_usage"),
        TestClient(app) as test_client,
    ):
        yield test_client
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def mock_supabase_client():
    """Create a mock Supabase client."""
    mock_client = Mock()
    mock_client.auth = Mock()
    mock_client.table = Mock(return_value=Mock())
    return mock_client


@pytest.fixture
def mock_agent_session():
    """Create a mock agent session."""
    mock_session = AsyncMock()
    mock_session.start = AsyncMock()
    mock_session.stop = AsyncMock()
    return mock_session


@pytest.fixture
def sample_user_id():
    """Return a sample user ID for testing."""
    return "test-user-123"


@pytest.fixture
def sample_session_id():
    """Return a sample session ID for testing."""
    return "test-session-456"
