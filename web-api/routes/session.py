"""Session management routes and models."""

from fastapi import APIRouter, HTTPException, WebSocket
from pydantic import BaseModel, Field

from services import session_service, agent_service, context_service


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
async def create_session():
    """
    Generate a new session ID.

    This endpoint creates a unique session identifier (GUID) that can be used
    to track user sessions or conversations.

    Returns:
        SessionResponse with the generated session ID
    """
    session_id = session_service.create_session()

    return SessionResponse(session_id=session_id)


@router.websocket("/{session_id}")
async def open_session_websocket(websocket: WebSocket, session_id: str):

    # Retrieve the session
    session = session_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")

    # Retrieve the application context
    app_context = context_service.get_context(session_id)
    if not app_context:
        raise HTTPException(status_code=404, detail=f"Context for session '{session_id}' not found")

    # Accept the connection
    await websocket.accept()

    # Register the WebSocket connection
    session_service.register_websocket(session_id, websocket)

    try:
        while True:
            user_message = await websocket.receive_text()

            # Run the agent with the session and user message
            response = await agent_service.run_agent(session, user_message, context=app_context)

            # Send the response on the websocket
            await websocket.send_text(response)

            # Send the context on the websocket
            await websocket.send_json({
                "kind": "context",
                "data": app_context.model_dump(mode='json')
            })
    finally:
        # Unregister the WebSocket connection when it closes
        session_service.unregister_websocket(session_id)


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
        HTTPException: 404 if session or context not found
    """
    # Retrieve the session
    session = session_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")

    # Retrieve the application context
    app_context = context_service.get_context(session_id)
    if not app_context:
        raise HTTPException(status_code=404, detail=f"Context for session '{session_id}' not found")

    # Run the agent with the session and user message
    response = await agent_service.run_agent(session, request.message, context=app_context)

    return TextResponse(text=response)


@router.post("/{session_id}/event")
async def send_test_event(session_id: str):
    """
    Send a test event message to the WebSocket for a specific session.

    Args:
        session_id: The session ID to send the event to

    Returns:
        dict: Success message

    Raises:
        HTTPException: 404 if session or WebSocket connection not found
    """
    # Retrieve the session
    session = session_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")

    # Retrieve the WebSocket connection
    websocket = session_service.get_websocket(session_id)
    if not websocket:
        raise HTTPException(
            status_code=404,
            detail=f"No active WebSocket connection for session '{session_id}'"
        )

    # Send the test event
    await websocket.send_text("TEST EVENT")

    return {"message": "Test event sent successfully"}
