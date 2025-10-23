"""Content generation routes and models."""

from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.content_service import generate_video


# Models
class VideoRequest(BaseModel):
    """Request model for video generation."""
    prompt: str = Field(..., description="Description of the video to generate")
    negative_prompt: Optional[str] = Field(None, description="What to avoid in the video")
    aspect_ratio: str = Field("9:16", description="Video aspect ratio (e.g., '9:16', '16:9')")
    resolution: str = Field("720p", description="Video resolution (e.g., '720p', '1080p')")
    duration_seconds: int = Field(8, description="Video duration in seconds (must be 4, 6, or 8)")
    output_name: str = Field("generated_video", description="Base name of the output file (without extension)")


class VideoResponse(BaseModel):
    """Response model for video generation."""
    success: bool = Field(..., description="Whether the video was generated successfully")
    video_path: str = Field(..., description="Path to the generated video file")
    message: str = Field(..., description="Status message")


# Router
router = APIRouter(prefix="/content", tags=["Content"])


@router.post("/video", response_model=VideoResponse)
async def create_video(request: VideoRequest):
    """
    Generate a video using Google's Veo model.

    This endpoint creates a video based on the provided text prompt using
    Google's Veo 3.1 fast-generate model.

    Args:
        request: VideoRequest containing prompt and generation parameters

    Returns:
        VideoResponse with the path to the generated video

    Raises:
        HTTPException: If video generation fails
    """
    try:
        video_path = generate_video(
            prompt=request.prompt,
            negative_prompt=request.negative_prompt,
            aspect_ratio=request.aspect_ratio,
            resolution=request.resolution,
            duration_seconds=request.duration_seconds,
            output_name=request.output_name
        )

        return VideoResponse(
            success=True,
            video_path=video_path,
            message="Video generated successfully"
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate video: {str(e)}"
        )
