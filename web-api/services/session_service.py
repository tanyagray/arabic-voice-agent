"""Backward-compat shim — canonical location is harness.session_manager."""

from harness.session_manager import (  # noqa: F401
    AuthenticationError,
    create_session,
    get_session,
    upgrade_session_to_admin,
    delete_session,
    get_all_sessions,
    list_user_sessions,
)
