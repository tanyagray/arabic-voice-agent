"""Central configuration for all agents and their handoffs."""

from agent.arabic import arabic_agent
from agent.parrot import parrot_agent

# Configure handoffs after both agents are imported to avoid circular dependencies
arabic_agent.configure_handoffs()
parrot_agent.configure_handoffs()

# Export the main assistant agent
assistant_agent = arabic_agent.agent
