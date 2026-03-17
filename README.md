<div align="center">

# 🍑 mishmish.ai

**Talk Arabic. Like a local.**

A real-time voice and chat app for Arabic learners — supporting Modern Standard Arabic, Iraqi, and Egyptian dialects with natural English code-switching.

[Live App](https://mishmish.ai) · [Setup Guide](docs/SETUP.md) · [Deployment](docs/DEPLOYMENT.md)

---

</div>

## What it does

mishmish.ai lets you have real, spoken conversations in Arabic. Pick a dialect, start talking, and get intelligent responses back — all in under a second. Built for learners who want to go beyond textbook Arabic.

- **Real-time voice** — speak and hear responses with < 1s latency
- **Dialect-aware** — switch between MSA, Iraqi, and Egyptian mid-conversation
- **Code-switching** — mix English and Arabic naturally, just like real speakers do
- **Web + Mobile** — React web app and Flutter iOS/Android app

---

## Stack

| Layer | Tech |
|---|---|
| Voice pipeline | [Pipecat](https://github.com/pipecat-ai/pipecat) — STT → LLM → TTS |
| Speech-to-text | Deepgram (real-time) |
| LLM | OpenAI GPT-4o |
| Text-to-speech | ElevenLabs Multilingual v2 |
| Backend | FastAPI (Python, uv) |
| Web frontend | React 19 + Vite + TypeScript |
| Mobile | Flutter (iOS + Android) |
| Auth & DB | Supabase (PostgreSQL + Google OAuth) |

---

## Monorepo layout

```
mishmish.ai/
├── web-app/        # Marketing site + voice demo (React + Vite)
├── web-api/        # FastAPI backend + Pipecat voice pipelines
├── flutter-app/    # Mobile app (iOS + Android)
├── admin-app/      # Internal admin dashboard
├── supabase/       # DB migrations and config
├── infra/          # AWS App Runner + CDK infra
└── docs/           # Architecture, setup, deployment guides
```

---

## Quick start

**Prerequisites:** Python 3.10+, Node 18+, Flutter 3.24+, Docker (for local Supabase)

```bash
# 1. Clone and set up environment
cp web-api/.env.example web-api/.env   # add your API keys

# 2. Start Supabase locally
supabase start

# 3. Start the API
cd web-api && task dev

# 4. Start the web app
cd web-app && npm install && npm run dev
```

You'll need API keys for: **OpenAI**, **ElevenLabs**, **Deepgram**, and **Supabase**.

Full setup → [docs/SETUP.md](docs/SETUP.md)

---

## Supported dialects

| Dialect | Code |
|---|---|
| Modern Standard Arabic | `msa` |
| Iraqi Arabic | `iraqi` |
| Egyptian Arabic | `egyptian` |
| Mixed Arabic/English | `mixed` |

---

## Docs

- [Setup Guide](docs/SETUP.md)
- [Architecture Overview](docs/ARCHITECTURE.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

---

<div align="center">

MIT License · Built with 🍑

</div>
