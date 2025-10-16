from livekit.agents import ChatContext

def get_initial_chat_context() -> ChatContext:

    # Chat Context Setup
    initial_chat_ctx = ChatContext()
    initial_chat_ctx.add_message(role="assistant", content=f"The user's name is Tanya.")

    return initial_chat_ctx