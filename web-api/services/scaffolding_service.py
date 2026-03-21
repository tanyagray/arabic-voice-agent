"""Scaffolding service for generating learner-facing display text from canonical Arabic.

Two modes:
- Scaffolded text: Translates Arabic into English, keeping familiar words as Arabizi.
- Transliterated text: Pure Arabizi romanization of Arabic (no translation).
"""

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
You are a translation assistant for Arabic language learners. Translate the following \
Arabic text into natural English.
{familiar_words_instruction}
Additionally, pick ONE new Arabic word from the text that is NOT in the familiar list \
and keep it as Arabizi (romanized Arabic) instead of translating it. Choose a concrete, \
useful word (nouns and verbs are best). This introduces new vocabulary gradually.

Rules:
- Translate the Arabic into fluent, natural English.
- Keep familiar words (and their inflected forms) as Arabizi in the sentence.
- Keep exactly one additional new word as Arabizi to introduce it to the learner.
- Use common Arabizi conventions (e.g., 3 for ع, 7 for ح, 2 for ء/ق) for all Arabizi words.
- The output must contain ZERO Arabic script — everything must be in English or Arabizi.
- Do NOT add explanations, notes, or extra text.
- Return ONLY the translated text, nothing else.

Arabic text:
{arabic_text}"""

FAMILIAR_WORDS_INSTRUCTION = """
The learner already knows the following Arabic words (given as base/stem forms). \
Keep these words — and any inflected variants (plurals, conjugations, dual forms, etc.) — \
in the translated sentence as Arabizi (romanized Arabic) instead of translating them to English.

Use common Arabizi conventions (e.g., 3 for ع, 7 for ح, 2 for ء/ق).

For example, if the learner knows "sayaara" (سيارة), then "السيارات" should appear as \
"sayaaraat" rather than "cars".

Familiar words:
{words}
"""


async def generate_scaffolded_text(
    arabic_text: str,
    familiar_words: list[str] | None = None,
) -> str:
    """
    Generate scaffolded display text by translating Arabic into English.

    Familiar words (and their inflected forms) are kept inline as Arabizi
    instead of being translated. Additionally, one new word is kept as
    Arabizi to gradually introduce new vocabulary.

    Args:
        arabic_text: The full Arabic text with harakaat to translate.
        familiar_words: Optional list of Arabic stem/base words the learner knows.
                       These (and inflected variants) will appear as Arabizi.
                       Empty/None means only one new word appears as Arabizi.

    Returns:
        English text with familiar + one new word as inline Arabizi.
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


TRANSLITERATION_PROMPT = """\
You are an Arabizi transliteration tool. Transliterate the following text so that \
all Arabic script is written using the English alphabet (Arabizi). Do NOT translate — \
keep the same Arabic words, just write them with Latin letters.

Rules:
- Transliterate every Arabic word into Arabizi (romanized Arabic).
- Use common Arabizi conventions: 3 for ع, 7 for ح, 2 for ء or ق, 5 for خ, 8 for غ, 6 for ط, 9 for ص.
- Preserve any English words already in the text exactly as they are.
- Preserve word boundaries exactly — the number of whitespace-separated words in \
the output MUST equal the number of whitespace-separated words in the input.
- The output must contain ZERO Arabic script.
- Do NOT translate any Arabic words into English — only romanize them.
- Do NOT add explanations, notes, or extra text.
- Return ONLY the transliterated text, nothing else.

Text:
{text}"""


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
            messages=[{"role": "user", "content": TRANSLITERATION_PROMPT.format(text=text)}],
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
