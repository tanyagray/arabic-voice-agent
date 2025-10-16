# Arabic Voice Agent

A multilingual voice and text chat application for Arabic language learning, supporting Modern Standard Arabic, Iraqi, and Egyptian dialects with seamless English code-switching.

## 🏗️ Architecture

- **Web App**: React + Vite marketing website with embedded voice demo
- **Mobile Apps**: Flutter (iOS + Android)
- **Voice Infrastructure**: LiveKit Cloud
- **Agent Backend**: Python (deployed on Render)
- **Web API**: FastAPI (LiveKit token generation)
- **LLM**: OpenAI GPT-4o
- **Text-to-Speech**: ElevenLabs (Multilingual v2)
- **Speech-to-Text**: Soniox (Arabic/English language identification)
- **Auth & Database**: Supabase (PostgreSQL + Google OAuth)

## 📁 Monorepo Structure

```
arabic-voice-agent/
├── web-app/             # Marketing website (React + Vite)
├── flutter-app/         # Flutter app (iOS + Android)
├── livekit-agent/       # LiveKit Python agent
├── web-api/             # FastAPI token server
├── supabase/            # Database migrations & config
├── docs/                # Documentation
└── .github/             # CI/CD workflows
```

## 🚀 Quick Start

See [docs/SETUP.md](docs/SETUP.md) for detailed setup instructions.

### Prerequisites

- Python 3.11+
- Flutter 3.24+
- Node.js 18+ (for Supabase CLI)
- Supabase account
- LiveKit Cloud account
- API keys: OpenAI, ElevenLabs, Deepgram

### Environment Setup

1. Copy `.env.example` to `.env` and fill in your API keys
2. Install Supabase CLI: `npm install -g supabase`
3. Link to your Supabase project: `supabase link`
4. Run migrations: `supabase db push`

### Running Locally

**Web App:**
```bash
cd web-app
npm install
npm run dev
```

**Web API (required for web app):**
```bash
cd web-api
# Follow web-api README for setup
```

**Agent:**
```bash
cd livekit-agent
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
python src/main.py
```

**Mobile App:**
```bash
cd flutter-app
flutter pub get
flutter run
```

## 🌍 Supported Arabic Dialects

- Modern Standard Arabic (MSA)
- Iraqi Arabic
- Egyptian Arabic
- Mixed English/Arabic

Configure via `ARABIC_DIALECT` environment variable.

## 📚 Documentation

- [Setup Guide](docs/SETUP.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Architecture Overview](docs/ARCHITECTURE.md)

## 🔐 Security

- Row-level security (RLS) enabled on all Supabase tables
- API keys stored as environment variables
- Google OAuth for authentication

## 📄 License

MIT
