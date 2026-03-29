"""Scaffolding service for generating learner-facing display text from canonical Arabic.

Two modes:
- Scaffolded text: Translates Arabic into English, keeping learned words as Arabizi.
- Transliterated text: Pure Arabizi romanization of Arabic (no translation).
"""

import os
from pathlib import Path
from openai import AsyncOpenAI
from loguru import logger


_client: AsyncOpenAI | None = None

PROMPTS_DIR = Path(__file__).parent.parent / "agent" / "tutor" / "prompts"


def _get_client() -> AsyncOpenAI:
    """Get or create the OpenAI async client."""
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return _client


def _load_scaffolding_prompt() -> str:
    path = PROMPTS_DIR / "scaffolding.md"
    return path.read_text(encoding="utf-8")


def _load_transliteration_prompt() -> str:
    path = PROMPTS_DIR / "transliteration.md"
    return path.read_text(encoding="utf-8")

LEARNED_WORDS_WITH_WORDS = """The learner has previously learned the following Arabic words (given as base/stem forms). \
Keep these words — and any inflected variants (plurals, conjugations, dual forms, etc.) — \
in the translated sentence as Arabizi (romanized Arabic) instead of translating them to English.

Use common Arabizi conventions (e.g., 3 for ع, 7 for ح, 2 for ء/ق).

For example, if the learner knows "sayaara" (سيارة), then "السيارات" should appear as \
"sayaaraat" rather than "cars".

Learned words:
{words}"""

LEARNED_WORDS_EMPTY = "No learned words yet. Translate the ENTIRE text to English, except for the one new \
Arabizi word described above."


class PhaseResult:
    """Result of a scaffolding/transliteration LLM call with metadata for debugging."""

    def __init__(self, text: str, model: str, usage: dict, raw_output: str, prompt: str = ""):
        self.text = text
        self.model = model
        self.usage = usage
        self.raw_output = raw_output
        self.prompt = prompt

    def to_dict(self) -> dict:
        return {
            "text": self.text,
            "model": self.model,
            "usage": self.usage,
            "raw_output": self.raw_output,
            "prompt": self.prompt,
        }


async def generate_scaffolded_text(
    arabic_text: str,
    learned_words: list[str] | None = None,
) -> str:
    """
    Generate scaffolded display text by translating Arabic into English.

    Learned words (and their inflected forms) are kept inline as Arabizi
    instead of being translated. Additionally, one new word is kept as
    Arabizi to gradually introduce new vocabulary.

    Args:
        arabic_text: The full Arabic text with harakaat to translate.
        learned_words: Optional list of Arabic stem/base words the learner has
                       previously learned. These (and inflected variants) will
                       appear as Arabizi. Empty/None means only one new word
                       appears as Arabizi.

    Returns:
        English text with learned + one new word as inline Arabizi.
    """
    # Build learned words instruction
    if learned_words:
        words_str = ", ".join(learned_words)
        learned_words_instruction = LEARNED_WORDS_WITH_WORDS.format(words=words_str)
    else:
        learned_words_instruction = LEARNED_WORDS_EMPTY

    prompt = _load_scaffolding_prompt().format(
        arabic_text=arabic_text,
        learned_words_instruction=learned_words_instruction,
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




async def generate_transliterated_text(text: str) -> str:
    """
    Transliterate Arabic script to Arabizi (romanized Arabic).

    Unlike scaffolded text, this does no translation — it purely romanizes
    Arabic words using the English alphabet. Any English words in the input
    are preserved as-is.

    Args:
        text: Text that may contain Arabic script.

    Returns:
        The same text with all Arabic script replaced by Arabizi.
    """
    try:
        client = _get_client()
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": _load_transliteration_prompt().format(text=text)}],
            temperature=0.2,
            max_tokens=500,
        )

        result = response.choices[0].message.content
        if result:
            return result.strip()

        logger.warning("Empty response from transliteration LLM call, falling back to original text")
        return text

    except Exception as e:
        logger.error(f"Failed to generate transliterated text: {e}")
        return text


def _extract_phase_result(response, fallback_text: str) -> PhaseResult:
    """Extract a PhaseResult from an OpenAI ChatCompletion response."""
    text = response.choices[0].message.content
    if text:
        text = text.strip()
    else:
        text = fallback_text
    usage = response.usage
    return PhaseResult(
        text=text,
        model=response.model,
        usage={
            "input_tokens": usage.prompt_tokens if usage else 0,
            "output_tokens": usage.completion_tokens if usage else 0,
            "total_tokens": usage.total_tokens if usage else 0,
        },
        raw_output=text,
    )


async def generate_scaffolded_text_with_metadata(
    arabic_text: str,
    learned_words: list[str] | None = None,
) -> PhaseResult:
    """Like generate_scaffolded_text but returns full PhaseResult with LLM metadata."""
    if learned_words:
        words_str = ", ".join(learned_words)
        learned_words_instruction = LEARNED_WORDS_WITH_WORDS.format(words=words_str)
    else:
        learned_words_instruction = LEARNED_WORDS_EMPTY

    prompt = _load_scaffolding_prompt().format(
        arabic_text=arabic_text,
        learned_words_instruction=learned_words_instruction,
    )

    try:
        client = _get_client()
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=500,
        )
        result = _extract_phase_result(response, arabic_text)
        result.prompt = prompt
        return result
    except Exception as e:
        logger.error(f"Failed to generate scaffolded text: {e}")
        return PhaseResult(text=arabic_text, model="error", usage={}, raw_output=str(e), prompt=prompt)


async def generate_transliterated_text_with_metadata(text: str) -> PhaseResult:
    """Like generate_transliterated_text but returns full PhaseResult with LLM metadata."""
    prompt = _load_transliteration_prompt().format(text=text)
    try:
        client = _get_client()
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=500,
        )
        result = _extract_phase_result(response, text)
        result.prompt = prompt
        return result
    except Exception as e:
        logger.error(f"Failed to generate transliterated text: {e}")
        return PhaseResult(text=text, model="error", usage={}, raw_output=str(e), prompt=prompt)
