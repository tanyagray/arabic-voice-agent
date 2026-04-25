"""Transcript message service for managing transcript message persistence."""

import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from .supabase_client import get_supabase_admin_client


class TranscriptMessageInput(BaseModel):
    """Content-only draft of a transcript message — no ids or timestamps yet."""
    message_source: str  # 'user', 'tutor', or 'system'
    message_kind: str  # 'transcript', 'audio', etc.
    message_text: str
    message_text_canonical: Optional[str] = None
    message_text_scaffolded: Optional[str] = None
    message_text_transliterated: Optional[str] = None
    highlights: list[dict] = []
    flow: Optional[str] = None  # e.g. 'onboarding', 'tutor'
    node: Optional[str] = None  # flow-specific node (e.g. 'name', 'motivation')


class TranscriptMessage(BaseModel):
    """Transcript message model matching the database schema."""
    message_id: str
    session_id: str
    user_id: str
    message_source: str
    message_kind: str
    message_text: str
    message_text_canonical: Optional[str] = None
    message_text_scaffolded: Optional[str] = None
    message_text_transliterated: Optional[str] = None
    highlights: list[dict] = []
    flow: Optional[str] = None
    node: Optional[str] = None
    created_at: datetime
    updated_at: datetime


async def create_transcript_message(
    session_id: str,
    message_source: str,
    message_kind: str,
    message_text: str,
    message_text_canonical: Optional[str] = None,
    message_text_scaffolded: Optional[str] = None,
    message_text_transliterated: Optional[str] = None,
    highlights: Optional[list[dict]] = None,
    flow: Optional[str] = None,
    node: Optional[str] = None,
) -> TranscriptMessage:
    """
    Create and persist a transcript message to the database.

    Args:
        session_id: The session ID this message belongs to
        message_source: The source of the message ('user', 'tutor', or 'system')
        message_kind: The kind/type of message (e.g., 'transcript')
        message_text: The display text (arabizi for tutor, raw input for user)
        message_text_canonical: Full Arabic with harakaat (tutor messages only)

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
        message_text=message_text,
        message_text_canonical=message_text_canonical,
        message_text_scaffolded=message_text_scaffolded,
        message_text_transliterated=message_text_transliterated,
        highlights=highlights or [],
        flow=flow,
        node=node,
        created_at=now,
        updated_at=now,
    )

    # Build insert data
    insert_data = {
        "message_id": message.message_id,
        "session_id": message.session_id,
        "user_id": message.user_id,
        "message_source": message.message_source,
        "message_kind": message.message_kind,
        "message_text": message.message_text,
        "created_at": message.created_at.isoformat(),
        "updated_at": message.updated_at.isoformat(),
    }
    if message.message_text_canonical is not None:
        insert_data["message_text_canonical"] = message.message_text_canonical
    if message.message_text_scaffolded is not None:
        insert_data["message_text_scaffolded"] = message.message_text_scaffolded
    if message.message_text_transliterated is not None:
        insert_data["message_text_transliterated"] = message.message_text_transliterated
    if message.highlights:
        insert_data["highlights"] = message.highlights
    if message.flow is not None:
        insert_data["flow"] = message.flow
    if message.node is not None:
        insert_data["node"] = message.node

    # Insert into database
    supabase.table("transcript_messages").insert(insert_data).execute()

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
            message_text=msg["message_text"],
            message_text_canonical=msg.get("message_text_canonical"),
            message_text_scaffolded=msg.get("message_text_scaffolded"),
            message_text_transliterated=msg.get("message_text_transliterated"),
            highlights=msg.get("highlights") or [],
            flow=msg.get("flow"),
            node=msg.get("node"),
            created_at=datetime.fromisoformat(msg["created_at"].replace("Z", "+00:00")),
            updated_at=datetime.fromisoformat(msg["updated_at"].replace("Z", "+00:00")),
        )
        for msg in response.data
    ]
