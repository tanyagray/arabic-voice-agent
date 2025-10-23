"""Arabic agent definition and configuration."""

from agents import Agent

from .arabic_instructions import INSTRUCTIONS

agent = Agent(name="Assistant", instructions=INSTRUCTIONS)
