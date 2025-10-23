"""User service for managing user business logic."""

from typing import Optional
from dataclasses import dataclass


@dataclass
class UserInfo:
    """User information model."""
    id: str
    name: str


def get_user_info(user_id: str) -> Optional[UserInfo]:
    """
    Get user information by user ID.

    Args:
        user_id: The user ID to retrieve information for

    Returns:
        UserInfo: The user information if found, None otherwise
    """
    # TODO: Implement actual user lookup logic
    # For now, returning a placeholder
    if user_id:
        return UserInfo(id=user_id, name="User")
    return None
