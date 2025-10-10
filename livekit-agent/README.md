# Arabic Voice Agent

LiveKit-based voice agent for Arabic language tutoring with support for multiple dialects.

## Features

- **Multi-dialect support**: MSA, Iraqi, Egyptian, or mixed
- **Real-time voice**: Deepgram STT + ElevenLabs TTS
- **Smart LLM**: OpenAI GPT-4o with Arabic expertise
- **Database integration**: Saves conversations to Supabase
- **Function calling**: Can query user data (optional)
- **Fresh context**: Each session starts clean

## Setup

### Prerequisites

- Python 3.11+
- LiveKit Cloud account
- API keys for: OpenAI, ElevenLabs, Deepgram, Supabase

### Installation

1. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # or `venv\Scripts\activate` on Windows
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment**:
   Copy `.env.example` to `.env` and fill in your API keys.

### Running Locally

```bash
python src/main.py start
```

The agent will connect to LiveKit and wait for room assignments.

## Configuration

### Dialect Selection

Set the `ARABIC_DIALECT` environment variable:

- `msa` - Modern Standard Arabic
- `iraqi` - Iraqi dialect
- `egyptian` - Egyptian dialect
- `mixed` - All dialects + English (default)

### Editing System Prompt

Edit the system prompt in `src/config.py:23-42` to customize the agent's personality and teaching approach.

### ElevenLabs Voice

Set your preferred voice ID in `.env`:
```bash
ELEVENLABS_VOICE_ID=your-voice-id-here
```

Browse voices at: https://elevenlabs.io/voice-library

## Deployment

### Render (Background Worker)

1. Create a new **Background Worker** on Render
2. Connect your GitHub repository
3. Set build command: `pip install -r apps/agent/requirements.txt`
4. Set start command: `cd apps/agent && python src/main.py start`
5. Add all environment variables from `.env`
6. Deploy

### LiveKit Webhook

Configure LiveKit to trigger the agent on room creation:
1. Go to LiveKit Cloud dashboard
2. Add webhook URL: `https://your-render-app.onrender.com/webhook`
3. Enable "Room Created" event

## Database Schema

The agent saves data to Supabase:

- **conversations**: Metadata about each voice session
- **messages**: Individual messages (user and assistant)
- **user_analytics**: Usage events

## Function Calling

The agent can call functions to:
- Get user preferences
- Retrieve conversation history summary

To enable, uncomment line in `src/agent.py:125`:
```python
assistant.register_functions(self.user_tools.get_function_definitions())
```

## Logging

Set log level via `AGENT_LOG_LEVEL` environment variable:
- `DEBUG` - Verbose logging
- `INFO` - Standard logging (default)
- `WARNING` - Warnings only
- `ERROR` - Errors only

## Troubleshooting

**Agent not starting**:
- Check all API keys are set
- Verify Supabase connection
- Check LiveKit URL format

**Poor voice quality**:
- Adjust ElevenLabs stability/similarity in `src/config.py`
- Try different voice IDs

**Wrong dialect**:
- Verify `ARABIC_DIALECT` environment variable
- Check system prompt in `src/config.py`

## License

MIT
