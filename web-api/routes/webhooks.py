"""Webhook handlers for external service callbacks."""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from services import soniox_service, agent_service, websocket_service, transcript_service
from services.websocket_service import Message

# Models
class SonioxWebhookPayload(BaseModel):
    """Webhook payload from Soniox when transcription completes."""
    id: str = Field(..., description="Transcription job identifier")
    status: str = Field(..., description="Job status: 'completed' or 'error'")


# Router
router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/soniox")
async def soniox_webhook(payload: SonioxWebhookPayload):
    """
    Handle webhook callback from Soniox when transcription completes.

    This endpoint:
    1. Receives notification that transcription is complete
    2. Looks up the associated session ID
    3. Fetches the transcript text from Soniox
    4. Generates agent response using the transcript
    5. Sends response to client via WebSocket

    Args:
        payload: Webhook payload containing transcription ID and status

    Returns:
        dict: Success message

    Raises:
        HTTPException: 404 if session not found, 500 if processing fails
    """
    transcription_id = payload.id
    status = payload.status

    # Look up the session ID
    session_id = soniox_service.get_session_id(transcription_id)
    if not session_id:
        raise HTTPException(
            status_code=404,
            detail=f"No session found for transcription '{transcription_id}'"
        )

    try:
        if status == "completed":
            # Fetch the transcript text
            transcript_text = await soniox_service.get_transcript(transcription_id)

            if not transcript_text:
                # Create and save error message
                try:
                    error_message = await transcript_service.create_transcript_message(
                        session_id=session_id,
                        message_source="system",
                        message_kind="text",
                        message_content="Sorry, I couldn't transcribe the audio. Please try again.",
                    )
                    await websocket_service.send_message(
                        session_id,
                        Message(
                            kind="transcript",
                            data=error_message.model_dump(mode='json')
                        )
                    )
                except Exception as e:
                    print(f"[Webhook] Failed to save error message: {e}")
                return {"message": "Empty transcript received"}

            # Create and save the user's transcribed message
            try:
                user_message = await transcript_service.create_transcript_message(
                    session_id=session_id,
                    message_source="user",
                    message_kind="text",
                    message_content=transcript_text,
                )
                await websocket_service.send_message(
                    session_id,
                    Message(
                        kind="transcript",
                        data=user_message.model_dump(mode='json')
                    )
                )
            except Exception as e:
                print(f"[Webhook] Failed to save user message: {e}")

            # Generate and send agent response (this will save and send the tutor message)
            await agent_service.trigger_agent_turn(session_id, transcript_text)

        elif status == "error":
            # Create and save error message
            try:
                error_message = await transcript_service.create_transcript_message(
                    session_id=session_id,
                    message_source="system",
                    message_kind="text",
                    message_content="Sorry, there was an error transcribing your audio. Please try again.",
                )
                await websocket_service.send_message(
                    session_id,
                    Message(
                        kind="transcript",
                        data=error_message.model_dump(mode='json')
                    )
                )
            except Exception as e:
                print(f"[Webhook] Failed to save error message: {e}")

        # Clean up the transcription job mapping
        soniox_service.remove_transcription_job(transcription_id)

        return {"message": "Webhook processed successfully"}

    except Exception as e:
        # Create and save error message
        try:
            error_message = await transcript_service.create_transcript_message(
                session_id=session_id,
                message_source="system",
                message_kind="text",
                message_content="Sorry, there was an error processing your message. Please try again.",
            )
            await websocket_service.send_message(
                session_id,
                Message(
                    kind="transcript",
                    data=error_message.model_dump(mode='json')
                )
            )
        except Exception as save_error:
            print(f"[Webhook] Failed to save error message: {save_error}")

        # Clean up even on error
        soniox_service.remove_transcription_job(transcription_id)

        raise HTTPException(
            status_code=500,
            detail=f"Failed to process webhook: {str(e)}"
        )
