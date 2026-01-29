"""
Tests for session management routes.
"""
import pytest
from unittest.mock import patch, Mock
from fastapi.testclient import TestClient


class TestCreateSession:
    """Tests for POST /sessions endpoint."""

    @patch("routes.session.session_service.create_session")
    @patch("routes.session.get_current_user_token")
    def test_create_session_success(self, mock_auth, mock_create_session, client):
        """Test successful session creation."""
        # Arrange
        mock_auth.return_value = "test-token"
        mock_create_session.return_value = "session-123"

        # Act
        response = client.post("/sessions", headers={"Authorization": "Bearer test-token"})

        # Assert
        assert response.status_code == 200
        assert response.json() == {"session_id": "session-123"}
        mock_create_session.assert_called_once_with("test-token")

    @patch("routes.session.get_current_user_token")
    def test_create_session_unauthorized(self, mock_auth, client):
        """Test session creation without authentication."""
        # Arrange
        mock_auth.side_effect = Exception("Unauthorized")

        # Act & Assert
        with pytest.raises(Exception):
            client.post("/sessions")


class TestListUserSessions:
    """Tests for GET /sessions endpoint."""

    @patch("routes.session.session_service.list_user_sessions")
    @patch("routes.session.get_current_user_token")
    def test_list_sessions_success(self, mock_auth, mock_list_sessions, client):
        """Test successful listing of user sessions."""
        # Arrange
        mock_auth.return_value = "test-token"
        mock_list_sessions.return_value = [
            {"session_id": "session-1", "created_at": "2024-01-01T00:00:00Z"},
            {"session_id": "session-2", "created_at": "2024-01-02T00:00:00Z"},
        ]

        # Act
        response = client.get("/sessions", headers={"Authorization": "Bearer test-token"})

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert len(data["sessions"]) == 2
        assert data["sessions"][0]["session_id"] == "session-1"


class TestSendChatMessage:
    """Tests for POST /sessions/{session_id}/chat endpoint."""

    @patch("routes.session.agent_service.generate_agent_response")
    @patch("routes.session.transcript_service.create_transcript_message")
    @patch("routes.session.session_service.get_session")
    @patch("routes.session.get_current_user_token")
    def test_send_message_success(
        self, mock_auth, mock_get_session, mock_create_transcript, mock_generate_response, client
    ):
        """Test successful chat message."""
        # Arrange
        mock_auth.return_value = "test-token"
        mock_get_session.return_value = {"session_id": "session-123"}
        mock_create_transcript.return_value = None
        mock_generate_response.return_value = "Hello! How can I help you?"

        # Act
        response = client.post(
            "/sessions/session-123/chat",
            json={"message": "Hello"},
            headers={"Authorization": "Bearer test-token"},
        )

        # Assert
        assert response.status_code == 200
        assert response.json() == {"text": "Hello! How can I help you?"}
        mock_generate_response.assert_called_once_with("session-123", "Hello", "test-token")

    @patch("routes.session.session_service.get_session")
    @patch("routes.session.get_current_user_token")
    def test_send_message_session_not_found(self, mock_auth, mock_get_session, client):
        """Test chat message with non-existent session."""
        # Arrange
        mock_auth.return_value = "test-token"
        mock_get_session.return_value = None

        # Act
        response = client.post(
            "/sessions/invalid-session/chat",
            json={"message": "Hello"},
            headers={"Authorization": "Bearer test-token"},
        )

        # Assert
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


class TestUpdateContext:
    """Tests for PATCH /sessions/{session_id}/context endpoint."""

    @patch("routes.session.context_service.get_context")
    @patch("routes.session.session_service.get_session")
    @patch("routes.session.get_current_user_token")
    def test_update_audio_enabled(self, mock_auth, mock_get_session, mock_get_context, client):
        """Test updating audio_enabled setting."""
        # Arrange
        mock_auth.return_value = "test-token"
        mock_get_session.return_value = {"session_id": "session-123"}

        mock_context = Mock()
        mock_context.session_id = "session-123"
        mock_context.agent.audio_enabled = True
        mock_context.agent.language = "ar-AR"
        mock_context.agent.active_tool = None
        mock_get_context.return_value = mock_context

        # Act
        response = client.patch(
            "/sessions/session-123/context",
            json={"audio_enabled": True},
            headers={"Authorization": "Bearer test-token"},
        )

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["audio_enabled"] is True
        mock_context.set_audio_enabled.assert_called_once_with(True)

    @patch("routes.session.context_service.get_context")
    @patch("routes.session.session_service.get_session")
    @patch("routes.session.get_current_user_token")
    def test_update_language(self, mock_auth, mock_get_session, mock_get_context, client):
        """Test updating language setting."""
        # Arrange
        mock_auth.return_value = "test-token"
        mock_get_session.return_value = {"session_id": "session-123"}

        mock_context = Mock()
        mock_context.session_id = "session-123"
        mock_context.agent.audio_enabled = False
        mock_context.agent.language = "es-MX"
        mock_context.agent.active_tool = None
        mock_get_context.return_value = mock_context

        # Act
        response = client.patch(
            "/sessions/session-123/context",
            json={"language": "es-MX"},
            headers={"Authorization": "Bearer test-token"},
        )

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["language"] == "es-MX"
        mock_context.set_language.assert_called_once_with("es-MX")
