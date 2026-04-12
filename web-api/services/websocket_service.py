"""Backward-compat shim — canonical location is channels.rest.websocket.connection_manager."""

from channels.rest.websocket.connection_manager import (  # noqa: F401
    Message,
    register_websocket,
    unregister_websocket,
    get_websocket,
    send_message,
    send_audio_message,
)
