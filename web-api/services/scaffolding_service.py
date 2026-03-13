"""Scaffolding service for generating learner-facing display text from canonical Arabic."""

import os
from openai import AsyncOpenAI
from loguru import logger


_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    """Get or create the OpenAI async client."""
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return _client


SCAFFOLDING_PROMPT = """\
You are a transliteration assistant. Convert the following Arabic text to Arabizi \
(romanized Arabic using English letters).

Rules:
- Transliterate ALL Arabic words to their romanized form using common Arabizi conventions.
- Keep any English words as-is.
- Preserve punctuation and sentence structure.
- Use common Arabizi spellings (e.g., 3 for ع, 7 for ح, 2 for ء/ق).
- Do NOT add translations, explanations, or extra text.
- Return ONLY the transliterated text, nothing else.
{familiar_words_instruction}
Arabic text:
{arabic_text}"""

FAMILIAR_WORDS_INSTRUCTION = """
The learner already knows these words — keep them in Arabic script instead of transliterating:
{words}
"""


async def generate_scaffolded_text(
    arabic_text: str,
    familiar_words: list[str] | None = None,
) -> str:
    """
    Generate a scaffolded (Arabizi/romanized) version of Arabic text.

    Uses a lightweight LLM call to transliterate Arabic text to Arabizi,
    optionally keeping familiar words in Arabic script.

    Args:
        arabic_text: The full Arabic text with harakaat to transliterate.
        familiar_words: Optional list of Arabic words the learner already knows.
                       These will be kept in Arabic script. Empty/None means
                       transliterate everything.

    Returns:
        The romanized/Arabizi version of the text.
    """
    # Build familiar words instruction
    familiar_words_instruction = ""
    if familiar_words:
        words_str = ", ".join(familiar_words)
        familiar_words_instruction = FAMILIAR_WORDS_INSTRUCTION.format(words=words_str)

    prompt = SCAFFOLDING_PROMPT.format(
        arabic_text=arabic_text,
        familiar_words_instruction=familiar_words_instruction,
    )

    try:
        client = _get_client()
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=500,
        )

        result = response.choices[0].message.content
        if result:
            return result.strip()

        logger.warning("Empty response from scaffolding LLM call, falling back to original text")
        return arabic_text

    except Exception as e:
        logger.error(f"Failed to generate scaffolded text: {e}")
        # Fall back to the original Arabic text if the LLM call fails
        return arabic_text
