"""Structured response format for agent turns.

The harness enforces this schema on all agents via `output_type`. Tools return
data to the agent; the agent incorporates it into typed messages; the harness
validates, transforms (scaffolding, highlights), and persists each message.
"""

from typing import Annotated, Literal, Optional
from pydantic import BaseModel, Field


class TextContent(BaseModel):
    language: str = Field(description="BCP-47 tag, e.g. 'ar-AR' or 'en'.")
    text: str


class LessonSuggestion(BaseModel):
    id: Optional[str] = None
    title: str
    description: str
    arabic_preview: Optional[str] = None
    level: Optional[Literal["Beginner", "Intermediate", "Advanced"]] = None


class LessonSuggestionsContent(BaseModel):
    language: str
    lessons: list[LessonSuggestion]
    proposal_group_id: Optional[str] = Field(
        None,
        description=(
            "UUID linking these proposals to DB rows. "
            "Present for tutor proposals (frontend subscribes via realtime); "
            "absent for onboarding tiles rendered inline."
        ),
    )


class ImageContent(BaseModel):
    language: str
    url: str
    alt_text: str = ""


class FlashcardSetContent(BaseModel):
    language: str
    set_id: str
    title: str


class TextMessage(BaseModel):
    type: Literal["text"]
    content: TextContent


class LessonSuggestionsMessage(BaseModel):
    type: Literal["lesson-suggestions"]
    content: LessonSuggestionsContent


class ImageMessage(BaseModel):
    type: Literal["image"]
    content: ImageContent


class FlashcardSetMessage(BaseModel):
    type: Literal["flashcard-set"]
    content: FlashcardSetContent


AgentResponseMessage = Annotated[
    TextMessage | LessonSuggestionsMessage | ImageMessage | FlashcardSetMessage,
    Field(discriminator="type"),
]


class AgentResponse(BaseModel):
    messages: list[AgentResponseMessage]
