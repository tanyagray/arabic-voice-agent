from livekit.plugins import openai


def get_openai_gpt_4o_mini() -> openai.LLM:
    """
    Returns an OpenAI LLM instance configured with GPT-4o-mini model.
    This is a factory function to ensure the LLM is created at runtime
    when environment variables are available, not at module import time.
    """
    return openai.LLM(model="gpt-4o-mini")
