"""Realtime session WebSocket routes."""

from fastapi import APIRouter, WebSocket
from fastapi.websockets import WebSocketDisconnect

from services import session_service, agent_service, websocket_service


# Router
router = APIRouter(prefix="/realtime-session", tags=["Realtime Session"])


@router.websocket("/{session_id}")
async def open_session_websocket(websocket: WebSocket, session_id: str):
    """
    Open a WebSocket connection for realtime agent interaction.

    This endpoint establishes a persistent WebSocket connection for a session,
    allowing bidirectional communication with the realtime agent.

    Args:
        websocket: WebSocket connection
        session_id: The session ID to connect to

    Note:
        Authentication token must be provided as a 'token' query parameter.
        If authentication fails or session is not found, the connection will be
        closed with an appropriate error message.
    """
    # Accept the connection first (required for WebSocket)
    await websocket.accept()

    try:
        # Extract and validate the token from query parameters
        token = websocket.query_params.get('token')
        if not token:
            await websocket.send_json({
                "kind": "error",
                "data": {"message": "Missing authentication token. Provide token as query parameter."}
            })
            await websocket.close(code=1008, reason="Missing authentication token")
            return

        # Retrieve the session
        session = session_service.get_session(session_id, user_access_token=token)
        if not session:
            await websocket.send_json({
                "kind": "error",
                "data": {"message": f"Session '{session_id}' not found"}
            })
            await websocket.close(code=1008, reason="Session not found")
            return

        # Switch session to admin client now that user is authenticated.
        # The user token expires after ~1 hour, but WebSocket sessions are
        # long-lived. Using the admin client avoids JWT expiration errors
        # during the session.
        session_service.upgrade_session_to_admin(session_id)

        # Register the WebSocket connection
        websocket_service.register_websocket(session_id, websocket)

        try:
            await agent_service.start_realtime_agent(websocket, session_id)
        finally:
            # Unregister the WebSocket connection when it closes
            websocket_service.unregister_websocket(session_id)

    except WebSocketDisconnect:
        # Client disconnected, cleanup is handled in finally block above
        pass
    except Exception as e:
        # Send error message before closing
        try:
            await websocket.send_json({
                "kind": "error",
                "data": {"message": f"Internal server error: {str(e)}"}
            })
        except:
            pass  # Connection might already be closed
        finally:
            await websocket.close(code=1011, reason="Internal server error")
