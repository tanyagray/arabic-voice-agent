"""
Tests for agent service greeting behavior.
"""
import pytest
from unittest.mock import patch, AsyncMock, Mock


class TestGenerateAgentGreeting:
    """Tests for generate_agent_greeting function."""

    @pytest.mark.asyncio
    @patch("services.agent_service.Runner")
    @patch("services.agent_service.get_context")
    @patch("services.agent_service.get_session")
    async def test_greeting_returns_agent_output(
        self, mock_get_session, mock_get_context, mock_runner
    ):
        """Test that generate_agent_greeting returns the agent's final output."""
        # Arrange
        mock_get_session.return_value = Mock()
        mock_get_context.return_value = Mock()
        mock_result = Mock()
        mock_result.final_output = "مرحباً! أهلاً وسهلاً بك في جلسة المحادثة."
        mock_runner.run = AsyncMock(return_value=mock_result)

        # Act
        from services.agent_service import generate_agent_greeting
        result = await generate_agent_greeting("session-123")

        # Assert
        assert result == "مرحباً! أهلاً وسهلاً بك في جلسة المحادثة."
        mock_runner.run.assert_called_once()

    @pytest.mark.asyncio
    @patch("services.agent_service.get_session")
    async def test_greeting_raises_when_session_not_found(self, mock_get_session):
        """Test that generate_agent_greeting raises ValueError for missing sessions."""
        # Arrange
        mock_get_session.return_value = None

        # Act & Assert
        from services.agent_service import generate_agent_greeting
        with pytest.raises(ValueError, match="Session not found"):
            await generate_agent_greeting("nonexistent-session")

    @pytest.mark.asyncio
    @patch("services.agent_service.Runner")
    @patch("services.agent_service.get_context")
    @patch("services.agent_service.get_session")
    async def test_greeting_uses_correct_system_message(
        self, mock_get_session, mock_get_context, mock_runner
    ):
        """Test that generate_agent_greeting uses a greeting-specific system message."""
        # Arrange
        mock_get_session.return_value = Mock()
        mock_get_context.return_value = Mock()
        mock_result = Mock()
        mock_result.final_output = "Hello!"
        mock_runner.run = AsyncMock(return_value=mock_result)

        # Act
        from services.agent_service import generate_agent_greeting
        await generate_agent_greeting("session-123")

        # Assert: the first positional arg after agent is the input list
        call_args = mock_runner.run.call_args
        input_messages = call_args.args[1]
        assert len(input_messages) == 1
        assert input_messages[0]["role"] == "system"
        assert "greet" in input_messages[0]["content"].lower()


class TestTriggerAgentTurnGreeting:
    """Tests for trigger_agent_turn with greeting=True."""

    @pytest.mark.asyncio
    @patch("services.agent_service.send_message")
    @patch("services.agent_service.get_context")
    @patch("services.agent_service.create_transcript_message")
    @patch("services.agent_service.generate_agent_greeting")
    async def test_trigger_agent_turn_greeting_calls_greeting(
        self,
        mock_generate_greeting,
        mock_create_transcript,
        mock_get_context,
        mock_send_message,
    ):
        """Test that trigger_agent_turn with greeting=True calls generate_agent_greeting."""
        # Arrange
        mock_generate_greeting.return_value = "Welcome!"
        mock_transcript = Mock()
        mock_transcript.model_dump.return_value = {"source": "tutor", "text": "Welcome!"}
        mock_create_transcript.return_value = mock_transcript
        mock_context = Mock()
        mock_context.agent.audio_enabled = False
        mock_context.model_dump.return_value = {}
        mock_get_context.return_value = mock_context
        mock_send_message.return_value = None

        # Act
        from services.agent_service import trigger_agent_turn
        await trigger_agent_turn("session-123", greeting=True)

        # Assert
        mock_generate_greeting.assert_called_once_with("session-123", None)

    @pytest.mark.asyncio
    @patch("services.agent_service.send_message")
    @patch("services.agent_service.get_context")
    @patch("services.agent_service.create_transcript_message")
    @patch("services.agent_service.generate_agent_followup")
    async def test_trigger_agent_turn_non_greeting_calls_followup(
        self,
        mock_generate_followup,
        mock_create_transcript,
        mock_get_context,
        mock_send_message,
    ):
        """Test that trigger_agent_turn without greeting=True calls generate_agent_followup."""
        # Arrange
        mock_generate_followup.return_value = "How can I help?"
        mock_transcript = Mock()
        mock_transcript.model_dump.return_value = {"source": "tutor", "text": "How can I help?"}
        mock_create_transcript.return_value = mock_transcript
        mock_context = Mock()
        mock_context.agent.audio_enabled = False
        mock_context.model_dump.return_value = {}
        mock_get_context.return_value = mock_context
        mock_send_message.return_value = None

        # Act
        from services.agent_service import trigger_agent_turn
        await trigger_agent_turn("session-123")

        # Assert
        mock_generate_followup.assert_called_once_with("session-123", None)
