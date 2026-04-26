"""
Smoke-test helper: synthesize speech and write it to web-app/public/dev-fake-mic.mp3
so the dev-only fake-mic shim in the web-app can pipe it into the browser as if
it came from the user's microphone.

Run from the web-api directory:

    uv run python scripts/fake_tts.py "Hello, I want to learn Arabic"
    uv run python scripts/fake_tts.py "Hola, quiero aprender" --language es-MX

Then in the browser preview (with VITE_FAKE_MIC=1):

    await window.__pushMic()
"""

import argparse
import asyncio
import sys
from pathlib import Path

from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
WEB_API_DIR = REPO_ROOT / "web-api"
OUTPUT_PATH = REPO_ROOT / "web-app" / "public" / "dev-fake-mic.mp3"

sys.path.insert(0, str(WEB_API_DIR))
load_dotenv(dotenv_path=WEB_API_DIR / ".env", override=True)

from services.tts_service import TTSService  # noqa: E402 — must import after dotenv


async def synthesize(text: str, language: str) -> int:
    tts = TTSService()
    audio = await tts.generate_audio(text, language)
    if audio is None:
        print("[fake-tts] TTS generation failed", file=sys.stderr)
        return 1

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_bytes(audio)
    print(f"[fake-tts] Wrote {len(audio)} bytes to {OUTPUT_PATH.relative_to(REPO_ROOT)}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("text", help="Text to synthesize")
    parser.add_argument(
        "--language",
        default="ar-AR",
        help="Voice language code (default: ar-AR). See TTSService.voice_configs.",
    )
    args = parser.parse_args()
    return asyncio.run(synthesize(args.text, args.language))


if __name__ == "__main__":
    raise SystemExit(main())
