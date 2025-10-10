"""
Entry point for the Arabic Voice Agent
Starts the LiveKit worker
"""

import logging
from dotenv import load_dotenv

from livekit.agents import cli, WorkerOptions

from src.agent import ArabicVoiceAgent
from src.config import AGENT_LOG_LEVEL

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=getattr(logging, AGENT_LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)


if __name__ == "__main__":
    logger.info("Starting Arabic Voice Agent...")

    agent = ArabicVoiceAgent()

    # Run the LiveKit agent worker
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=agent.entrypoint,
        )
    )
