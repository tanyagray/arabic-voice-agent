"""Authentication dependencies for FastAPI routes."""

from typing import Optional
from fastapi import HTTPException, Security, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()


def get_current_user_token(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> str:
    """
    Extract and return the JWT access token from the Authorization header.

    This dependency validates that a Bearer token is present and returns it.
    The actual JWT validation is handled by Supabase when the token is used.

    Args:
        credentials: HTTP Bearer credentials from the Authorization header

    Returns:
        str: The JWT access token

    Raises:
        HTTPException: 401 if credentials are missing or invalid
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=401,
            detail="Missing authentication credentials"
        )

    return credentials.credentials


def get_websocket_token(
    token: Optional[str] = Query(None, description="JWT access token for WebSocket authentication")
) -> str:
    """
    Extract and return the JWT access token from query parameters for WebSocket connections.

    WebSocket connections cannot use HTTPBearer authentication, so the token
    must be provided as a query parameter.

    Args:
        token: JWT access token from query parameter

    Returns:
        str: The JWT access token

    Raises:
        HTTPException: 401 if token is missing
    """
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Missing authentication token. Provide token as query parameter."
        )

    return token
