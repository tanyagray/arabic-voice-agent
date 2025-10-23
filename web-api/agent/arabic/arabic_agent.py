"""Arabic agent definition and configuration."""

from agents import Agent

from .arabic_instructions import get_instructions

agent = Agent(name="Assistant", instructions=get_instructions)
