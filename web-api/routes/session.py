"""Session management routes and models."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services import session_service, agent_service


# Models
class SessionResponse(BaseModel):
    """Response model containing the generated session ID."""
    session_id: str = Field(..., description="Unique session identifier (GUID)")


class TextRequest(BaseModel):
    """Request model for text chat."""
    message: str = Field(..., description="The text message to send")


class TextResponse(BaseModel):
    """Response model for text chat."""
    text: str = Field(..., description="The agent's response")


# Router
router = APIRouter(prefix="/session", tags=["Session"])


@router.post("", response_model=SessionResponse)
async def create_session_endpoint():
    """
    Generate a new session ID.

    This endpoint creates a unique session identifier (GUID) that can be used
    to track user sessions or conversations.

    Returns:
        SessionResponse with the generated session ID
    """
    session = session_service.create_session()

    return SessionResponse(session_id=session)


@router.post("/{session_id}/chat", response_model=TextResponse)
async def send_chat_message(session_id: str, request: TextRequest):
    """
    Send a text message to the chat for a specific session.

    Args:
        session_id: The session ID to send the message to
        request: TextRequest containing the message

    Returns:
        TextResponse with the agent's response

    Raises:
        HTTPException: 404 if session not found
    """
    # Retrieve the session
    session = session_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")

    # Run the agent with the session and user message
    response = await agent_service.run_agent(session, request.message)

    return TextResponse(text=response)
