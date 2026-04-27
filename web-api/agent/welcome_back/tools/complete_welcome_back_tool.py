"""Tool: complete_welcome_back — marks the welcome-back flow as done.

The agent calls this after its greeting reply. Setting the flag here means
`broadcast_context` (called after every turn) will emit
`{ welcome_back: { completed: true } }` in the context message, signalling
the frontend to navigate the user to the main app.
"""

from agents import RunContextWrapper, function_tool

from harness.context import AppContext, get_context


@function_tool
def complete_welcome_back(context: RunContextWrapper[AppContext]) -> str:
    """Mark the welcome-back flow as complete, transitioning the user to the app."""
    app_context = context.context
    if app_context:
        app_context.welcome_back.completed = True
    return "welcome-back complete"
