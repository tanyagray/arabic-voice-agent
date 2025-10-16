import logging
from typing import Annotated, AsyncIterable
from pydantic import BaseModel, Field

from livekit.agents import Agent, ChatContext, ModelSettings
from llm import get_openai_gpt_4o_mini
from tts import get_arabic_female_tts
from .arabic_tutor_instructions import INSTRUCTIONS
from chat_context import get_initial_chat_context

logger = logging.getLogger(__name__)


class ArabicResponseModel(BaseModel):
    """Structured output format for Arabic voice responses."""

    spoken_response: Annotated[
        str,
        Field(
            description="The complete Arabic response text with full harakaat (vocalization marks) to be spoken"
        )
    ]


async def process_structured_output(
    text: AsyncIterable[str]
) -> AsyncIterable[str]:
    """
    Process structured output stream from LLM.

    This function accumulates the JSON response, parses it, and yields only
    the spoken response text for TTS synthesis.

    Args:
        text: Async iterable of text chunks from LLM

    Yields:
        Spoken response text chunks for TTS
    """
    accumulated_text = ""

    async for chunk in text:
        accumulated_text += chunk

    try:
        # Parse the accumulated JSON response into our Pydantic model
        parsed_response = ArabicResponseModel.model_validate_json(accumulated_text)

        # Yield only the spoken response text for TTS synthesis
        yield parsed_response.spoken_response

    except Exception as e:
        logger.error(f"Failed to parse structured output: {e}")
        # Fallback: yield the raw text if parsing fails
        yield accumulated_text


class ArabicTutorAgent(Agent):
    """Arabic language tutor agent with structured output for Arabic responses."""

    def __init__(self) -> None:
        super().__init__(
            instructions=INSTRUCTIONS,
            chat_ctx=get_initial_chat_context(),
            llm=get_openai_gpt_4o_mini(),
            tts=get_arabic_female_tts(),
        )

    async def on_enter(self) -> None:
        await self.session.generate_reply(instructions="Greet the user by name and ask what they'd like to talk about today.")

    async def on_exit(self) -> None:
        await self.session.generate_reply(instructions="Say goodbye to the user.")

    async def llm_node(
        self,
        chat_ctx: ChatContext,
        tools: list,
        model_settings: ModelSettings
    ):
        """
        Override LLM node to use structured output format.

        This ensures all LLM responses follow the ArabicResponseModel schema,
        providing the spoken response and word-level details with transliterations.
        """
        async with self.llm.chat(
            chat_ctx=chat_ctx,
            tools=tools,
            response_format=ArabicResponseModel,
        ) as stream:
            async for chunk in stream:
                yield chunk

    async def transcription_node(
        self,
        text: AsyncIterable[str],
        model_settings: ModelSettings
    ):
        """
        Override transcription node to add only spoken_response to transcript.

        This processes the structured output and yields only the spoken response text
        for the transcript, excluding the JSON structure and word-level details.
        """
        # Process structured output and pass only spoken response to transcript
        return Agent.default.transcription_node(
            self,
            process_structured_output(text),
            model_settings
        )

    async def tts_node(
        self,
        text: AsyncIterable[str],
        model_settings: ModelSettings
    ):
        """
        Override TTS node to process structured output.

        This extracts the spoken response from the structured output and
        synthesizes only that text.
        """
        # Process structured output and pass only response text to TTS
        return Agent.default.tts_node(
            self,
            process_structured_output(text),
            model_settings
        )

    # To add tools, use the @function_tool decorator.
    # Here's an example that adds a simple weather tool.
    # You also have to add `from livekit.agents.llm import function_tool, RunContext` to the top of this file
    # @function_tool
    # async def lookup_weather(self, context: RunContext, location: str):
    #     """Use this tool to look up current weather information in the given location.
    #
    #     If the location is not supported by the weather service, the tool will indicate this. You must tell the user the location's weather is unavailable.
    #
    #     Args:
    #         location: The location to look up weather information for (e.g. city name)
    #     """
    #
    #     logger.info(f"Looking up weather for {location}")
    #
    #     return "sunny with a temperature of 70 degrees."
