"""Webhook handlers for external service callbacks."""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from services import soniox_service, agent_service, websocket_service
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
                # Send error message to client
                await websocket_service.send_message(
                    session_id,
                    Message(
                        kind="transcript",
                        data={
                            "source": "system",
                            "text": "Sorry, I couldn't transcribe the audio. Please try again."
                        }
                    )
                )
                return {"message": "Empty transcript received"}

            # Send the user's transcribed message to the client
            await websocket_service.send_message(
                session_id,
                Message(
                    kind="transcript",
                    data={
                        "source": "user",
                        "text": transcript_text
                    }
                )
            )

            # Generate agent response
            agent_response = await agent_service.generate_agent_response(session_id, transcript_text)

            # Send agent response to client via WebSocket
            await websocket_service.send_message(
                session_id,
                Message(
                    kind="transcript",
                    data={
                        "source": "tutor",
                        "text": agent_response
                    }
                )
            )

        elif status == "error":
            # Send error message to client
            await websocket_service.send_message(
                session_id,
                Message(
                    kind="transcript",
                    data={
                        "source": "system",
                        "text": "Sorry, there was an error transcribing your audio. Please try again."
                    }
                )
            )

        # Clean up the transcription job mapping
        soniox_service.remove_transcription_job(transcription_id)

        return {"message": "Webhook processed successfully"}

    except Exception as e:
        # Send error message to client
        await websocket_service.send_message(
            session_id,
            Message(
                kind="transcript",
                data={
                    "source": "system",
                    "text": "Sorry, there was an error processing your message. Please try again."
                }
            )
        )

        # Clean up even on error
        soniox_service.remove_transcription_job(transcription_id)

        raise HTTPException(
            status_code=500,
            detail=f"Failed to process webhook: {str(e)}"
        )
