"""Session management routes and models."""

import logging
import time

from fastapi import APIRouter, BackgroundTasks, HTTPException, UploadFile, File, Depends
from pydantic import BaseModel, Field

from harness import session_manager as session_service, runner as agent_service, context as context_service, scaffolding as scaffolding_service
from services import posthog_service, soniox_service, transcript_service, websocket_service, plan_service
from dependencies.auth import get_current_user, get_current_user_token

logger = logging.getLogger(__name__)


# Models
class SessionResponse(BaseModel):
    """Response model containing the generated session ID."""
    session_id: str = Field(..., description="Unique session identifier (GUID)")


class TextRequest(BaseModel):
    """Request model for text chat."""
    message: str = Field(..., description="The text message to send")


class Highlight(BaseModel):
    """A highlighted Arabizi word or phrase in the scaffolded text."""
    word: str = Field(..., description="The Arabizi word as it appears in the text")
    meaning: str = Field(..., description="English meaning of the word")
    start: int = Field(..., description="Start character index in the text")
    end: int = Field(..., description="End character index in the text (exclusive)")


class TextResponse(BaseModel):
    """Response model for text chat."""
    text: str = Field(..., description="The agent's response")
    highlights: list[Highlight] = Field(default_factory=list, description="Arabizi words to highlight")


class AudioUploadResponse(BaseModel):
    """Response model for audio upload."""
    transcription_id: str = Field(..., description="Soniox transcription job identifier")
    status: str = Field(..., description="Processing status")


class UpdateContextRequest(BaseModel):
    """Request model for updating session context."""
    audio_enabled: bool | None = Field(None, description="Enable/disable audio responses")
    language: str | None = Field(None, description="Language code (e.g., 'ar-AR', 'es-MX')")
    response_mode: str | None = Field(None, description="Display mode: 'scaffolded' or 'transliterated'")


class ContextResponse(BaseModel):
    """Response model for context updates."""
    session_id: str
    audio_enabled: bool
    language: str
    active_tool: str | None
    response_mode: str


class SessionListItem(BaseModel):
    """Response model for a session in the list."""
    session_id: str
    created_at: str


class SessionListResponse(BaseModel):
    """Response model for list of user sessions."""
    sessions: list[SessionListItem]


# Router
router = APIRouter(prefix="/sessions", tags=["Session"])


async def _generate_session_greeting(session_id: str, access_token: str) -> None:
    """Background task: generate an initial agent greeting for a new session."""
    try:
        canonical_response = await agent_service.generate_greeting(session_id, access_token)

        context = context_service.get_context(session_id)
        response_mode = context.agent.response_mode if context else "scaffolded"

        scaffolded = await scaffolding_service.generate_scaffolded_text(canonical_response)
        transliterated = await scaffolding_service.generate_transliterated_text(canonical_response)
        highlights = scaffolded.highlights

        if response_mode == "canonical":
            display_response = canonical_response
        elif response_mode == "transliterated":
            display_response = transliterated
        else:
            display_response = scaffolded.text

        await transcript_service.create_transcript_message(
            session_id=session_id,
            message_source="tutor",
            message_kind="text",
            message_text=display_response,
            message_text_canonical=canonical_response,
            message_text_scaffolded=scaffolded.text,
            message_text_transliterated=transliterated,
            highlights=highlights or None,
        )
    except Exception as e:
        logger.error(f"Failed to generate greeting for session {session_id}: {e}")


@router.post("", response_model=SessionResponse)
async def create_session(background_tasks: BackgroundTasks, access_token: str = Depends(get_current_user_token)):
    """
    Generate a new session ID.

    This endpoint creates a unique session identifier (GUID) that can be used
    to track user sessions or conversations. Requires authentication.

    Args:
        background_tasks: FastAPI background tasks for async greeting generation
        access_token: JWT access token from Authorization header (automatically extracted)

    Returns:
        SessionResponse with the generated session ID

    Raises:
        HTTPException: 401 if authentication fails, 500 if session creation fails
    """
    try:
        session_id = session_service.create_session(access_token)
    except session_service.AuthenticationError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        print(f"[Session] Failed to create session: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create session: {str(e)}")

    background_tasks.add_task(_generate_session_greeting, session_id, access_token)

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
    try:
        sessions = session_service.list_user_sessions(access_token)
    except session_service.AuthenticationError as e:
        raise HTTPException(status_code=401, detail=str(e))
    return SessionListResponse(sessions=sessions)


@router.post("/{session_id}/chat", response_model=TextResponse)
async def send_chat_message(
    session_id: str,
    request: TextRequest,
    access_token: str = Depends(get_current_user_token),
    user=Depends(get_current_user),
):
    """Send a text message to the chat for a specific session."""
    try:
        plan_service.check_chat_quota(user.id)
    except plan_service.QuotaExceeded as exc:
        raise HTTPException(
            status_code=402,
            detail={"kind": exc.kind, "plan": exc.plan, "message": exc.detail},
        )
    plan_service.record_usage(user.id, "chat_message", 1)

    # Verify the session exists
    session = session_service.get_session(session_id, user_access_token=access_token)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")

    # Save the user's message to the database
    try:
        await transcript_service.create_transcript_message(
            session_id=session_id,
            message_source="user",
            message_kind="text",
            message_text=request.message,
        )
    except Exception as e:
        # Log the error but continue - don't fail the request if DB insert fails
        print(f"[Session] Failed to save user message to database: {e}")

    # Step 1: Generate the agent response (full Arabic with harakaat)
    t_start = time.monotonic()
    canonical_response = await agent_service.generate_agent_response(session_id, request.message, access_token)
    t_after_llm = time.monotonic()

    # Step 2: Generate display text based on user's response_mode setting
    context = context_service.get_context(session_id)
    response_mode = context.agent.response_mode if context else "scaffolded"
    # Always generate both display variants so the user can switch modes
    scaffolded = await scaffolding_service.generate_scaffolded_text(canonical_response, user_message=request.message)
    transliterated = await scaffolding_service.generate_transliterated_text(canonical_response)
    t_after_scaffolding = time.monotonic()
    highlights = scaffolded.highlights

    # Pick the display text based on current response_mode
    if response_mode == "canonical":
        display_response = canonical_response
    elif response_mode == "transliterated":
        display_response = transliterated
    else:
        display_response = scaffolded.text

    # Save the agent's response to the database with all display variants
    try:
        await transcript_service.create_transcript_message(
            session_id=session_id,
            message_source="tutor",
            message_kind="text",
            message_text=display_response,
            message_text_canonical=canonical_response,
            message_text_scaffolded=scaffolded.text,
            message_text_transliterated=transliterated,
            highlights=highlights or None,
        )
    except Exception as e:
        # Log the error but continue - don't fail the request if DB insert fails
        print(f"[Session] Failed to save agent response to database: {e}")

    # Check if the agent requested audio pronunciation via send_audio tool
    if context and context.agent.audio_text:
        try:
            import asyncio
            import uuid
            from services.tts_service import get_tts_service
            from services.supabase_client import get_supabase_admin_client

            tts_service = get_tts_service()
            audio_bytes = await tts_service.generate_audio(
                context.agent.audio_text, context.agent.language
            )

            if audio_bytes:
                # Upload to Supabase Storage (sync client, run in thread)
                audio_filename = f"{session_id}/{uuid.uuid4()}.mp3"
                supabase = get_supabase_admin_client()
                await asyncio.to_thread(
                    lambda: supabase.storage.from_("audio-messages").upload(
                        path=audio_filename,
                        file=audio_bytes,
                        file_options={"content-type": "audio/mpeg"},
                    )
                )

                # Get the public URL
                audio_url = supabase.storage.from_("audio-messages").get_public_url(audio_filename)

                # Generate display variants for the audio label
                audio_canonical = context.agent.audio_text
                audio_transliterated = await scaffolding_service.generate_transliterated_text(audio_canonical)

                # Create audio transcript message (appears as a separate bubble)
                await transcript_service.create_transcript_message(
                    session_id=session_id,
                    message_source="tutor",
                    message_kind="audio",
                    message_text=audio_url,
                    message_text_canonical=audio_canonical,
                    message_text_transliterated=audio_transliterated,
                )
                logger.info(f"[Session] Sent audio pronunciation for session {session_id}")
            else:
                logger.warning(f"[Session] TTS returned no audio for session {session_id}")
        except Exception as e:
            logger.error(f"[Session] Failed to generate/upload audio: {e}")
        finally:
            context.clear_audio_text()

    # Track response time analytics
    user = getattr(session, "user", None)
    posthog_service.capture(
        distinct_id=user.id if user else session_id,
        event="agent_response_completed",
        properties={
            "session_id": session_id,
            "mode": "text_rest",
            "total_ms": round((t_after_scaffolding - t_start) * 1000, 1),
            "llm_ms": round((t_after_llm - t_start) * 1000, 1),
            "scaffolding_ms": round((t_after_scaffolding - t_after_llm) * 1000, 1),
            "tts_ms": None,
            "language": context.agent.language if context else "ar-AR",
        },
    )

    return TextResponse(text=display_response, highlights=highlights)


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
async def update_context(
    session_id: str,
    request: UpdateContextRequest,
    access_token: str = Depends(get_current_user_token),
    user=Depends(get_current_user),
):
    if request.language is not None:
        try:
            plan_service.check_dialect_allowed(user.id, request.language)
        except plan_service.QuotaExceeded as exc:
            raise HTTPException(
                status_code=402,
                detail={"kind": exc.kind, "plan": exc.plan, "message": exc.detail},
            )
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

    # Get the context, recreating it with defaults if lost (e.g. after server restart)
    context = context_service.get_context(session_id)
    if not context:
        context = context_service.create_context(session_id=session_id)

    # Update audio_enabled if provided
    if request.audio_enabled is not None:
        context.set_audio_enabled(request.audio_enabled)

    # Update language if provided
    if request.language is not None:
        context.set_language(request.language)

    # Update response_mode if provided
    if request.response_mode is not None:
        context.set_response_mode(request.response_mode)

    # Return updated context
    return ContextResponse(
        session_id=context.session_id,
        audio_enabled=context.agent.audio_enabled,
        language=context.agent.language,
        active_tool=context.agent.active_tool,
        response_mode=context.agent.response_mode,
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

    # Get the context, recreating it with defaults if lost (e.g. after server restart)
    context = context_service.get_context(session_id)
    if not context:
        context = context_service.create_context(session_id=session_id)

    # Return current context
    return ContextResponse(
        session_id=context.session_id,
        audio_enabled=context.agent.audio_enabled,
        language=context.agent.language,
        active_tool=context.agent.active_tool,
        response_mode=context.agent.response_mode,
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
