"""Scaffolding service for generating learner-facing display text from canonical Arabic.

Two modes:
- Scaffolded text: Translates Arabic into English, keeping learned words as Arabizi.
- Transliterated text: Pure Arabizi romanization of Arabic (no translation).
"""

import json
import os
import re
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

class ScaffoldedResult:
    """Result of scaffolding: the display text plus highlighted Arabizi words."""

    def __init__(self, text: str, highlights: list[dict] | None = None):
        self.text = text
        self.highlights = highlights or []

    def to_dict(self) -> dict:
        return {"text": self.text, "highlights": self.highlights}

    def build_tts_text(self) -> str:
        """Build TTS-friendly text by replacing Arabizi words with Arabic script.

        Uses highlight offsets (sorted by position) to substitute in reverse
        order so earlier offsets stay valid.
        """
        result = self.text
        for h in reversed(self.highlights):
            canonical = h.get("canonical")
            if canonical and "start" in h and "end" in h:
                result = result[:h["start"]] + canonical + result[h["end"]:]
        return result


def _compute_highlight_offsets(text: str, highlights: list[dict]) -> list[dict]:
    """Find each highlight word in the text and fill in start/end offsets.

    Uses word-boundary matching (case-insensitive) so that e.g. "an" does
    not match inside "marhaban".  If a word appears multiple times, each
    occurrence gets its own entry.  Highlights whose word cannot be found
    at a word boundary are dropped.
    """
    result: list[dict] = []
    for h in highlights:
        word = h.get("word", "")
        if not word:
            continue
        # Match the word at word boundaries, case-insensitive
        pattern = re.compile(r'\b' + re.escape(word) + r'\b', re.IGNORECASE)
        for m in pattern.finditer(text):
            entry = {
                "word": word,
                "meaning": h.get("meaning", ""),
                "start": m.start(),
                "end": m.end(),
            }
            if h.get("canonical"):
                entry["canonical"] = h["canonical"]
            result.append(entry)
    # Sort by position in text
    result.sort(key=lambda h: h["start"])
    return result


def _parse_scaffolding_json(raw: str, fallback_text: str) -> ScaffoldedResult:
    """Parse the JSON response from the scaffolding LLM call."""
    try:
        data = json.loads(raw)
        text = data.get("text", fallback_text)
        highlights = data.get("highlights", [])
        highlights = _compute_highlight_offsets(text, highlights)
        return ScaffoldedResult(text=text, highlights=highlights)
    except (json.JSONDecodeError, TypeError):
        logger.warning("Failed to parse scaffolding JSON, falling back to raw text")
        return ScaffoldedResult(text=raw.strip() if raw else fallback_text)


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

    def __init__(self, text: str, model: str, usage: dict, raw_output: str, prompt: str = "",
                 highlights: list[dict] | None = None):
        self.text = text
        self.model = model
        self.usage = usage
        self.raw_output = raw_output
        self.prompt = prompt
        self.highlights = highlights or []

    def to_dict(self) -> dict:
        result = {
            "text": self.text,
            "model": self.model,
            "usage": self.usage,
            "raw_output": self.raw_output,
            "prompt": self.prompt,
        }
        if self.highlights:
            result["highlights"] = self.highlights
        return result


async def generate_scaffolded_text(
    arabic_text: str,
    learned_words: list[str] | None = None,
) -> ScaffoldedResult:
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
        ScaffoldedResult with text and highlights array.
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
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content
        if raw:
            return _parse_scaffolding_json(raw, arabic_text)

        logger.warning("Empty response from scaffolding LLM call, falling back to original text")
        return ScaffoldedResult(text=arabic_text)

    except Exception as e:
        logger.error(f"Failed to generate scaffolded text: {e}")
        return ScaffoldedResult(text=arabic_text)




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


def _extract_phase_result(response, fallback_text: str, parse_json: bool = False) -> PhaseResult:
    """Extract a PhaseResult from an OpenAI ChatCompletion response."""
    raw = response.choices[0].message.content
    highlights: list[dict] = []

    if raw and parse_json:
        parsed = _parse_scaffolding_json(raw, fallback_text)
        text = parsed.text
        highlights = parsed.highlights
    elif raw:
        text = raw.strip()
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
        raw_output=raw or text,
        highlights=highlights,
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
            response_format={"type": "json_object"},
        )
        result = _extract_phase_result(response, arabic_text, parse_json=True)
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
