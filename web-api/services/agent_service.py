"""Agent service for managing agent business logic."""

from typing import Optional
from agents import Runner, SQLiteSession

from agent.arabic.arabic_agent import agent
from .context_service import AppContext


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
