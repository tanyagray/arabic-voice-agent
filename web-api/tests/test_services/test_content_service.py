"""
Tests for content service.
"""
import pytest
from unittest.mock import Mock, patch, AsyncMock


class TestContentService:
    """Tests for content_service functions."""

    @pytest.fixture
    def mock_supabase(self):
        """Create a mock Supabase client."""
        mock = Mock()
        mock.table = Mock(return_value=Mock())
        return mock

    @patch("services.content_service.supabase_client")
    def test_fetch_content_success(self, mock_client, mock_supabase):
        """Test successful content fetch."""
        # Arrange
        mock_client.get_client.return_value = mock_supabase
        mock_response = Mock()
        mock_response.data = [{"id": 1, "title": "Test Content"}]
        mock_supabase.table.return_value.select.return_value.execute.return_value = mock_response

        # Act
        from services.content_service import fetch_content
        result = fetch_content("test-user")

        # Assert
        assert result is not None
        assert len(result) == 1
        assert result[0]["title"] == "Test Content"

    @patch("services.content_service.supabase_client")
    def test_fetch_content_empty(self, mock_client, mock_supabase):
        """Test content fetch with no results."""
        # Arrange
        mock_client.get_client.return_value = mock_supabase
        mock_response = Mock()
        mock_response.data = []
        mock_supabase.table.return_value.select.return_value.execute.return_value = mock_response

        # Act
        from services.content_service import fetch_content
        result = fetch_content("test-user")

        # Assert
        assert result == []
