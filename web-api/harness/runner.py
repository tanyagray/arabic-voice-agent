"""Agent runner — pure agent execution returning canonical text."""

from agents import Runner, RunConfig

from agent.tutor.tutor_agent import agent
from harness.context import get_context
from harness.session_manager import get_session


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

    output = result.final_output
    if hasattr(output, "messages"):
        from harness.response import TextMessage
        parts = [msg.content.text for msg in output.messages if isinstance(msg, TextMessage)]
        return " ".join(parts)
    return str(output)


async def generate_greeting(session_id: str, user_access_token: str | None = None) -> str:
    """
    Generate an initial greeting for a new session.

    Runs the agent with a system prompt to greet the user, without
    adding a user message to the conversation history.

    Args:
        session_id: The session identifier
        user_access_token: Optional user's access token for Supabase authentication

    Returns:
        str: The agent's greeting response

    Raises:
        ValueError: If session is not found
    """
    session = get_session(session_id, user_access_token)
    if not session:
        raise ValueError(f"Session not found: {session_id}")

    context = get_context(session_id)

    system_message = {
        "role": "system",
        "content": "The user just opened a new chat session. Greet them warmly and invite them to start a conversation."
    }

    def session_input_callback(history, new_input):
        return history + new_input

    run_config = RunConfig(session_input_callback=session_input_callback)

    result = await Runner.run(
        agent,
        [system_message],
        session=session,
        context=context,
        run_config=run_config
    )

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
