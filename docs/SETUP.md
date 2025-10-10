# Setup Guide

Complete guide to setting up the Arabic Voice Agent development environment.

## Prerequisites

### Required Software

- **Python 3.11+** - for the LiveKit agent
- **Flutter 3.24+** - for mobile apps
- **Node.js 18+** - for Supabase CLI
- **Git** - version control

### Required Accounts

1. **Supabase** - https://supabase.com
2. **LiveKit Cloud** - https://livekit.io
3. **OpenAI** - https://platform.openai.com
4. **ElevenLabs** - https://elevenlabs.io
5. **Deepgram** - https://deepgram.com
6. **Google Cloud Console** - for OAuth
7. **Render** - https://render.com (for deployment)
8. **GitHub** - for code hosting

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/arabic-voice-agent.git
cd arabic-voice-agent
```

---

## Step 2: Supabase Setup

### Create Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Enter project details
4. Wait for project to be created

### Disable Edge Functions

1. Go to Project Settings → Edge Functions
2. Disable Edge Functions (as per requirements)

### Run Migrations

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

### Configure Authentication

1. Go to Authentication → Providers
2. Enable Google provider
3. Add your Google OAuth credentials:
   - Client ID
   - Client Secret
4. Add redirect URLs:
   - `com.arabicvoice.arabicvoiceagent://login-callback`

### Get API Keys

1. Go to Project Settings → API
2. Copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key (keep safe!)

---

## Step 3: LiveKit Cloud Setup

### Create Project

1. Go to https://cloud.livekit.io
2. Create new project
3. Note your project URL (e.g., `wss://your-project.livekit.cloud`)

### Generate API Keys

1. Go to Settings → Keys
2. Create new API key
3. Save:
   - API Key
   - API Secret

### Configure Webhooks (Optional for production)

1. Go to Settings → Webhooks
2. Add webhook URL: `https://your-render-app.onrender.com/webhook`
3. Enable "Room Created" event

---

## Step 4: Get API Keys

### OpenAI

1. Go to https://platform.openai.com/api-keys
2. Create new secret key
3. Save the key (starts with `sk-`)

### ElevenLabs

1. Go to https://elevenlabs.io/speech-synthesis
2. Click Profile → API Keys
3. Create and save API key

**Choose a Voice:**
1. Browse voices at https://elevenlabs.io/voice-library
2. Copy the Voice ID of your chosen voice
3. Use multilingual v2 compatible voices

### Deepgram

1. Go to https://console.deepgram.com
2. Create new API key
3. Save the key

---

## Step 5: Google OAuth Setup

### Create OAuth Credentials

1. Go to https://console.cloud.google.com
2. Create new project (or select existing)
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID

### Configure OAuth Consent Screen

1. Set app name, support email
2. Add scopes: `email`, `profile`, `openid`
3. Add test users (for development)

### Create Credentials

**For Android:**
1. Application type: Android
2. Package name: `com.arabicvoice.arabicvoiceagent`
3. SHA-1 certificate fingerprint:
   ```bash
   # Debug key
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```

**For iOS:**
1. Application type: iOS
2. Bundle ID: `com.arabicvoice.arabicvoiceagent`

**For Web (Supabase):**
1. Application type: Web application
2. Authorized redirect URIs: Your Supabase callback URL

---

## Step 6: Environment Configuration

### Root `.env` File

```bash
cp .env.example .env
```

Edit `.env`:
```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# LiveKit
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
LIVEKIT_URL=wss://your-project.livekit.cloud

# OpenAI
OPENAI_API_KEY=sk-xxxxxxxx

# ElevenLabs
ELEVENLABS_API_KEY=your-key
ELEVENLABS_VOICE_ID=your-voice-id

# Deepgram
DEEPGRAM_API_KEY=your-key

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Agent Config
ARABIC_DIALECT=mixed
AGENT_LOG_LEVEL=INFO
```

### Mobile App `.env`

```bash
cd apps/mobile
cp .env.example .env
```

Edit `apps/mobile/.env`:
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
LIVEKIT_URL=wss://your-project.livekit.cloud
```

---

## Step 7: Install Dependencies

### Python Agent

```bash
cd apps/agent
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Flutter App

```bash
cd apps/mobile
flutter pub get
```

---

## Step 8: Run Locally

### Start the Agent

```bash
cd apps/agent
source venv/bin/activate
python src/main.py start
```

### Run the Mobile App

```bash
cd apps/mobile
flutter run
```

Select your device/emulator when prompted.

---

## Step 9: Test the Setup

1. Launch the app
2. Sign in with Google
3. Start a text conversation
4. Send a message
5. Switch to voice mode
6. Test voice call

---

## Common Issues

### Supabase Connection Failed
- Verify URL and keys in `.env`
- Check network connection
- Ensure migrations are pushed

### Google Sign-In Not Working
- Verify OAuth credentials
- Check SHA-1 fingerprint (Android)
- Confirm redirect URLs in Supabase

### Voice Call Not Connecting
- Check LiveKit URL and keys
- Verify microphone permissions
- Ensure agent is running

### Agent Crashes
- Check Python version (3.11+)
- Verify all API keys are set
- Check logs: `AGENT_LOG_LEVEL=DEBUG`

---

## Next Steps

- Read [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment
- Read [ARCHITECTURE.md](ARCHITECTURE.md) for system overview
- Customize system prompt in `apps/agent/src/config.py`

## Support

For issues, check:
- GitHub Issues
- Supabase docs: https://supabase.com/docs
- LiveKit docs: https://docs.livekit.io
- Flutter docs: https://docs.flutter.dev
