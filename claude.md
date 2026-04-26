# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Arabic Voice Agent — a monorepo with a FastAPI voice/chat backend (web-api), React marketing site (web-app), Flutter mobile app (flutter-app), React admin dashboard (admin-app), and Supabase database layer.

## Starting the App

When asked to "start the app", run the **"Start All Services"** VS Code task (`Cmd+Shift+B`). This starts Supabase, web-api, and web-app in separate terminals.

**Before making changes to the web-app**, ensure all services are running (Supabase + web-api + web-app), not just the Vite dev server. The web-app fetches its runtime config and onboarding/landing content from web-api (which in turn depends on Supabase), so without the full stack the app renders a "Failed to load app configuration" error and you cannot visually verify UI changes. If services aren't already up, run the "Start All Services" task before previewing.

## Common Commands

### web-api (Python, uv)
```bash
cd web-api
task install          # Install dependencies (uv sync)
task dev              # Dev server with debugpy on :5678, uvicorn on :8000
task start            # Production server

# Testing
task test             # Run all unit tests with pytest
task test:watch       # Run tests in watch mode (auto-rerun on changes)
uv run pytest tests/test_foo.py::test_bar  # Run single test directly
```

### web-app (TypeScript, npm)
```bash
cd web-app
npm install
npm run dev           # Vite dev server on :5173
npm run build         # TypeScript check + Vite build
npm run lint          # ESLint
npm run storybook     # Storybook on :6006
```

### flutter-app (Dart, Flutter)
```bash
cd flutter-app
flutter pub get
flutter run
task build_android    # Build AAB
```

### admin-app (TypeScript, npm)
```bash
cd admin-app
npm install && npm run dev
npm run build && npm run lint
```

### Supabase
```bash
supabase start        # Local Supabase (requires Docker)
supabase db reset     # Reset and re-run migrations
supabase migration up # Apply pending migrations locally (preferred)
```

**Important Supabase rules:**
- Never run `supabase db reset` without explicit permission — it destroys all local data.
- Never push to remote/production Supabase (`supabase db push --linked` or any production deploy) without explicit permission.
- For local development, apply migrations with `supabase migration up`.
- All schema changes must be done via migration files in `supabase/migrations/`.
- Before any database refactor, check whether `[experimental.pgdelta]` in `supabase/config.toml` is ready for use. As of March 2026 it was alpha (CLI v2.83.0, `@supabase/pg-delta@1.0.0-alpha.4`). If stable, it can replace the manual `supabase db diff` workflow with a proper declarative sync engine. See: supabase.com/docs/guides/local-development/declarative-database-schemas and github.com/supabase/pg-toolbelt.

**Seeded test users (local + preview environments only):**
- `freeloader@mishmish.io` / `password` — free plan user, for testing free-tier limits and quota enforcement.
- `pro@mishmish.io` / `password` — pro plan user, for testing paid features.
- `test@mishmish.io` / `password` — scratch user for exercising the signup/onboarding flow. Not seeded; create it via the signup UI whenever you need a fresh new-user flow. It is always safe to delete `test@mishmish.io` and all their associated data (profile, conversations, messages, usage events, etc.) from the database to re-run signup from scratch.

## Architecture

### Voice Pipeline (web-api)
Audio flows through Pipecat: **User Audio → WebSocket → Deepgram STT → OpenAI GPT-4o → ElevenLabs TTS → WebSocket → User Audio**

Key backend structure:
- `main.py` — FastAPI app, registers all routers
- `routes/` — HTTP/WebSocket endpoints (`realtime_pipecat.py` is the active voice endpoint at `/pipecat/session/{session_id}`)
- `services/` — Business logic (`pipecat_service.py` orchestrates the voice pipeline, `session_service.py`, `agent_service.py`, `supabase_client.py`)
- `agent/tutor/` — Tutoring agent with system instructions and tools (e.g., `change_language_tool.py` for dialect switching)

### web-app
React 19 + Vite + TypeScript. Uses Chakra UI, Zustand for state, TanStack React Query, Supabase JS SDK for auth. Components in `src/components/`, hooks in `src/hooks/`, stores in `src/store/`.

### Database
PostgreSQL via Supabase. Migrations in `supabase/migrations/`. Key tables: `profiles`, `conversations`, `messages`, `agent_sessions`, `personas`, `transcript_messages`.

## Testing

### web-api Testing

The web-api uses **pytest** (same as Pipecat) for unit and integration testing.

**Test Structure:**
```
web-api/tests/
├── conftest.py              # Shared fixtures (TestClient, mocks, etc.)
├── test_routes/             # API endpoint tests
├── test_services/           # Service layer tests
└── test_agent/              # Agent logic tests
```

**Key Testing Practices:**
- Use FastAPI's `TestClient` for route testing
- Mock external services (Supabase, OpenAI, ElevenLabs, Deepgram)
- Use fixtures from `conftest.py` for common setup
- Test both success and error scenarios
- Use `pytest-asyncio` for async tests

See `web-api/tests/README.md` for detailed testing documentation.

## Git Commit Conventions

All commits **MUST** follow [Conventional Commits](https://www.conventionalcommits.org/). This project uses release-please for automated versioning.

Format: `<type>[optional scope]: <description>`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

Scopes typically match the package: `web-api`, `web-app`, `flutter-app`, `admin-app`, `storybook`, `supabase`, `config`.

Breaking changes: add `!` after type/scope (e.g., `feat!: change API structure`).

## Environment

Each package has its own `.env` file (see `.env.example` in each). The root `.env` is also used. Python uses `uv` with a `.venv` virtual environment.

**Important:** All Python commands in web-api must be run via `uv run` (e.g., `uv run pytest`, `uv run python script.py`). Do not use bare `python` or `pytest` directly — `uv run` ensures the correct virtual environment and dependencies are used.
