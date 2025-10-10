"""
Function calling tools for user data access
These functions can be called by the LLM to retrieve user information
"""

import logging
from typing import Dict, Optional, Any
from src.database import SupabaseClient

logger = logging.getLogger(__name__)

# Function definitions for OpenAI function calling
FUNCTION_DEFINITIONS = [
    {
        "name": "get_user_preferences",
        "description": "Get the user's language learning preferences and settings",
        "parameters": {
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "string",
                    "description": "The user's unique ID"
                }
            },
            "required": ["user_id"]
        }
    },
    {
        "name": "get_conversation_history_summary",
        "description": "Get a summary of the user's recent conversation activity (count, last session)",
        "parameters": {
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "string",
                    "description": "The user's unique ID"
                }
            },
            "required": ["user_id"]
        }
    }
]


class UserTools:
    """Tools for accessing user data via function calling"""

    def __init__(self, db_client: SupabaseClient):
        self.db = db_client

    async def get_user_preferences(self, user_id: str) -> Dict[str, Any]:
        """
        Get user's language preferences

        Args:
            user_id: User UUID

        Returns:
            Dict with user preferences
        """
        try:
            profile = await self.db.get_user_profile(user_id)

            if not profile:
                return {"error": "User not found"}

            return {
                "language_preference": profile.get("language_preference", "mixed"),
                "notification_enabled": profile.get("notification_enabled", True),
                "full_name": profile.get("full_name", "User")
            }
        except Exception as e:
            logger.error(f"Error getting user preferences: {e}")
            return {"error": str(e)}

    async def get_conversation_history_summary(self, user_id: str) -> Dict[str, Any]:
        """
        Get summary of user's conversation history

        Args:
            user_id: User UUID

        Returns:
            Dict with conversation summary
        """
        try:
            # Query recent conversations (this is a summary, not full history)
            response = self.db.client.table("conversations") \
                .select("id, started_at, mode, message_count") \
                .eq("user_id", user_id) \
                .order("started_at", desc=True) \
                .limit(5) \
                .execute()

            conversations = response.data if response.data else []

            total_count = len(conversations)
            last_session = conversations[0] if conversations else None

            return {
                "total_recent_conversations": total_count,
                "last_session_date": last_session.get("started_at") if last_session else None,
                "last_session_mode": last_session.get("mode") if last_session else None,
                "last_session_messages": last_session.get("message_count") if last_session else 0
            }
        except Exception as e:
            logger.error(f"Error getting conversation summary: {e}")
            return {"error": str(e)}

    def get_function_definitions(self) -> list:
        """Return function definitions for OpenAI"""
        return FUNCTION_DEFINITIONS

    async def execute_function(self, function_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a function call

        Args:
            function_name: Name of function to call
            arguments: Function arguments

        Returns:
            Function result
        """
        if function_name == "get_user_preferences":
            return await self.get_user_preferences(arguments["user_id"])
        elif function_name == "get_conversation_history_summary":
            return await self.get_conversation_history_summary(arguments["user_id"])
        else:
            return {"error": f"Unknown function: {function_name}"}
