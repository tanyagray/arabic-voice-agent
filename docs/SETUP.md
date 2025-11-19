# Setup Guide

Complete guide to setting up the Arabic Voice Agent development environment.

## Prerequisites

### Required Software

- **Python 3.11+** - for the Web API
- **Flutter 3.24+** - for mobile apps
- **Node.js 18+** - for web app
- **Git** - version control

### Required Accounts

1. **Supabase** - https://supabase.com
2. **OpenAI** - https://platform.openai.com
3. **ElevenLabs** - https://elevenlabs.io
4. **Soniox** - https://soniox.com
5. **Google Cloud Console** - for OAuth
6. **Render** - https://render.com (for deployment, optional)
7. **GitHub** - for code hosting

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

## Step 3: Get API Keys

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

### Soniox

1. Go to https://soniox.com
2. Create account and get API key
3. Save the key

---

## Step 4: Google OAuth Setup

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

## Step 5: Environment Configuration

### Web API `.env` File

```bash
cd web-api
cp .env.example .env
```

Edit `web-api/.env`:
```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# OpenAI
OPENAI_API_KEY=sk-xxxxxxxx

# ElevenLabs
ELEVEN_API_KEY=your-key

# Soniox
SONIOX_API_KEY=your-key

# Google OAuth (if needed)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

### Web App `.env` File

```bash
cd web-app
cp .env.example .env
```

Edit `web-app/.env`:
```env
VITE_API_URL=http://localhost:8000
```

---

## Step 6: Install Dependencies

### Web API

```bash
cd web-api
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Web App

```bash
cd web-app
npm install
```

### Flutter App

```bash
cd flutter-app
flutter pub get
```

---

## Step 7: Run Locally

### Start the Web API

```bash
cd web-api
source venv/bin/activate
# Follow web-api README for startup command
```

### Start the Web App

```bash
cd web-app
npm run dev
```

### Run the Mobile App

```bash
cd flutter-app
flutter run
```

Select your device/emulator when prompted.

---

## Step 8: Test the Setup

1. Launch the web app or mobile app
2. Sign in with Google
3. Start a text conversation
4. Send a message
5. Switch to voice mode (if available)
6. Test voice interaction

---

## Common Issues

### Supabase Connection Failed
- Verify URL and keys in `.env`
- Check network connection
- Ensure migrations are applied

### Google Sign-In Not Working
- Verify OAuth credentials
- Check SHA-1 fingerprint (Android)
- Confirm redirect URLs in Supabase

### Voice Not Working
- Verify microphone permissions
- Ensure Web API is running
- Check API keys (Soniox, ElevenLabs)

### Web API Errors
- Check Python version (3.11+)
- Verify all API keys are set in `.env`
- Check logs for error details

---

## Next Steps

- Read [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment
- Read [ARCHITECTURE.md](ARCHITECTURE.md) for system overview
- Explore the web-api directory for customization options

## Support

For issues, check:
- GitHub Issues
- Supabase docs: https://supabase.com/docs
- FastAPI docs: https://fastapi.tiangolo.com
- Flutter docs: https://docs.flutter.dev
