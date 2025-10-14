"""
Soniox STT configuration for Arabic/English language identification.

This module configures the Soniox speech-to-text plugin with:
- Language identification enabled
- Support for Arabic (ar) and English (en)
"""

from livekit.plugins import soniox


def get_soniox_stt() -> soniox.STT:
    """
    Create and configure a Soniox STT instance with Arabic/English language identification.

    Returns:
        soniox.STT: Configured STT instance with language hints for ar and en
    """
    return soniox.STT(
        params=soniox.STTOptions(
            enable_language_identification=True,
            language_hints=["en", "ar"],
        ),
    )
