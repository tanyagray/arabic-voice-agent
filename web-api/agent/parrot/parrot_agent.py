"""Parrot agent definition and configuration."""

from agents import Agent, RunContextWrapper, handoff

from .parrot_instructions import get_instructions


def on_enter(ctx: RunContextWrapper[None]):
    """Log when entering the Parrot agent."""
    print("🔄 Agent handoff → Parrot")


agent = Agent(name="Parrot", instructions=get_instructions)


def configure_handoffs():
    """Configure handoffs for the Parrot agent."""
    from agent.arabic.arabic_agent import agent as arabic_agent, on_enter as arabic_on_enter

    agent.handoffs = [
        handoff(agent=arabic_agent, on_handoff=arabic_on_enter)
    ]
