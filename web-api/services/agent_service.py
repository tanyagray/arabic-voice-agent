"""Agent service for managing agent business logic."""

from typing import Optional
from agents import Runner, SQLiteSession
from fastapi import WebSocket

from agent.tutor.tutor_agent import agent
from .context_service import AppContext, get_context


async def run_agent(session: SQLiteSession, user_message: str, context: Optional[AppContext] = None) -> str:
    """
    Run the agent with the given session and user message.

    Args:
        session: The SQLiteSession to use for the agent
        user_message: The user's input message to process
        context: Optional application context with user info and state tracking

    Returns:
        str: The agent's response
    """
    result = await Runner.run(agent, user_message, session=session, context=context)

    return result.final_output


async def start_realtime_agent(
    websocket: WebSocket,
    session: SQLiteSession,
    session_id: str,
    app_context: AppContext
) -> None:
    """
    Start a realtime agent that processes messages from a WebSocket connection.

    This function runs in a loop, receiving text messages from the WebSocket,
    processing them through the agent, and sending back responses and updated context.

    Args:
        websocket: The WebSocket connection to receive/send messages
        session: The SQLiteSession to use for the agent
        session_id: The session identifier
        app_context: The application context with user info and state tracking
    """
    while True:
        user_message = await websocket.receive_text()

        # Run the agent with the session and user message
        text_response = await run_agent(session, user_message, context=app_context)

        # Send the response on the websocket
        await websocket.send_json({
            "kind": "transcript",
            "data": {
                "source": "tutor",
                "text": text_response
            }
        })

        # Retrieve the latest context state before sending
        updated_context = get_context(session_id)
        if updated_context:
            # Send the updated context on the websocket
            await websocket.send_json({
                "kind": "context",
                "data": updated_context.model_dump(mode='json')
            })
