# Arabic Voice Agent

A multilingual voice and text chat application for Arabic language learning, supporting Modern Standard Arabic, Iraqi, and Egyptian dialects with seamless English code-switching.

## 🏗️ Architecture

- **Web App**: React + Vite marketing website with voice demo
- **Mobile Apps**: Flutter (iOS + Android)
- **Web API**: FastAPI (voice and chat interactions)
- **LLM**: OpenAI GPT-4o
- **Text-to-Speech**: ElevenLabs (Multilingual v2)
- **Speech-to-Text**: Soniox (Arabic/English language identification)
- **Auth & Database**: Supabase (PostgreSQL + Google OAuth)

## 📁 Monorepo Structure

```
arabic-voice-agent/
├── web-app/             # Marketing website (React + Vite)
├── flutter-app/         # Flutter app (iOS + Android)
├── web-api/             # FastAPI backend for voice and chat
├── docs/                # Documentation
└── .github/             # CI/CD workflows
```

## 🚀 Quick Start

See [docs/SETUP.md](docs/SETUP.md) for detailed setup instructions.

### Prerequisites

- Python 3.11+
- Flutter 3.24+
- Node.js 18+
- Supabase account
- API keys: OpenAI, ElevenLabs, Soniox

### Environment Setup

1. Copy `.env.example` to `.env` in the `web-api` directory and fill in your API keys
2. Follow the setup instructions in [docs/SETUP.md](docs/SETUP.md)

### Running Locally

**Web API:**
```bash
cd web-api
# Follow web-api README for setup
```

**Web App:**
```bash
cd web-app
npm install
npm run dev
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
