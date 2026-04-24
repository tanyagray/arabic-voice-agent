"""Realtime session WebSocket routes using Pipecat."""

import time

from fastapi import APIRouter, WebSocket
from fastapi.websockets import WebSocketDisconnect
from loguru import logger

from dependencies.auth import resolve_user_from_token
from harness import session_manager as session_service
from channels.voice.pipeline import run_pipecat_agent
from services import plan_service


# Router
router = APIRouter(prefix="/pipecat", tags=["Pipecat Realtime"])


@router.websocket("/session/{session_id}")
async def pipecat_session_websocket(websocket: WebSocket, session_id: str):
    """
    Open a WebSocket connection for pipecat-based realtime agent interaction.

    This endpoint establishes a persistent WebSocket connection for a session,
    using Pipecat's pipeline for STT, LLM, and TTS processing.

    Args:
        websocket: WebSocket connection
        session_id: The session ID to connect to

    Note:
        Authentication token must be provided as a 'token' query parameter.
        Audio is streamed using Pipecat's native audio handling with protobuf serialization.
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

        # Resolve user and enforce voice quota before starting the pipeline.
        user = resolve_user_from_token(token)
        if not user:
            await websocket.send_json({"kind": "error", "data": {"message": "Invalid token"}})
            await websocket.close(code=1008, reason="Invalid token")
            return

        try:
            plan_service.check_voice_quota(user.id)
        except plan_service.QuotaExceeded as exc:
            await websocket.send_json({
                "kind": "quota_exceeded",
                "data": {"kind": exc.kind, "plan": exc.plan, "message": exc.detail},
            })
            await websocket.close(code=1008, reason="Voice quota exceeded")
            return

        # Run the pipecat agent and record elapsed voice seconds on disconnect.
        logger.info(f"Starting pipecat agent for session {session_id}")
        started_at = time.monotonic()
        try:
            await run_pipecat_agent(websocket, session_id, session, token)
        finally:
            elapsed = int(time.monotonic() - started_at)
            if elapsed > 0:
                try:
                    plan_service.record_usage(user.id, "voice_seconds", elapsed)
                except Exception as e:
                    logger.error(f"Failed to record voice usage for {user.id}: {e}")

    except WebSocketDisconnect:
        # Client disconnected
        logger.info(f"WebSocket disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"Error in pipecat websocket for session {session_id}: {e}")
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
