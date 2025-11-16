"""Parrot agent lifecycle hooks for tracking tool usage and state changes."""

from agents import AgentHooks, RunContextWrapper, Agent, Tool

from services.context_service import AppContext


class ParrotAgentHooks(AgentHooks):
    """
    Custom agent hooks for the Parrot translation game agent.

    This hooks class automatically updates the active_tool property in
    AppContext whenever a tool starts or ends, and logs all state changes
    specific to the Parrot game experience.
    """

    def __init__(self):
        """Initialize the Parrot agent hooks."""
        self.event_counter = 0

    async def on_start(
        self,
        context: RunContextWrapper[AppContext],
        agent: Agent[AppContext],
    ) -> None:
        """
        Called when the Parrot agent starts execution.

        Args:
            context: The run context wrapper containing AppContext
            agent: The agent that is starting
        """
        self.event_counter += 1
        print(
            f"[Parrot Game] Agent '{agent.name}' started "
            f"(event #{self.event_counter})"
        )

        if context.context:
            context.context.log_state("Agent Start")

    async def on_tool_start(
        self,
        context: RunContextWrapper[AppContext],
        agent: Agent[AppContext],
        tool: Tool,
    ) -> None:
        """
        Called when a tool starts execution.

        Updates the active_tool property in AppContext and logs the change.

        Args:
            context: The run context wrapper containing AppContext
            agent: The agent executing the tool
            tool: The tool being executed
        """
        self.event_counter += 1
        print(
            f"[Parrot Game] Agent '{agent.name}' started tool '{tool.name}' "
            f"(event #{self.event_counter})"
        )

        # Update the active tool in the context
        if context.context:
            context.context.set_active_tool(tool.name)

    async def on_tool_end(
        self,
        context: RunContextWrapper[AppContext],
        agent: Agent[AppContext],
        tool: Tool,
        result: str,
    ) -> None:
        """
        Called when a tool finishes execution.

        Clears the active_tool property in AppContext and logs the change.

        Args:
            context: The run context wrapper containing AppContext
            agent: The agent that executed the tool
            tool: The tool that was executed
            result: The result returned by the tool
        """
        self.event_counter += 1
        print(
            f"[Parrot Game] Agent '{agent.name}' ended tool '{tool.name}' "
            f"with result length {len(result)} chars (event #{self.event_counter})"
        )

        # Clear the active tool in the context (tool execution complete)
        if context.context:
            context.context.set_active_tool(None)
            context.context.log_state("After Tool End")

    async def on_end(
        self,
        context: RunContextWrapper[AppContext],
        agent: Agent[AppContext],
        output: str,
    ) -> None:
        """
        Called when the agent completes execution.

        Args:
            context: The run context wrapper containing AppContext
            agent: The agent that completed
            output: The final output from the agent
        """
        self.event_counter += 1
        print(
            f"[Parrot Game] Agent '{agent.name}' completed "
            f"with output length {len(output)} chars (event #{self.event_counter})"
        )

        if context.context:
            context.context.log_state("Agent End")

    async def on_handoff(
        self,
        context: RunContextWrapper[AppContext],
        from_agent: Agent[AppContext],
        to_agent: Agent[AppContext],
    ) -> None:
        """
        Called when control is handed off from one agent to another.

        Args:
            context: The run context wrapper containing AppContext
            from_agent: The agent handing off control
            to_agent: The agent receiving control
        """
        self.event_counter += 1
        print(
            f"[Parrot Game] Handoff from '{from_agent.name}' to '{to_agent.name}' "
            f"(event #{self.event_counter})"
        )

        if context.context:
            context.context.log_state("Agent Handoff")
