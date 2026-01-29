"""Agent service for managing agent business logic."""

import asyncio
from agents import Runner, RunConfig
from fastapi import WebSocket

from agent.tutor.tutor_agent import agent
from .context_service import get_context
from .session_service import get_session
from .websocket_service import Message, send_message, send_audio_message
from .tts_service import get_tts_service
from .transcript_service import create_transcript_message


async def generate_agent_response(session_id: str, user_message: str, user_access_token: str | None = None) -> str:
    """
    Generate an agent response for the given session ID and user message.

    Args:
        session_id: The session identifier to look up the session and context
        user_message: The user's input message to process
        user_access_token: Optional user's access token for Supabase authentication

    Returns:
        str: The agent's response

    Raises:
        ValueError: If session is not found
    """
    # Look up the session
    session = get_session(session_id, user_access_token)
    if not session:
        raise ValueError(f"Session not found: {session_id}")

    # Look up the context
    context = get_context(session_id)

    # Run the agent
    result = await Runner.run(agent, user_message, session=session, context=context)

    return result.final_output


async def generate_agent_followup(session_id: str, user_access_token: str | None = None) -> str:
    """
    Generate a followup agent response using existing session history.

    This function runs the agent without adding a new user message, allowing
    the agent to continue based on the existing conversation history. Adds a
    system message to indicate the user has not responded.

    Args:
        session_id: The session identifier to look up the session and context
        user_access_token: Optional user's access token for Supabase authentication

    Returns:
        str: The agent's followup response

    Raises:
        ValueError: If session is not found
    """
    # Look up the session
    session = get_session(session_id, user_access_token)
    if not session:
        raise ValueError(f"Session not found: {session_id}")

    # Look up the context
    context = get_context(session_id)

    # Add a system message to the history to trigger the followup
    system_message = {
        "role": "system",
        "content": "making the user feel comfortable by continuing the conversation"
    }

    # Define a callback that uses the provided input (system message) as-is
    def session_input_callback(history, new_input):
        # new_input is our system message list
        # We want to use the full history plus the system message
        return history + new_input

    # Create run config with the callback
    run_config = RunConfig(session_input_callback=session_input_callback)

    # Run the agent with the system message as input
    result = await Runner.run(
        agent,
        [system_message],
        session=session,
        context=context,
        run_config=run_config
    )

    return result.final_output


async def trigger_agent_turn(session_id: str, user_message: str | None = None, user_access_token: str | None = None) -> None:
    """
    Process a complete agent turn: run the agent and send response and context updates.

    Args:
        session_id: The session identifier for WebSocket communication
        user_message: Optional user input message. If provided, generates a response to the message.
                     If None, generates a followup based on existing conversation history.
        user_access_token: Optional user's access token for Supabase authentication
    """
    # Run the agent with or without a new user message
    if user_message is not None:
        text_response = await generate_agent_response(session_id, user_message, user_access_token)
    else:
        text_response = await generate_agent_followup(session_id, user_access_token)

    # Create and save the tutor message to the database
    try:
        transcript_message = await create_transcript_message(
            session_id=session_id,
            message_source="tutor",
            message_kind="text",
            message_content=text_response,
        )

        # Send the full message format via websocket
        await send_message(
            session_id,
            Message(
                kind="transcript",
                data=transcript_message.model_dump(mode='json')
            )
        )
    except Exception as e:
        # If database save fails, still send a simple message
        print(f"[Agent] Failed to save tutor message to database: {e}")
        await send_message(
            session_id,
            Message(
                kind="transcript",
                data={
                    "source": "tutor",
                    "text": text_response
                }
            )
        )

    # Check if audio is enabled and generate audio if so
    context = get_context(session_id)
    if context and context.agent.audio_enabled:
        try:
            # Get TTS service and generate audio
            tts_service = get_tts_service()
            audio_bytes = await tts_service.generate_audio(
                text_response, context.agent.language
            )

            if audio_bytes:
                # Encode audio to base64 and send via websocket
                audio_base64 = tts_service.encode_audio_base64(audio_bytes)
                await send_audio_message(session_id, audio_base64, format="mp3")
                print(f"[Agent] Sent audio response for session {session_id}")
            else:
                print(f"[Agent] Failed to generate audio for session {session_id}")
        except Exception as e:
            print(f"[Agent] Error generating audio: {e}")
            # Continue even if audio generation fails - user still has text

    # Retrieve the latest context state before sending
    updated_context = get_context(session_id)
    if updated_context:
        # Send the updated context on the websocket
        await send_message(
            session_id,
            Message(
                kind="context",
                data=updated_context.model_dump(mode='json')
            )
        )


async def start_realtime_agent(websocket: WebSocket, session_id: str) -> None:
    """
    Start a realtime agent that processes messages from a WebSocket connection.

    This function runs in a loop, receiving text messages from the WebSocket,
    processing them through the agent, and sending back responses and updated context.
    Uses exponential backoff for automatic followups with a maximum of 3 followup messages.

    Args:
        websocket: The WebSocket connection to receive/send messages
        session_id: The session identifier
    """
    base_timeout = 5.0  # seconds
    max_followups = 3
    followup_count = 0
    current_timeout = base_timeout

    while True:
        try:
            # Wait for user message with current timeout
            user_message = await asyncio.wait_for(
                websocket.receive_text(),
                timeout=current_timeout
            )
            # User responded - reset followup counter and timeout
            followup_count = 0
            current_timeout = base_timeout

            # Save the user's message to the database
            try:
                await create_transcript_message(
                    session_id=session_id,
                    message_source="user",
                    message_kind="text",
                    message_content=user_message,
                )
            except Exception as e:
                # Log the error but continue - don't fail the request if DB insert fails
                print(f"[Agent] Failed to save user message to database: {e}")

            # Process the user message
            await trigger_agent_turn(session_id, user_message)
        except asyncio.TimeoutError:
            # Timeout reached - check if we can send more followups
            if followup_count < max_followups:
                # Send agent followup
                await trigger_agent_turn(session_id)
                followup_count += 1
                # Increase timeout for next followup (exponential backoff)
                current_timeout *= 2
            else:
                # Max followups reached - reset and wait with max timeout
                current_timeout = base_timeout * (2 ** max_followups)
