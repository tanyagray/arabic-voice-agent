"""Supabase-backed session implementation for OpenAI Agents SDK."""

import json
from typing import List, Optional
from agents.memory.session import SessionABC
from agents.items import TResponseInputItem
from supabase import Client
from supabase_auth import User


class AgentSession(SessionABC):
    """
    Agent Session implementation that stores conversation history in Supabase.

    This class implements the SessionABC interface from the OpenAI Agents SDK,
    representing an "Agent Session". It persists session items in the
    'agent_sessions' table in Supabase.

    An AgentSession is created by a User (authenticated via a UserSession)
    and is associated with that user.
    """

    def __init__(self, session_id: str, supabase_client: Client, user_access_token: str):
        """
        Initialize a Supabase-backed Agent Session.

        Args:
            session_id: Unique identifier for this agent session
            supabase_client: Authenticated Supabase client (representing the UserSession)
        """
        self.session_id = session_id
        self.supabase = supabase_client
        self.user_access_token = user_access_token
        self._ensure_session_exists()

    def _ensure_session_exists(self) -> None:
        """Ensure an agent session record exists in the database for the current user."""
        user_response = self.supabase.auth.get_user(self.user_access_token)
        if user_response is None:
            raise ValueError("Invalid user access token provided.")
        
        self.user: User = user_response.user

        # Check if agent session exists
        response = self.supabase.table("agent_sessions").select("session_id").eq("session_id", self.session_id).execute()

        if not response.data:

            # Create new agent session if it doesn't exist
            self.supabase.table("agent_sessions").insert({
                "user_id": self.user.id,
                "session_id": self.session_id,
                "items": []
            }).execute()

    def _serialize_item(self, item: TResponseInputItem) -> dict:
        """
        Serialize an item to a JSON-compatible dict.

        Args:
            item: The item to serialize

        Returns:
            Dictionary representation of the item
        """
        # Convert the item to a dict. The exact structure depends on TResponseInputItem.
        # Assuming it has a model_dump or dict method (common with Pydantic models)
        if hasattr(item, "model_dump"):
            return item.model_dump()
        elif hasattr(item, "dict"):
            return item.dict()
        else:
            # Fallback: try to convert to dict
            return dict(item)

    def _deserialize_item(self, data: dict) -> TResponseInputItem:
        """
        Deserialize a dict back to an item.

        Args:
            data: Dictionary representation of the item

        Returns:
            The deserialized item
        """
        # This is a simplified approach. In production, you'd need to know
        # the exact type to reconstruct. For now, we return the dict as-is
        # and rely on the SDK's flexibility.
        return data  # type: ignore

    async def get_items(self, limit: Optional[int] = None) -> List[TResponseInputItem]:
        """
        Retrieve conversation history for this session.

        Args:
            limit: Optional maximum number of items to return (most recent)

        Returns:
            List of conversation items
        """
        response = self.supabase.table("agent_sessions").select("items").eq("session_id", self.session_id).execute()

        if not response.data:
            return []

        items_data = response.data[0]["items"]
        items = [self._deserialize_item(item) for item in items_data]

        if limit is not None and limit > 0:
            # Return the most recent items
            return items[-limit:]

        return items

    async def add_items(self, items: List[TResponseInputItem]) -> None:
        """
        Store new items for this session.

        Args:
            items: List of conversation items to add
        """
        # Get current items
        response = self.supabase.table("agent_sessions").select("items").eq("session_id", self.session_id).execute()

        if not response.data:
            current_items = []
        else:
            current_items = response.data[0]["items"]

        # Serialize and append new items
        serialized_items = [self._serialize_item(item) for item in items]
        updated_items = current_items + serialized_items

        # Update the session
        self.supabase.table("agent_sessions").update({
            "items": updated_items
        }).eq("session_id", self.session_id).execute()

    async def pop_item(self) -> Optional[TResponseInputItem]:
        """
        Remove and return the most recent item from this session.

        Returns:
            The most recent item, or None if session is empty
        """
        # Get current items
        response = self.supabase.table("agent_sessions").select("items").eq("session_id", self.session_id).execute()

        if not response.data or not response.data[0]["items"]:
            return None

        current_items = response.data[0]["items"]

        # Pop the last item
        popped_item_data = current_items.pop()

        # Update the session
        self.supabase.table("agent_sessions").update({
            "items": current_items
        }).eq("session_id", self.session_id).execute()

        return self._deserialize_item(popped_item_data)

    async def clear_session(self) -> None:
        """Clear all items for this session."""
        self.supabase.table("agent_sessions").update({
            "items": []
        }).eq("session_id", self.session_id).execute()
