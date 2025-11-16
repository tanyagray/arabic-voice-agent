"""Arabic agent definition and configuration."""

from agents import Agent, RunContextWrapper, handoff

from .arabic_instructions import get_instructions


def on_enter(ctx: RunContextWrapper[None]):
    """Log when entering the Assistant agent."""
    print("🔄 Agent handoff → Assistant")


agent = Agent(name="Assistant", instructions=get_instructions)


def configure_handoffs():
    """Configure handoffs for the Arabic agent."""
    from agent.parrot.parrot_agent import agent as parrot_agent, on_enter as parrot_on_enter

    agent.handoffs = [
        handoff(agent=parrot_agent, on_handoff=parrot_on_enter)
    ]
