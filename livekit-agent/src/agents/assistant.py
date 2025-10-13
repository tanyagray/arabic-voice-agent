import logging
from typing import Annotated, AsyncIterable
from pydantic import BaseModel, Field

from livekit.agents import Agent, ChatContext, ModelSettings
from llm import get_openai_gpt_4o_mini
from llm.instructions import INSTRUCTIONS
from tts import get_arabic_female_tts

logger = logging.getLogger(__name__)


class ArabicWord(BaseModel):
    """Model for individual Arabic word/phrase with translations."""

    arabic_word: Annotated[
        str,
        Field(
            description="The Arabic word or phrase with complete harakaat (vocalization marks)"
        )
    ]
    arabic_transliteration: Annotated[
        str,
        Field(
            description="Romanized transliteration of the Arabic word for pronunciation guidance"
        )
    ]
    english_meaning: Annotated[
        str,
        Field(
            description="English translation/meaning of the Arabic word or phrase"
        )
    ]


class ArabicResponseModel(BaseModel):
    """Structured output format for Arabic voice responses with word-level details."""

    spoken_response: Annotated[
        str,
        Field(
            description="The complete Arabic response text with full harakaat (vocalization marks) to be spoken"
        )
    ]
    arabic_words: Annotated[
        list[ArabicWord],
        Field(
            description="List of all Arabic words/phrases used in the spoken response with transliterations and meanings"
        )
    ]


async def process_structured_output(
    text: AsyncIterable[str],
    callback=None
) -> AsyncIterable[str]:
    """
    Process structured output stream from LLM.

    This function accumulates the JSON response, parses it, extracts the word-level
    information via the callback, and yields only the spoken response text for TTS synthesis.

    Args:
        text: Async iterable of text chunks from LLM
        callback: Optional callback function to process the full structured response

    Yields:
        Spoken response text chunks for TTS
    """
    accumulated_text = ""

    async for chunk in text:
        accumulated_text += chunk

    try:
        # Parse the accumulated JSON response into our Pydantic model
        parsed_response = ArabicResponseModel.model_validate_json(accumulated_text)

        # Call the callback with the full structured response if provided
        if callback:
            callback(parsed_response)

        # Yield only the spoken response text for TTS synthesis
        yield parsed_response.spoken_response

    except Exception as e:
        logger.error(f"Failed to parse structured output: {e}")
        # Fallback: yield the raw text if parsing fails
        yield accumulated_text


class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions=INSTRUCTIONS,
            llm=get_openai_gpt_4o_mini(),
            tts=get_arabic_female_tts(),
        )

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

    async def tts_node(
        self,
        text: AsyncIterable[str],
        model_settings: ModelSettings
    ):
        """
        Override TTS node to process structured output.

        This extracts word-level information from the structured output and logs it,
        while only synthesizing the spoken response text.
        """
        def on_output_processed(resp: ArabicResponseModel):
            """Process and log word-level details from structured response."""
            try:
                # Log the word-level information for educational purposes
                if resp.arabic_words:
                    logger.info(f"Arabic words in response: {len(resp.arabic_words)} words/phrases")
                    for word in resp.arabic_words:
                        logger.debug(
                            f"Word: {word.arabic_word} | "
                            f"Transliteration: {word.arabic_transliteration} | "
                            f"Meaning: {word.english_meaning}"
                        )
            except Exception as e:
                logger.error(f"Failed to process word-level information: {e}")

        # Process structured output and pass only response text to TTS
        return Agent.default.tts_node(
            self,
            process_structured_output(text, callback=on_output_processed),
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
