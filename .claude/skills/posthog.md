---
name: posthog
description: >
  Use this skill for any PostHog analytics task. Triggers when the user mentions
  PostHog, product analytics, feature flags, A/B tests, experiments, session recordings,
  event tracking, funnels, cohorts, dashboards, or asks to "set up analytics",
  "add tracking", "manage feature flags", etc. Also trigger for "/posthog". Covers both
  PostHog CLI operations and PostHog API/SDK integration code.
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, Grep, Edit, AskUserQuestion, WebFetch
argument-hint: "[command or task description]"
---

# PostHog CLI & Analytics Management

You are an expert at using the PostHog CLI and integrating PostHog analytics into applications. Use this skill to help with all PostHog-related tasks.

## Step 1: Ensure PostHog CLI is available

Check if `posthog` is installed:

```bash
which posthog
```

If not found, install it:

- **macOS**: `brew install posthog-cli` — if the Homebrew formula is unavailable, fall back to the pip method below.
- **pip (any platform)**:
  ```bash
  pip install posthog-cli
  ```
- **npm (any platform)**:
  ```bash
  npm install -g posthog
  ```

If none of these install methods work, check the PostHog docs for the latest installation instructions:
```bash
# Check if there's a standalone binary or updated install method
open https://posthog.com/docs/cli
```

After installation, verify it works:
```bash
posthog --version
```

## Step 2: Resolve the project's PostHog configuration

This skill uses a **per-project PostHog config** so you never accidentally operate on the wrong PostHog project.

### How it works

1. Check for a `.posthog-project` file in the repo root. This file contains the PostHog **project API key** and **host** (no secrets — the `phc_` key is public, same as what ships in browser JS):
   ```
   POSTHOG_CLI_PROJECT_API_KEY=phc_xxxxx
   POSTHOG_CLI_HOST=https://us.i.posthog.com
   ```
2. If `.posthog-project` exists, read the values and use them for all PostHog CLI and API commands.
3. If `.posthog-project` does NOT exist, ask the user:
   - "What PostHog project should this repo use? I need:"
   - "1. Your PostHog **project API key** (starts with `phc_`) — found in Project Settings → Project API Key"
   - "2. Your PostHog **host** (e.g., `https://us.i.posthog.com` or `https://eu.i.posthog.com` or a self-hosted URL)"
   - Once they provide these, create `.posthog-project` with those values.

`.posthog-project` contains **no secrets** (the `phc_` key is a public project key) and is committed to the repo — all developers share the same project config.

### Authenticating the CLI

Authentication is handled via the PostHog CLI's own login flow, **not** stored in `.posthog-project`. Each developer authenticates once on their machine.

```bash
# Authenticate with PostHog (opens browser for OAuth)
posthog login

# Or authenticate with a personal API key
posthog login --personal-api-key=phx_xxxxx
```

If the CLI doesn't support `login`, the user needs a **personal API key** (starts with `phx_`). Guide them to create one:
- Go to PostHog → Settings (gear icon) → User → Personal API Keys → Create key
- Then export it for the current shell session:
  ```bash
  export POSTHOG_PERSONAL_API_KEY=phx_xxxxx
  ```

### Verifying auth works

```bash
# Test that auth + project config work together
curl -s -H "Authorization: Bearer $POSTHOG_PERSONAL_API_KEY" \
  "$(grep POSTHOG_CLI_HOST .posthog-project | cut -d= -f2)/api/projects/@current/" | python3 -m json.tool
```

### Key rules

- **`.posthog-project` stores only non-secret project identifiers** (project ID and host). It is safe to commit.
- **Secrets (personal API keys) are never stored in `.posthog-project`**. They come from CLI auth or environment variables.
- **Always read `.posthog-project`** at the start to determine `POSTHOG_CLI_HOST` and `POSTHOG_CLI_PROJECT_API_KEY` for API calls.
- When using the API directly, read the host and project ID from `.posthog-project` and use them to scope requests (e.g., `$POSTHOG_CLI_HOST/api/projects/$POSTHOG_CLI_PROJECT_API_KEY/...`).

## Step 3: Understand the task

The user's input is in `$ARGUMENTS`. Common categories:

### Feature Flags
```bash
# List feature flags
posthog feature-flags list

# Create a feature flag
posthog feature-flags create --key=new-onboarding --description="New user onboarding flow"

# Toggle a feature flag
posthog feature-flags enable --key=new-onboarding
posthog feature-flags disable --key=new-onboarding

# Check flag status
posthog feature-flags get --key=new-onboarding
```

If the CLI doesn't support these commands, use the PostHog API directly (reading host from `.posthog-project`):
```bash
POSTHOG_CLI_HOST=$(grep POSTHOG_CLI_HOST .posthog-project | cut -d= -f2)
POSTHOG_CLI_PROJECT_API_KEY=$(grep POSTHOG_CLI_PROJECT_API_KEY .posthog-project | cut -d= -f2)

# List feature flags via API
curl -s -H "Authorization: Bearer $POSTHOG_PERSONAL_API_KEY" \
  "$POSTHOG_CLI_HOST/api/projects/$POSTHOG_CLI_PROJECT_API_KEY/feature_flags/" | python3 -m json.tool

# Create a feature flag via API
curl -s -X POST -H "Authorization: Bearer $POSTHOG_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  "$POSTHOG_CLI_HOST/api/projects/$POSTHOG_CLI_PROJECT_API_KEY/feature_flags/" \
  -d '{"key": "new-onboarding", "name": "New onboarding flow", "filters": {"groups": [{"rollout_percentage": 0}]}}'

# Toggle a feature flag via API
curl -s -X PATCH -H "Authorization: Bearer $POSTHOG_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  "$POSTHOG_CLI_HOST/api/projects/$POSTHOG_CLI_PROJECT_API_KEY/feature_flags/<FLAG_ID>/" \
  -d '{"active": true}'
```

### Events & Analytics
```bash
POSTHOG_CLI_HOST=$(grep POSTHOG_CLI_HOST .posthog-project | cut -d= -f2)
POSTHOG_CLI_PROJECT_API_KEY=$(grep POSTHOG_CLI_PROJECT_API_KEY .posthog-project | cut -d= -f2)

# Query events via API
curl -s -H "Authorization: Bearer $POSTHOG_PERSONAL_API_KEY" \
  "$POSTHOG_CLI_HOST/api/projects/$POSTHOG_CLI_PROJECT_API_KEY/events/?event=page_view&limit=10" | python3 -m json.tool

# Query insights (funnels, trends, etc.)
curl -s -X POST -H "Authorization: Bearer $POSTHOG_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  "$POSTHOG_CLI_HOST/api/projects/$POSTHOG_CLI_PROJECT_API_KEY/insights/trend/" \
  -d '{"events": [{"id": "pageview"}], "date_from": "-7d"}'
```

### Cohorts
```bash
# List cohorts
curl -s -H "Authorization: Bearer $POSTHOG_PERSONAL_API_KEY" \
  "$POSTHOG_CLI_HOST/api/projects/$POSTHOG_CLI_PROJECT_API_KEY/cohorts/" | python3 -m json.tool

# Create a cohort
curl -s -X POST -H "Authorization: Bearer $POSTHOG_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  "$POSTHOG_CLI_HOST/api/projects/$POSTHOG_CLI_PROJECT_API_KEY/cohorts/" \
  -d '{"name": "Power users", "groups": [{"properties": [{"key": "session_count", "value": 10, "type": "person", "operator": "gt"}]}]}'
```

### Annotations
```bash
# Create an annotation (e.g., marking a deploy)
curl -s -X POST -H "Authorization: Bearer $POSTHOG_PERSONAL_API_KEY" \
  -H "Content-Type: application/json" \
  "$POSTHOG_CLI_HOST/api/projects/$POSTHOG_CLI_PROJECT_API_KEY/annotations/" \
  -d '{"content": "Deployed v1.2.0", "date_marker": "2024-01-15T12:00:00Z", "scope": "project"}'
```

### Persons
```bash
# Search for a person
curl -s -H "Authorization: Bearer $POSTHOG_PERSONAL_API_KEY" \
  "$POSTHOG_CLI_HOST/api/projects/$POSTHOG_CLI_PROJECT_API_KEY/persons/?search=user@example.com" | python3 -m json.tool

# Get person details
curl -s -H "Authorization: Bearer $POSTHOG_PERSONAL_API_KEY" \
  "$POSTHOG_CLI_HOST/api/projects/$POSTHOG_CLI_PROJECT_API_KEY/persons/<PERSON_ID>/" | python3 -m json.tool
```

### Dashboards
```bash
# List dashboards
curl -s -H "Authorization: Bearer $POSTHOG_PERSONAL_API_KEY" \
  "$POSTHOG_CLI_HOST/api/projects/$POSTHOG_CLI_PROJECT_API_KEY/dashboards/" | python3 -m json.tool

# Get a specific dashboard
curl -s -H "Authorization: Bearer $POSTHOG_PERSONAL_API_KEY" \
  "$POSTHOG_CLI_HOST/api/projects/$POSTHOG_CLI_PROJECT_API_KEY/dashboards/<DASHBOARD_ID>/" | python3 -m json.tool
```

## Step 4: Integrating PostHog into the codebase

When the user wants to add PostHog support to the application code, follow these patterns:

### Backend (Python/FastAPI — web-api)

**Dependencies**: Add `posthog` to `pyproject.toml` dependencies.

```bash
cd web-api && uv add posthog
```

**Environment variables needed**:
- `POSTHOG_API_KEY` — Project API key (phc_...) — used by the SDK to send events
- `POSTHOG_HOST` — PostHog instance host (e.g., `https://us.i.posthog.com`)

**Initialization** (`services/posthog_client.py`):
```python
import posthog
from config import settings

posthog.api_key = settings.POSTHOG_API_KEY
posthog.host = settings.POSTHOG_HOST

# Disable in tests
posthog.disabled = settings.TESTING
```

**Event tracking**:
```python
import posthog

# Track an event
posthog.capture(
    distinct_id=user_id,
    event="lesson_completed",
    properties={
        "lesson_id": lesson_id,
        "language": "arabic",
        "duration_seconds": duration,
    },
)

# Identify a user
posthog.identify(
    distinct_id=user_id,
    properties={
        "email": user.email,
        "name": user.name,
        "plan": user.subscription_tier,
    },
)
```

**Feature flags (server-side)**:
```python
import posthog

# Check a feature flag
if posthog.feature_enabled("new-onboarding", distinct_id=user_id):
    # New onboarding flow
    ...

# Get feature flag payload
payload = posthog.get_feature_flag_payload("new-onboarding", distinct_id=user_id)
```

**Shutdown** — call `posthog.shutdown()` on app shutdown to flush events:
```python
@app.on_event("shutdown")
def shutdown_posthog():
    posthog.shutdown()
```

### Frontend (React — web-app)

**Dependencies**:
```bash
cd web-app && npm install posthog-js
```

**Initialization** (`src/posthog.ts`):
```typescript
import posthog from "posthog-js";

posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
  api_host: import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com",
  person_profiles: "identified_only",
  capture_pageview: true,
  capture_pageleave: true,
});

export default posthog;
```

**React provider** (`src/main.tsx` or `src/App.tsx`):
```typescript
import { PostHogProvider } from "posthog-js/react";
import posthog from "./posthog";

<PostHogProvider client={posthog}>
  <App />
</PostHogProvider>
```

**Usage in components**:
```typescript
import { usePostHog, useFeatureFlagEnabled } from "posthog-js/react";

function MyComponent() {
  const posthog = usePostHog();
  const showNewFeature = useFeatureFlagEnabled("new-feature");

  const handleClick = () => {
    posthog.capture("button_clicked", { button_name: "start_lesson" });
  };

  return showNewFeature ? <NewFeature /> : <OldFeature />;
}
```

**Identify users after login**:
```typescript
posthog.identify(user.id, {
  email: user.email,
  name: user.name,
});
```

**Reset on logout**:
```typescript
posthog.reset();
```

### Flutter (flutter-app)

**Dependencies** (`pubspec.yaml`):
```yaml
dependencies:
  posthog_flutter: ^4.0.0
```

**Initialization**:
```dart
import 'package:posthog_flutter/posthog_flutter.dart';

await Posthog().setup(
  PosthogConfig(apiKey: 'phc_xxxxx')
    ..host = 'https://us.i.posthog.com',
);
```

**Usage**:
```dart
// Capture event
await Posthog().capture(
  eventName: 'lesson_started',
  properties: {'lesson_id': lessonId},
);

// Identify user
await Posthog().identify(
  userId: user.id,
  userProperties: {'email': user.email},
);

// Feature flags
final enabled = await Posthog().isFeatureEnabled('new-onboarding');
```

## Step 5: Common analytics patterns for this project

Events worth tracking for the Arabic Voice Agent:

| Event | Properties | When |
|-------|-----------|------|
| `session_started` | `session_id`, `language`, `dialect` | User starts a voice session |
| `session_ended` | `session_id`, `duration_seconds`, `message_count` | Voice session ends |
| `message_sent` | `session_id`, `language`, `message_type` | User sends a message |
| `dialect_changed` | `from_dialect`, `to_dialect` | User switches dialect |
| `lesson_completed` | `lesson_id`, `score`, `duration` | User completes a lesson |
| `signup_completed` | `method` (google, email) | User creates account |
| `subscription_started` | `plan`, `price` | User subscribes |

## Tips

- **Always read `.posthog-project`** at the start to get `POSTHOG_CLI_HOST` and `POSTHOG_CLI_PROJECT_API_KEY`
- `.posthog-project` is committed to the repo — it contains no secrets, just the public project API key and host
- **Secrets (personal API keys) come from CLI auth or `$POSTHOG_PERSONAL_API_KEY` env var** — never store them in `.posthog-project`
- **Application SDK keys** (`phc_...`) go in `.env` files per package — never hardcode them
- Use `posthog.disabled = True` in test environments to avoid polluting analytics
- Use `posthog.shutdown()` on app shutdown to flush any pending events
- The PostHog CLI is relatively new and may not support all operations — fall back to the REST API via `curl` when needed
- Use `person_profiles: "identified_only"` on the frontend to avoid creating anonymous person profiles unnecessarily
- Group analytics by `language` and `dialect` properties to understand usage across Arabic dialects
