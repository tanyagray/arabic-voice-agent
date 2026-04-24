"""Authentication dependencies for FastAPI routes."""

from typing import Optional
from fastapi import Depends, HTTPException, Security, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from services.supabase_client import get_supabase_user_client

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


def get_current_user(access_token: str = Depends(get_current_user_token)):
    """Resolve the authenticated Supabase user from the Bearer token.

    Returns the Supabase `User` object (with `.id`, `.email`, `.is_anonymous`).
    Raises 401 if the token is invalid.
    """
    try:
        client = get_supabase_user_client(access_token)
        resp = client.auth.get_user(access_token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid or expired token: {e}")
    if not resp or not resp.user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return resp.user


def resolve_user_from_token(access_token: str):
    """Same resolution logic as `get_current_user`, but usable outside FastAPI
    dependency injection (e.g. in WebSocket handlers)."""
    try:
        client = get_supabase_user_client(access_token)
        resp = client.auth.get_user(access_token)
    except Exception:
        return None
    return resp.user if resp else None
