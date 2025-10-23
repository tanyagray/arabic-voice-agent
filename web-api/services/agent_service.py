"""Agent service for managing agent business logic."""

from agents import Agent, Runner, SQLiteSession

agent = Agent(name="Assistant", instructions="You are a helpful assistant")


async def run_agent(session: SQLiteSession, user_message: str) -> str:
    """
    Run the agent with the given session and user message.

    Args:
        session: The SQLiteSession to use for the agent
        user_message: The user's input message to process

    Returns:
        str: The agent's response
    """
    result = await Runner.run(agent, user_message, session=session)
    return result.final_output
