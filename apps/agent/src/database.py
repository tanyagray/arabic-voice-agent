"""
Database utilities for interacting with Supabase
"""

import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
from supabase import create_client, Client
from src.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

logger = logging.getLogger(__name__)


class SupabaseClient:
    """Wrapper for Supabase database operations"""

    def __init__(self):
        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            raise ValueError("Supabase credentials not configured")

        self.client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    async def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get user profile by ID

        Args:
            user_id: User UUID

        Returns:
            User profile dict or None
        """
        try:
            response = self.client.table("profiles").select("*").eq("id", user_id).single().execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching user profile: {e}")
            return None

    async def create_conversation(
        self,
        user_id: str,
        room_id: str,
        mode: str = "voice"
    ) -> Optional[str]:
        """
        Create a new conversation record

        Args:
            user_id: User UUID
            room_id: LiveKit room ID
            mode: 'text' or 'voice'

        Returns:
            Conversation ID or None
        """
        try:
            response = self.client.table("conversations").insert({
                "user_id": user_id,
                "room_id": room_id,
                "mode": mode,
                "started_at": datetime.utcnow().isoformat(),
            }).execute()

            return response.data[0]["id"] if response.data else None
        except Exception as e:
            logger.error(f"Error creating conversation: {e}")
            return None

    async def get_conversation_by_room(self, room_id: str) -> Optional[Dict[str, Any]]:
        """
        Get conversation by LiveKit room ID

        Args:
            room_id: LiveKit room ID

        Returns:
            Conversation dict or None
        """
        try:
            response = self.client.table("conversations").select("*").eq("room_id", room_id).single().execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching conversation: {e}")
            return None

    async def save_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        audio_url: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> bool:
        """
        Save a message to the database

        Args:
            conversation_id: Conversation UUID
            role: 'user' or 'assistant'
            content: Message text content
            audio_url: Optional URL to audio recording
            metadata: Optional additional data

        Returns:
            Success boolean
        """
        try:
            self.client.table("messages").insert({
                "conversation_id": conversation_id,
                "role": role,
                "content": content,
                "audio_url": audio_url,
                "metadata": metadata or {},
                "created_at": datetime.utcnow().isoformat(),
            }).execute()

            return True
        except Exception as e:
            logger.error(f"Error saving message: {e}")
            return False

    async def end_conversation(
        self,
        conversation_id: str,
        duration_seconds: int
    ) -> bool:
        """
        Mark a conversation as ended

        Args:
            conversation_id: Conversation UUID
            duration_seconds: Total conversation duration

        Returns:
            Success boolean
        """
        try:
            self.client.table("conversations").update({
                "ended_at": datetime.utcnow().isoformat(),
                "duration_seconds": duration_seconds,
            }).eq("id", conversation_id).execute()

            return True
        except Exception as e:
            logger.error(f"Error ending conversation: {e}")
            return False

    async def track_analytics_event(
        self,
        user_id: str,
        event_type: str,
        conversation_id: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> bool:
        """
        Track an analytics event

        Args:
            user_id: User UUID
            event_type: Type of event (e.g., 'conversation_start')
            conversation_id: Optional conversation UUID
            metadata: Optional additional data

        Returns:
            Success boolean
        """
        try:
            self.client.table("user_analytics").insert({
                "user_id": user_id,
                "conversation_id": conversation_id,
                "event_type": event_type,
                "metadata": metadata or {},
                "created_at": datetime.utcnow().isoformat(),
            }).execute()

            return True
        except Exception as e:
            logger.error(f"Error tracking analytics: {e}")
            return False
