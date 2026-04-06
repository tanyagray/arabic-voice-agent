"""Service for creating and managing wimmelbilder images."""

import asyncio
import io
import json
import os
import traceback

from PIL import Image
from google import genai
from google.genai import types

from services.supabase_client import get_supabase_admin_client


def _get_genai_client() -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")
    return genai.Client(api_key=api_key)


def _to_png(image_bytes: bytes) -> tuple[bytes, int, int]:
    """Convert any image format to PNG and return (png_bytes, width, height)."""
    img = Image.open(io.BytesIO(image_bytes))
    width, height = img.size
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue(), width, height


def _update_status(wimmelbilder_id: str, status: str, **extra_fields):
    """Update the status (and optional extra fields) of a wimmelbilder row."""
    supabase = get_supabase_admin_client()
    data = {"status": status, **extra_fields}
    supabase.table("wimmelbilder").update(data).eq("id", wimmelbilder_id).execute()


def _generate_image(client: genai.Client, description: str) -> tuple[bytes, str]:
    """Generate a wimmelbild-style image using Gemini. Returns (image_bytes, mime_type)."""
    prompt = (
        f"Create a detailed wimmelbild-style illustration of: {description}. "
        "The image should be a richly detailed, busy scene with many interesting "
        "objects, characters, and activities to discover. Use a colorful, "
        "hand-drawn illustration style typical of wimmelbilder. "
        "The image should be in 16:9 landscape aspect ratio."
    )

    response = client.models.generate_content(
        model="gemini-3.1-flash-image-preview",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE"],
        ),
    )

    # Extract image bytes from response
    for part in response.candidates[0].content.parts:
        if part.inline_data and part.inline_data.mime_type.startswith("image/"):
            return part.inline_data.data, part.inline_data.mime_type

    raise ValueError("No image generated in Gemini response")


def _detect_objects(
    client: genai.Client, image_bytes: bytes, mime_type: str, width: int, height: int,
) -> list[dict]:
    """Detect objects of interest in the image using Gemini vision."""
    image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)

    prompt = (
        "Analyze this wimmelbild illustration and identify all distinct objects, "
        "characters, animals, and points of interest in the scene. "
        "For each object, provide its bounding box and a description.\n\n"
        "Return ONLY a valid JSON array with no other text, in this exact format:\n"
        '[\n'
        '  {"box_2d": [y1, x1, y2, x2], "label": "object name", '
        '"meta": "detailed visual description including color, pose, position, etc."}\n'
        ']\n\n'
        "Where coordinates are normalized to 0-1000 range. "
        "Be thorough — find at least 15-30 objects. "
        "Do NOT include a bounding box for the overall scene or full image."
    )

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[image_part, prompt],
    )

    # Parse JSON from the response text
    text = response.text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        text = text.split("\n", 1)[1]  # remove opening fence line
        text = text.rsplit("```", 1)[0]  # remove closing fence
        text = text.strip()

    objects = json.loads(text)

    result = []
    for obj in objects:
        # Skip scene-level entries
        if obj.get("label", "").lower() == "scene":
            continue

        # Normalize key: Gemini sometimes returns "bbox" or "bbox_2d" instead of "box_2d"
        if "box_2d" not in obj:
            for alt_key in ("bbox", "bbox_2d"):
                if alt_key in obj:
                    obj["box_2d"] = obj.pop(alt_key)
                    break

        if "box_2d" not in obj:
            continue

        # Ensure label exists — derive from meta if missing
        if "label" not in obj and "meta" in obj:
            # Take first few words of meta as a short label
            words = obj["meta"].split()
            obj["label"] = " ".join(words[:4]).rstrip(",.")

        # Gemini returns [y1, x1, y2, x2] in 0-1000 normalized coords.
        # Convert to [x1, y1, x2, y2] in actual pixel coords.
        y1_n, x1_n, y2_n, x2_n = obj["box_2d"]
        obj["box_2d"] = [
            round(x1_n / 1000 * width),
            round(y1_n / 1000 * height),
            round(x2_n / 1000 * width),
            round(y2_n / 1000 * height),
        ]
        result.append(obj)

    # Sort largest-area first so smaller hotspots render on top (later in DOM)
    def _area(obj):
        x1, y1, x2, y2 = obj["box_2d"]
        return (x2 - x1) * (y2 - y1)

    result.sort(key=_area, reverse=True)

    return result


async def create_wimmelbilder(description: str, user_id: str) -> str:
    """Create a new wimmelbilder record and kick off async generation."""
    supabase = get_supabase_admin_client()

    result = supabase.table("wimmelbilder").insert({
        "description": description,
        "status": "pending",
        "created_by": user_id,
    }).execute()

    wimmelbilder_id = result.data[0]["id"]

    # Fire and forget — background task handles the rest
    asyncio.create_task(_process_wimmelbilder(wimmelbilder_id, description))

    return wimmelbilder_id


async def _process_wimmelbilder(wimmelbilder_id: str, description: str) -> None:
    """Background task: generate image, detect objects, upload, and update DB."""
    try:
        client = _get_genai_client()

        # Step 1: Generate image
        await asyncio.to_thread(_update_status, wimmelbilder_id, "generating_image")
        raw_bytes, mime_type = await asyncio.to_thread(_generate_image, client, description)

        # Convert to PNG and get dimensions
        png_bytes, width, height = await asyncio.to_thread(_to_png, raw_bytes)

        # Step 2: Detect objects (use original bytes + mime for best quality)
        await asyncio.to_thread(_update_status, wimmelbilder_id, "detecting_objects")
        objects = await asyncio.to_thread(
            _detect_objects, client, raw_bytes, mime_type, width, height
        )

        # Step 3: Upload PNG to Supabase Storage
        image_path = f"{wimmelbilder_id}.png"
        supabase = get_supabase_admin_client()
        await asyncio.to_thread(
            lambda: supabase.storage.from_("wimmelbilder").upload(
                path=image_path,
                file=png_bytes,
                file_options={"content-type": "image/png"},
            )
        )

        # Step 4: Update DB with results
        await asyncio.to_thread(
            _update_status,
            wimmelbilder_id,
            "complete",
            image_path=image_path,
            image_width=width,
            image_height=height,
            objects=objects,
        )

    except Exception as e:
        traceback.print_exc()
        await asyncio.to_thread(
            _update_status, wimmelbilder_id, "failed", error=str(e)
        )


async def get_wimmelbilder(wimmelbilder_id: str) -> dict | None:
    """Fetch a wimmelbilder record by ID."""
    supabase = get_supabase_admin_client()
    result = (
        supabase.table("wimmelbilder")
        .select("*")
        .eq("id", wimmelbilder_id)
        .maybe_single()
        .execute()
    )
    return result.data
