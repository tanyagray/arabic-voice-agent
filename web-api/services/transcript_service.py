"""Transcript message service for managing transcript message persistence."""

import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from .supabase_client import get_supabase_admin_client


class TranscriptMessage(BaseModel):
    """Transcript message model matching the database schema."""
    message_id: str
    session_id: str
    user_id: str
    message_source: str  # 'user', 'tutor', or 'system'
    message_kind: str  # 'transcript', 'audio', etc.
    message_content: str
    created_at: datetime
    updated_at: datetime


async def create_transcript_message(
    session_id: str,
    message_source: str,
    message_kind: str,
    message_content: str,
) -> TranscriptMessage:
    """
    Create and persist a transcript message to the database.

    Args:
        session_id: The session ID this message belongs to
        message_source: The source of the message ('user', 'tutor', or 'system')
        message_kind: The kind/type of message (e.g., 'transcript')
        message_content: The actual message content/text

    Returns:
        TranscriptMessage: The created message with all fields populated

    Raises:
        ValueError: If session not found or user_id cannot be determined
    """
    # Get the user_id from the agent_sessions table
    supabase = get_supabase_admin_client()
    session_response = supabase.table("agent_sessions").select("user_id").eq("session_id", session_id).execute()

    if not session_response.data:
        raise ValueError(f"Session not found: {session_id}")

    user_id = session_response.data[0]["user_id"]

    # Generate a new message ID
    message_id = str(uuid.uuid4())
    now = datetime.now()

    # Create the message object
    message = TranscriptMessage(
        message_id=message_id,
        session_id=session_id,
        user_id=user_id,
        message_source=message_source,
        message_kind=message_kind,
        message_content=message_content,
        created_at=now,
        updated_at=now,
    )

    # Insert into database
    supabase.table("transcript_messages").insert({
        "message_id": message.message_id,
        "session_id": message.session_id,
        "user_id": message.user_id,
        "message_source": message.message_source,
        "message_kind": message.message_kind,
        "message_content": message.message_content,
        "created_at": message.created_at.isoformat(),
        "updated_at": message.updated_at.isoformat(),
    }).execute()

    return message


async def get_session_messages(
    session_id: str,
    limit: Optional[int] = None
) -> list[TranscriptMessage]:
    """
    Retrieve all transcript messages for a session.

    Args:
        session_id: The session ID to retrieve messages for
        limit: Optional limit on number of messages to return

    Returns:
        List of TranscriptMessage objects for the session
    """
    supabase = get_supabase_admin_client()

    query = supabase.table("transcript_messages").select("*").eq("session_id", session_id).order("created_at", desc=False)

    if limit:
        query = query.limit(limit)

    response = query.execute()

    if not response.data:
        return []

    return [
        TranscriptMessage(
            message_id=msg["message_id"],
            session_id=msg["session_id"],
            user_id=msg["user_id"],
            message_source=msg["message_source"],
            message_kind=msg["message_kind"],
            message_content=msg["message_content"],
            created_at=datetime.fromisoformat(msg["created_at"].replace("Z", "+00:00")),
            updated_at=datetime.fromisoformat(msg["updated_at"].replace("Z", "+00:00")),
        )
        for msg in response.data
    ]
