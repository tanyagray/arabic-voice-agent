"""Admin authentication dependency for FastAPI routes."""

from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from services.supabase_client import get_supabase_admin_client

security = HTTPBearer()


def get_admin_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> str:
    """
    Verify the JWT token and confirm the user has admin privileges.

    Raises HTTP 401 if token is missing, HTTP 403 if user is not an admin.

    Returns:
        str: The user's ID
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Missing authentication credentials")

    token = credentials.credentials
    admin_client = get_supabase_admin_client()

    # Verify the JWT and get the user
    try:
        user_response = admin_client.auth.get_user(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication token")

    if not user_response or not user_response.user:
        raise HTTPException(status_code=401, detail="Invalid authentication token")

    user_id = user_response.user.id

    # Check admin flag in profiles table
    try:
        result = admin_client.table("profiles").select("is_admin").eq("id", user_id).single().execute()
    except Exception:
        raise HTTPException(status_code=403, detail="Access denied — not an admin")

    if not result.data or not result.data.get("is_admin"):
        raise HTTPException(status_code=403, detail="Access denied — not an admin")

    return user_id
