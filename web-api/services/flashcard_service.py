"""Service for creating and managing flashcard sets with AI-generated images and audio."""

import asyncio
import io
import traceback

from PIL import Image
from google import genai
from google.genai import types

from services.supabase_client import get_supabase_admin_client
from services.tts_service import get_tts_service
from services.wimmelbilder_service import _get_genai_client


def _update_set_status(set_id: str, status: str, **extra_fields):
    """Update the status of a flashcard_sets row."""
    supabase = get_supabase_admin_client()
    data = {"status": status, **extra_fields}
    supabase.table("flashcard_sets").update(data).eq("id", set_id).execute()


def _update_card_status(card_id: str, status: str, **extra_fields):
    """Update the status of a flashcards row."""
    supabase = get_supabase_admin_client()
    data = {"status": status, **extra_fields}
    supabase.table("flashcards").update(data).eq("id", card_id).execute()


def _generate_card_image(client: genai.Client, english: str) -> tuple[bytes, str]:
    """Generate a 500x500 flashcard image using Gemini. Returns (image_bytes, mime_type)."""
    prompt = (
        f"Create a simple, clear, colorful illustration of: {english}. "
        "The image should depict a single object or concept on a clean, "
        "minimal background. Use a friendly, modern illustration style "
        "suitable for a language learning flashcard. "
        "The image must be exactly 500x500 pixels, square format."
    )

    response = client.models.generate_content(
        model="gemini-3.1-flash-image-preview",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE"],
        ),
    )

    for part in response.candidates[0].content.parts:
        if part.inline_data and part.inline_data.mime_type.startswith("image/"):
            return part.inline_data.data, part.inline_data.mime_type

    raise ValueError("No image generated in Gemini response")


def _to_png_500(image_bytes: bytes) -> bytes:
    """Convert image to 500x500 PNG."""
    img = Image.open(io.BytesIO(image_bytes))
    img = img.resize((500, 500), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


async def _process_card(
    client: genai.Client,
    card: dict,
    language: str,
    semaphore: asyncio.Semaphore,
) -> None:
    """Process a single card: generate image and audio, upload, update DB."""
    card_id = card["id"]

    async with semaphore:
        try:
            # Generate image
            await asyncio.to_thread(_update_card_status, card_id, "generating_image")
            raw_bytes, _mime = await asyncio.to_thread(
                _generate_card_image, client, card["english"]
            )
            png_bytes = await asyncio.to_thread(_to_png_500, raw_bytes)

            # Upload image to storage
            image_path = f"{card_id}.png"
            supabase = get_supabase_admin_client()
            await asyncio.to_thread(
                lambda: supabase.storage.from_("flashcards").upload(
                    path=image_path,
                    file=png_bytes,
                    file_options={"content-type": "image/png"},
                )
            )

            # Generate audio
            await asyncio.to_thread(_update_card_status, card_id, "generating_audio")
            tts_service = get_tts_service()
            audio_bytes = await tts_service.generate_audio(
                card["arabic_text"], language
            )

            audio_path = None
            if audio_bytes:
                audio_path = f"{card_id}.mp3"
                await asyncio.to_thread(
                    lambda path=audio_path, data=audio_bytes: supabase.storage.from_(
                        "flashcards"
                    ).upload(
                        path=path,
                        file=data,
                        file_options={"content-type": "audio/mpeg"},
                    )
                )

            # Mark complete
            await asyncio.to_thread(
                _update_card_status,
                card_id,
                "complete",
                image_path=image_path,
                audio_path=audio_path,
            )

        except Exception as e:
            traceback.print_exc()
            await asyncio.to_thread(
                _update_card_status, card_id, "failed", error=str(e)
            )


async def _process_flashcard_set(set_id: str, cards: list[dict], language: str) -> None:
    """Background task: generate images and audio for all cards in a set."""
    try:
        client = _get_genai_client()
        await asyncio.to_thread(_update_set_status, set_id, "generating")

        semaphore = asyncio.Semaphore(3)
        await asyncio.gather(
            *[_process_card(client, card, language, semaphore) for card in cards]
        )

        # Check if any cards failed
        supabase = get_supabase_admin_client()
        result = (
            supabase.table("flashcards")
            .select("id, status")
            .eq("set_id", set_id)
            .eq("status", "failed")
            .execute()
        )

        if result.data:
            await asyncio.to_thread(
                _update_set_status,
                set_id,
                "failed",
                error=f"{len(result.data)} card(s) failed to generate",
            )
        else:
            await asyncio.to_thread(_update_set_status, set_id, "complete")

    except Exception as e:
        traceback.print_exc()
        await asyncio.to_thread(_update_set_status, set_id, "failed", error=str(e))


async def create_flashcard_set(
    title: str,
    language: str,
    cards: list[dict],
    user_id: str,
) -> str:
    """Create a new flashcard set and kick off async image/audio generation.

    Args:
        title: Set title (e.g. "Days of the Week")
        language: Language code (e.g. "ar-AR")
        cards: List of dicts with keys: arabic_text, transliteration, english
        user_id: The user who created this set

    Returns:
        The flashcard set ID
    """
    supabase = get_supabase_admin_client()

    # Create the set
    set_result = supabase.table("flashcard_sets").insert({
        "title": title,
        "language": language,
        "status": "pending",
        "created_by": user_id,
    }).execute()

    set_id = set_result.data[0]["id"]

    # Create individual card rows
    card_rows = []
    for i, card in enumerate(cards):
        card_rows.append({
            "set_id": set_id,
            "ordinal": i,
            "arabic_text": card["arabic_text"],
            "transliteration": card["transliteration"],
            "english": card["english"],
            "status": "pending",
        })

    insert_result = supabase.table("flashcards").insert(card_rows).execute()

    # Build card list with IDs for the background task
    cards_with_ids = []
    for row in insert_result.data:
        cards_with_ids.append({
            "id": row["id"],
            "arabic_text": row["arabic_text"],
            "transliteration": row["transliteration"],
            "english": row["english"],
        })

    # Fire and forget
    asyncio.create_task(_process_flashcard_set(set_id, cards_with_ids, language))

    return set_id


async def get_flashcard_set(set_id: str) -> dict | None:
    """Fetch a flashcard set with all its cards."""
    supabase = get_supabase_admin_client()

    set_result = (
        supabase.table("flashcard_sets")
        .select("*")
        .eq("id", set_id)
        .maybe_single()
        .execute()
    )

    if not set_result.data:
        return None

    cards_result = (
        supabase.table("flashcards")
        .select("*")
        .eq("set_id", set_id)
        .order("ordinal")
        .execute()
    )

    data = set_result.data
    data["cards"] = cards_result.data or []

    # Generate signed URLs for completed cards
    for card in data["cards"]:
        if card.get("image_path"):
            signed = supabase.storage.from_("flashcards").create_signed_url(
                card["image_path"], 3600
            )
            card["image_url"] = signed.get("signedURL") or signed.get("signedUrl")
        else:
            card["image_url"] = None

        if card.get("audio_path"):
            signed = supabase.storage.from_("flashcards").create_signed_url(
                card["audio_path"], 3600
            )
            card["audio_url"] = signed.get("signedURL") or signed.get("signedUrl")
        else:
            card["audio_url"] = None

    return data
