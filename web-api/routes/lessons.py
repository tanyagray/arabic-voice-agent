"""Lesson management routes."""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from dependencies.auth import get_current_user
from services import lesson_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/lessons", tags=["Lessons"])


class CreateLessonRequest(BaseModel):
    title: str
    objective: str


class LessonResponse(BaseModel):
    id: str
    title: str
    objective: str
    status: str
    created_at: str


@router.post("", response_model=LessonResponse)
async def create_lesson(
    request: CreateLessonRequest,
    user=Depends(get_current_user),
):
    """Create a lesson row from a suggestion (e.g. onboarding tile pick)."""
    try:
        row = lesson_service.insert_suggestion_lesson(
            user_id=user.id,
            title=request.title,
            objective=request.objective,
        )
    except Exception as e:
        logger.error(f"Failed to create lesson: {e}")
        raise HTTPException(status_code=500, detail="Failed to create lesson")

    return LessonResponse(
        id=row["id"],
        title=row["title"],
        objective=row["objective"],
        status=row["status"],
        created_at=row["created_at"],
    )


@router.get("/{lesson_id}", response_model=LessonResponse)
async def get_lesson(
    lesson_id: str,
    user=Depends(get_current_user),
):
    """Fetch a lesson by ID (must belong to the authenticated user)."""
    lesson = lesson_service.get_lesson(lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    if lesson["created_by"] != user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return LessonResponse(
        id=lesson["id"],
        title=lesson["title"],
        objective=lesson["objective"],
        status=lesson["status"],
        created_at=lesson["created_at"],
    )
