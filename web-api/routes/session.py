"""Session management routes and models."""

from fastapi import APIRouter, HTTPException, WebSocket, UploadFile, File, Depends
from pydantic import BaseModel, Field

from services import session_service, agent_service, context_service, websocket_service, soniox_service
from dependencies.auth import get_current_user_token, get_websocket_token


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


class AudioUploadResponse(BaseModel):
    """Response model for audio upload."""
    transcription_id: str = Field(..., description="Soniox transcription job identifier")
    status: str = Field(..., description="Processing status")


class UpdateContextRequest(BaseModel):
    """Request model for updating session context."""
    audio_enabled: bool | None = Field(None, description="Enable/disable audio responses")
    language: str | None = Field(None, description="Language code (e.g., 'ar-AR', 'es-MX')")


class ContextResponse(BaseModel):
    """Response model for context updates."""
    session_id: str
    audio_enabled: bool
    language: str
    active_tool: str | None


class SessionListItem(BaseModel):
    """Response model for a session in the list."""
    session_id: str
    created_at: str


class SessionListResponse(BaseModel):
    """Response model for list of user sessions."""
    sessions: list[SessionListItem]


# Router
router = APIRouter(prefix="/sessions", tags=["Session"])


@router.post("", response_model=SessionResponse)
async def create_session(access_token: str = Depends(get_current_user_token)):
    """
    Generate a new session ID.

    This endpoint creates a unique session identifier (GUID) that can be used
    to track user sessions or conversations. Requires authentication.

    Args:
        access_token: JWT access token from Authorization header (automatically extracted)

    Returns:
        SessionResponse with the generated session ID

    Raises:
        HTTPException: 401 if authentication fails
    """
    session_id = session_service.create_session(access_token)

    return SessionResponse(session_id=session_id)


@router.get("", response_model=SessionListResponse)
async def list_user_sessions(access_token: str = Depends(get_current_user_token)):
    """
    List all sessions for the authenticated user.

    Args:
        access_token: JWT access token from Authorization header (automatically extracted)

    Returns:
        SessionListResponse with list of user sessions

    Raises:
        HTTPException: 401 if authentication fails
    """
    sessions = session_service.list_user_sessions(access_token)
    return SessionListResponse(sessions=sessions)


@router.websocket("/{session_id}")
async def open_session_websocket(websocket: WebSocket, session_id: str, access_token: str = Depends(get_websocket_token)):

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


@router.post("/{session_id}/chat", response_model=TextResponse)
async def send_chat_message(session_id: str, request: TextRequest, access_token: str = Depends(get_current_user_token)):
    """
    Send a text message to the chat for a specific session.

    Args:
        session_id: The session ID to send the message to
        request: TextRequest containing the message
        access_token: JWT access token from Authorization header (automatically extracted)

    Returns:
        TextResponse with the agent's response

    Raises:
        HTTPException: 404 if session not found, 401 if authentication fails
    """
    # Verify the session exists
    session = session_service.get_session(session_id, user_access_token=access_token)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")

    # Generate the agent response
    response = await agent_service.generate_agent_response(session_id, request.message, access_token)

    return TextResponse(text=response)


@router.post("/{session_id}/event")
async def send_test_event(session_id: str, access_token: str = Depends(get_current_user_token)):
    """
    Send a test event message to the WebSocket for a specific session.

    Args:
        session_id: The session ID to send the event to
        access_token: JWT access token from Authorization header (automatically extracted)

    Returns:
        dict: Success message

    Raises:
        HTTPException: 404 if session or WebSocket connection not found, 401 if authentication fails
    """
    # Retrieve the session
    session = session_service.get_session(session_id, user_access_token=access_token)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")

    # Retrieve the WebSocket connection
    websocket = websocket_service.get_websocket(session_id)
    if not websocket:
        raise HTTPException(
            status_code=404,
            detail=f"No active WebSocket connection for session '{session_id}'"
        )

    # Send the test event
    await websocket.send_text("TEST EVENT")

    return {"message": "Test event sent successfully"}


@router.patch("/{session_id}/context", response_model=ContextResponse)
async def update_context(session_id: str, request: UpdateContextRequest, access_token: str = Depends(get_current_user_token)):
    """
    Update session context settings (audio, language, etc.).

    Args:
        session_id: The session ID to update
        request: UpdateContextRequest with fields to update
        access_token: JWT access token from Authorization header (automatically extracted)

    Returns:
        ContextResponse with updated context state

    Raises:
        HTTPException: 404 if session or context not found, 401 if authentication fails
    """
    # Verify the session exists
    session = session_service.get_session(session_id, user_access_token=access_token)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")

    # Get the context
    context = context_service.get_context(session_id)
    if not context:
        raise HTTPException(status_code=404, detail=f"Context not found for session '{session_id}'")

    # Update audio_enabled if provided
    if request.audio_enabled is not None:
        context.set_audio_enabled(request.audio_enabled)

    # Update language if provided
    if request.language is not None:
        context.set_language(request.language)

    # Return updated context
    return ContextResponse(
        session_id=context.session_id,
        audio_enabled=context.agent.audio_enabled,
        language=context.agent.language,
        active_tool=context.agent.active_tool
    )


@router.get("/{session_id}/context", response_model=ContextResponse)
async def get_context(session_id: str, access_token: str = Depends(get_current_user_token)):
    """
    Get current session context settings.

    Args:
        session_id: The session ID to get context for
        access_token: JWT access token from Authorization header (automatically extracted)

    Returns:
        ContextResponse with current context state

    Raises:
        HTTPException: 404 if session or context not found, 401 if authentication fails
    """
    # Verify the session exists
    session = session_service.get_session(session_id, user_access_token=access_token)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")

    # Get the context
    context = context_service.get_context(session_id)
    if not context:
        raise HTTPException(status_code=404, detail=f"Context not found for session '{session_id}'")

    # Return current context
    return ContextResponse(
        session_id=context.session_id,
        audio_enabled=context.agent.audio_enabled,
        language=context.agent.language,
        active_tool=context.agent.active_tool
    )


@router.post("/{session_id}/audio", response_model=AudioUploadResponse)
async def upload_audio(session_id: str, file: UploadFile = File(...), access_token: str = Depends(get_current_user_token)):
    """
    Upload audio file for speech-to-text transcription.

    This endpoint:
    1. Uploads the audio file to Soniox Files API
    2. Creates an async transcription job with webhook callback
    3. Returns the transcription ID for tracking

    The transcription result will be sent to the client via WebSocket
    when the webhook callback is received.

    Args:
        session_id: The session ID to associate with this transcription
        file: Audio file in supported format (webm, mp3, wav, etc.)
        access_token: JWT access token from Authorization header (automatically extracted)

    Returns:
        AudioUploadResponse with transcription ID and status

    Raises:
        HTTPException: 404 if session not found, 401 if authentication fails, 500 if upload/transcription fails
    """
    # Verify the session exists
    session = session_service.get_session(session_id, user_access_token=access_token)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")

    try:
        # Read the audio file bytes
        audio_bytes = await file.read()

        # Upload to Soniox Files API
        file_id = await soniox_service.upload_audio_file(audio_bytes, file.filename or "recording.webm")

        # Get the target language from session context
        context = context_service.get_context(session_id)
        target_language = "ar"  # Default to Arabic
        if context and context.agent.language:
            # Extract language code from locale (e.g., "ar-AR" -> "ar", "es-MX" -> "es")
            target_language = context.agent.language.split("-")[0]

        # Create transcription job with webhook callback and language hints
        transcription_id = await soniox_service.create_transcription(file_id, session_id, target_language)

        return AudioUploadResponse(
            transcription_id=transcription_id,
            status="processing"
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process audio: {str(e)}"
        )
