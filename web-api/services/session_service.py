"""Session service for managing session business logic."""

import uuid
from typing import Dict, Optional
from agents import SQLiteSession

# In-memory session storage indexed by session_id
_sessions: Dict[str, SQLiteSession] = {}


def create_session() -> str:
    """
    Create a new session and store it.

    Returns:
        str: The generated session ID (UUID)
    """
    session_id = str(uuid.uuid4())

    # In-memory database (lost when process ends)
    session = SQLiteSession(session_id)

    # Store session indexed by session_id
    _sessions[session_id] = session

    return session_id


def get_session(session_id: str) -> Optional[SQLiteSession]:
    """
    Retrieve a session by its ID.

    Args:
        session_id: The session ID to retrieve

    Returns:
        SQLiteSession: The session object if found, None otherwise
    """
    return _sessions.get(session_id)


def delete_session(session_id: str) -> bool:
    """
    Delete a session by its ID.

    Args:
        session_id: The session ID to delete

    Returns:
        bool: True if session was deleted, False if not found
    """
    if session_id in _sessions:
        del _sessions[session_id]
        return True
    return False


def get_all_sessions() -> Dict[str, SQLiteSession]:
    """
    Retrieve all sessions.

    Returns:
        Dict[str, SQLiteSession]: Dictionary of all session objects indexed by session_id
    """
    return _sessions.copy() 
