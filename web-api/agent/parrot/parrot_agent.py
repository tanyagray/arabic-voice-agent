"""Parrot agent definition and configuration."""

from agents import Agent

from .parrot_hooks import ParrotAgentHooks
from .parrot_instructions import get_instructions

agent = Agent(
    name="Parrot",
    instructions=get_instructions,
    hooks=ParrotAgentHooks(),
)
