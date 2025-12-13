"""Realtime session WebSocket routes."""

from fastapi import APIRouter, HTTPException, WebSocket, Depends

from services import session_service, agent_service, websocket_service
from dependencies.auth import get_websocket_token


# Router
router = APIRouter(prefix="/realtime-session", tags=["Realtime Session"])


@router.websocket("/{session_id}")
async def open_session_websocket(websocket: WebSocket, session_id: str, access_token: str = Depends(get_websocket_token)):
    """
    Open a WebSocket connection for realtime agent interaction.

    This endpoint establishes a persistent WebSocket connection for a session,
    allowing bidirectional communication with the realtime agent.

    Args:
        websocket: WebSocket connection
        session_id: The session ID to connect to
        access_token: JWT access token from query parameters (automatically extracted)

    Raises:
        HTTPException: 404 if session not found, 401 if authentication fails
    """
    # Retrieve the session
    session = session_service.get_session(session_id, user_access_token=access_token)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")

    # Accept the connection
    await websocket.accept()

    # Register the WebSocket connection
    websocket_service.register_websocket(session_id, websocket)

    try:
        await agent_service.start_realtime_agent(websocket, session_id, access_token)
    finally:
        # Unregister the WebSocket connection when it closes
        websocket_service.unregister_websocket(session_id)
