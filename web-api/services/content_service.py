"""Content service for managing video generation."""

import os
import time
from typing import Optional
from google import genai
from google.genai import types


def generate_video(
    prompt: str,
    negative_prompt: Optional[str] = None,
    aspect_ratio: str = "9:16",
    resolution: str = "720p",
    duration_seconds: int = 8,
    output_name: str = "generated_video"
) -> str:
    """
    Generate a video using Google's Veo 3.1 Fast model.

    Args:
        prompt: Description of the video to generate
        negative_prompt: Optional negative prompt for what to avoid
        aspect_ratio: Video aspect ratio (e.g., "9:16", "16:9")
        resolution: Video resolution (e.g., "720p", "1080p")
        duration_seconds: Video duration in seconds (must be 4, 6, or 8)
        output_name: Base name of the output file (without extension)

    Returns:
        str: Path to the generated video file

    Raises:
        Exception: If video generation fails or times out
    """
    # Ensure the filename always ends with .mp4
    output_filename = f"{output_name}.mp4"

    # Get API key from environment
    api_key = os.getenv("GOOGLE_GENAI_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_GENAI_API_KEY environment variable is not set")

    # Initialize the Google GenAI client
    client = genai.Client(api_key=api_key)

    # Validate duration_seconds
    if duration_seconds not in [4, 6, 8]:
        raise ValueError("duration_seconds must be 4, 6, or 8")

    # Configure video generation
    config = types.GenerateVideosConfig(
        aspect_ratio=aspect_ratio,
        resolution=resolution,
        duration_seconds=duration_seconds,
    )

    if negative_prompt:
        config.negative_prompt = negative_prompt

    # Start video generation using Veo 3.1 Fast model
    operation = client.models.generate_videos(
        model="veo-3.1-fast-generate-preview",
        prompt=prompt,
        config=config,
    )

    # Wait for the video to be generated
    # Poll every 20 seconds until complete
    while not operation.done:
        time.sleep(20)
        operation = client.operations.get(operation)
        print(f"Video generation status: {operation}")

    # Get the generated video
    generated_video = operation.response.generated_videos[0]

    # Download the video file content
    video_data = client.files.download(file=generated_video.video)

    # Write the video to disk
    with open(output_filename, "wb") as f:
        f.write(video_data)

    return output_filename
