"""WebSocket service for managing WebSocket connections."""

from typing import Dict, Optional
from fastapi import WebSocket
from pydantic import BaseModel


class Message(BaseModel):
    """Message structure for WebSocket communication."""
    kind: str
    data: dict

# In-memory WebSocket storage indexed by session_id
_websockets: Dict[str, WebSocket] = {}


def register_websocket(session_id: str, websocket: WebSocket) -> None:
    """
    Register a WebSocket connection for a session.

    Args:
        session_id: The session ID to associate with the WebSocket
        websocket: The WebSocket connection to register
    """
    _websockets[session_id] = websocket


def unregister_websocket(session_id: str) -> None:
    """
    Unregister a WebSocket connection for a session.

    Args:
        session_id: The session ID to unregister
    """
    if session_id in _websockets:
        del _websockets[session_id]


def get_websocket(session_id: str) -> Optional[WebSocket]:
    """
    Retrieve the WebSocket connection for a session.

    Args:
        session_id: The session ID to retrieve the WebSocket for

    Returns:
        WebSocket: The WebSocket connection if found, None otherwise
    """
    return _websockets.get(session_id)


async def send_message(session_id: str, message: Message) -> None:
    """
    Send a message to a WebSocket connection.

    Args:
        session_id: The session ID to send the message to
        message: The Message object to send

    Raises:
        ValueError: If no WebSocket connection exists for the session
    """
    websocket = get_websocket(session_id)
    if websocket is None:
        raise ValueError(f"No WebSocket connection found for session: {session_id}")

    await websocket.send_json(message.model_dump())
