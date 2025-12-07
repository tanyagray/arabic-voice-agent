"""Supabase client initialization."""

import os
from supabase import create_client, Client, ClientOptions


def get_supabase_admin_client() -> Client:
    url = os.getenv("SUPABASE_URL")
    secret_key = os.getenv("SUPABASE_SECRET_KEY")

    if not url:
        raise ValueError("SUPABASE_URL environment variable is not set")

    if not secret_key:
        raise ValueError("SUPABASE_SECRET_KEY environment variable is not set")

    client = create_client(
        url,
        secret_key,
    )

    return client


# Function to get a Supabase client for a specific user with access token
def get_supabase_user_client(access_token: str) -> Client:
    url = os.getenv("SUPABASE_URL")
    publishable_key = os.getenv("SUPABASE_PUBLISHABLE_KEY")

    if not url:
        raise ValueError("SUPABASE_URL environment variable is not set")
    
    if not publishable_key:
        raise ValueError("SUPABASE_PUBLISHABLE_KEY environment variable is not set")
    
    client = create_client(
        url,
        publishable_key,
        options=ClientOptions(
            headers={
                "Authorization": f"Bearer {access_token}"
            }
        )
    )

    return client
