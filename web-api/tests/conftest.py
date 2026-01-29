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
        "DEEPGRAM_API_KEY": "test-deepgram-key",
    }

    os.environ.update(test_vars)

    yield test_vars

    # Restore original environment
    os.environ.clear()
    os.environ.update(original_env)


@pytest.fixture
def client(test_env):
    """Create a FastAPI test client."""
    from main import app

    with TestClient(app) as test_client:
        yield test_client


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
