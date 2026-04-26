"""Tool → harness handoff for UI bubbles.

Tools never write to `transcript_messages` themselves. When a tool wants
to emit a `message_kind='component'` row, it appends a `ComponentMessage`
to `app_context.outbox`. The harness drains the outbox at the end of the
turn and persists each entry as its own component row.

Keeping this on the context (rather than as a tool return type) means a
tool can both queue UI *and* return a normal string to the agent — useful
for tools like `propose_lessons` that hand the agent back a list of IDs.
"""

from typing import Any

from pydantic import BaseModel


class ComponentMessage(BaseModel):
    """One component-kind transcript row, queued by a tool, persisted by the harness."""

    component_name: str
    props: dict[str, Any]
