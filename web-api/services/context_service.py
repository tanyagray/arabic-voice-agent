"""Context service for managing application context and state tracking."""

from typing import Dict, Optional
from datetime import datetime
from pydantic import BaseModel, Field

# In-memory context storage indexed by session_id
_contexts: Dict[str, "AppContext"] = {}


class UserInfo(BaseModel):
    """
    User information for the session.
    """
    user_id: Optional[str] = None
    user_name: Optional[str] = None


class AgentState(BaseModel):
    """
    Agent state tracking information.
    """
    active_tool: Optional[str] = None


class AppContext(BaseModel):
    """
    Application context that tracks state throughout agent execution.

    This context is passed through the entire agent execution flow and
    tracks the active tool being used, user information, and metadata.
    """
    # Session info
    session_id: str

    # User info
    user: UserInfo = Field(default_factory=UserInfo)

    # Agent state
    agent: AgentState = Field(default_factory=AgentState)

    # Timestamp
    updated_at: datetime = Field(default_factory=datetime.now)

    def model_post_init(self, __context) -> None:
        """Log context creation after Pydantic initialization."""
        print(
            f"[AppContext Created] "
            f"session_id={self.session_id}, "
            f"user_id={self.user.user_id}, "
            f"user_name={self.user.user_name}, "
            f"active_tool={self.agent.active_tool}, "
            f"updated_at={self.updated_at}"
        )

    def set_active_tool(self, tool_name: Optional[str]) -> None:
        """
        Update the active tool and log the state change.

        Args:
            tool_name: The name of the tool being activated, or None to clear
        """
        previous_tool = self.agent.active_tool
        self.agent.active_tool = tool_name
        self.updated_at = datetime.now()
        print(
            f"[AppContext Tool Change] "
            f"session_id={self.session_id}, "
            f"previous_tool={previous_tool}, "
            f"active_tool={self.agent.active_tool}"
        )

    def log_state(self, event: str = "State") -> None:
        """
        Log the current context state.

        Args:
            event: Description of the event triggering the log
        """
        print(
            f"[AppContext {event}] "
            f"session_id={self.session_id}, "
            f"user_id={self.user.user_id}, "
            f"user_name={self.user.user_name}, "
            f"active_tool={self.agent.active_tool}, "
            f"updated_at={self.updated_at}"
        )


def create_context(
    session_id: str,
    user_id: Optional[str] = None,
    user_name: Optional[str] = None,
    active_tool: Optional[str] = None
) -> AppContext:
    """
    Create a new AppContext instance and store it indexed by session_id.

    Args:
        session_id: The session identifier (required)
        user_id: The user's unique identifier
        user_name: The user's display name
        active_tool: The currently active tool name

    Returns:
        AppContext: A new context instance
    """
    # Create user info
    user_info = UserInfo(user_id=user_id, user_name=user_name)

    # Create agent state
    agent_state = AgentState(active_tool=active_tool)

    # Create context
    context = AppContext(
        session_id=session_id,
        user=user_info,
        agent=agent_state
    )

    # Store context indexed by session_id
    _contexts[session_id] = context

    return context


def get_context(session_id: str) -> Optional[AppContext]:
    """
    Retrieve a context by its session ID.

    Args:
        session_id: The session ID to retrieve the context for

    Returns:
        AppContext: The context object if found, None otherwise
    """
    return _contexts.get(session_id)


def delete_context(session_id: str) -> bool:
    """
    Delete a context by its session ID.

    Args:
        session_id: The session ID to delete the context for

    Returns:
        bool: True if context was deleted, False if not found
    """
    if session_id in _contexts:
        del _contexts[session_id]
        return True
    return False
