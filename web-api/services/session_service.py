"""Session service for managing session business logic."""
import uuid
from typing import Dict, Optional
from services.agent_session import AgentSession
from services.supabase_client import get_supabase_user_client, get_supabase_admin_client
from services.context_service import create_context, delete_context

# In-memory session storage indexed by session_id
_sessions: Dict[str, AgentSession] = {}


def create_session(user_access_token: str) -> str:
    """
    Create a new agent session and store it.
    Also creates an associated context for the session.

    Args:
        user_access_token: The UserSession access token to authenticate the user.

    Returns:
        str: The generated Agent Session ID (UUID)
    """
    session_id = str(uuid.uuid4())

    # Create Supabase-backed agent session (persisted in database)
    # This uses the UserSession (via token) to authenticate
    supabase_client = get_supabase_user_client(user_access_token)
    session = AgentSession(session_id, supabase_client, user_access_token)

    # Store session indexed by session_id
    _sessions[session_id] = session

    # Create context for this session
    create_context(
        session_id=session_id,
        user_id=session_id,  # Using session_id as user_id for now
        user_name="User"     # Placeholder user name
    )

    return session_id


def get_session(session_id: str, user_access_token: Optional[str] = None) -> Optional[AgentSession]:
    """
    Retrieve an agent session by its ID.

    Args:
        session_id: The session ID to retrieve
        user_access_token: Optional user's access token for Supabase authentication (UserSession).
                          If not provided, uses admin client for service-to-service calls.

    Returns:
        AgentSession: The session object if found, None otherwise
    """
    # If session is in memory, return it
    if session_id in _sessions:
        return _sessions[session_id]

    # Otherwise, try to load from Supabase
    try:
        if user_access_token:
            supabase_client = get_supabase_user_client(user_access_token)
        else:
            # Use admin client for service-to-service calls (webhooks, etc.)
            supabase_client = get_supabase_admin_client()

        session = AgentSession(session_id, supabase_client)
        _sessions[session_id] = session
        return session
    except Exception:
        # Session doesn't exist in database
        return None


def upgrade_session_to_admin(session_id: str) -> None:
    """
    Upgrade a cached session's Supabase client to the admin client.

    Used for long-lived WebSocket connections where the user's JWT may expire
    but the session has already been authenticated.
    """
    if session_id in _sessions:
        _sessions[session_id].supabase = get_supabase_admin_client()


def delete_session(session_id: str, user_access_token: Optional[str] = None) -> bool:
    """
    Delete an agent session by its ID.
    Also deletes the associated context and removes from Supabase.

    Args:
        session_id: The session ID to delete
        user_access_token: Optional user's access token for Supabase authentication.
                          If not provided, uses admin client for service-to-service calls.

    Returns:
        bool: True if session was deleted, False if not found
    """
    # Remove from in-memory cache
    if session_id in _sessions:
        del _sessions[session_id]

    # Delete from Supabase
    try:
        if user_access_token:
            supabase_client = get_supabase_user_client(user_access_token)
        else:
            # Use admin client for service-to-service calls
            supabase_client = get_supabase_admin_client()

        supabase_client.table("agent_sessions").delete().eq("session_id", session_id).execute()
    except Exception:
        pass  # Session may not exist in database

    # Delete the associated context
    delete_context(session_id)
    return True


def get_all_sessions() -> Dict[str, AgentSession]:
    """
    Retrieve all sessions.

    Returns:
        Dict[str, AgentSession]: Dictionary of all session objects indexed by session_id
    """
    return _sessions.copy()


def list_user_sessions(user_access_token: str) -> list[dict]:
    """
    List all sessions for a specific user from the database.

    Args:
        user_access_token: The user's access token for authentication

    Returns:
        list[dict]: List of session dictionaries containing session_id and created_at
    """
    supabase_client = get_supabase_user_client(user_access_token)

    # Get user info
    user_response = supabase_client.auth.get_user(user_access_token)
    if not user_response or not user_response.user:
        return []

    user_id = user_response.user.id

    # Query all sessions for this user
    response = supabase_client.table("agent_sessions").select("session_id, created_at").eq("user_id", user_id).order("created_at", desc=True).execute()

    if not response.data:
        return []

    return [
        {
            "session_id": session["session_id"],
            "created_at": session["created_at"]
        }
        for session in response.data
    ] 
