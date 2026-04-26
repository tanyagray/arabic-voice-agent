# Onboarding Agent

This is the agent that says hi to brand-new learners and gets them set up. One agent, one goal — it picks its own pace.

## What it does

Figures out two things from the learner, gently:

1. Their **name**.
2. Why they want to learn Arabic — travel, family, religion, work, just curious, whatever.

If they'd rather not say, that's fine — it notes the refusal and moves on. Once it has both, it wraps up by showing three starter lesson tiles tailored to that motivation.

## The vibe

It plays Mishmish (مشمش, "apricot") — a warm Arabic tutor. Talks in English, sprinkles in the odd Arabic word (`marhaban`, `ahlan`, `mumtaz`) for flavour. No full Arabic sentences, no Arabic script — the learner doesn't speak it yet.

## How it talks

The agent emits one `final_output` per turn. The harness writes it to `transcript_messages` as a single row (`message_kind="text"`, `flow="onboarding"`); the UI splits on sentence boundaries so a 1–2 sentence reply still types in as multiple bubbles. The agent doesn't manage cadence or persistence — it just produces good text.

## Tools it uses

- **`generate_lessons(intro, tiles)`** — called once, right at the end. Spits out the three lesson tiles, saves the profile, marks onboarding done. Writes its own `message_kind="component"` row for the tile picker UI.

## Files

- [onboarding_agent.py](onboarding_agent.py) — the `Agent` + harness options.
- [onboarding_instructions.py](onboarding_instructions.py) — builds the prompt, injects what's been collected so far.
- [system.md](system.md) — the actual system prompt (job, rules, tile guidance).
- [tools/generate_lessons_tool.py](tools/generate_lessons_tool.py) — emits the tiles and writes the profile row.

## The UI side

Lives in [web-app/src/pages/Onboarding.tsx](../../../web-app/src/pages/Onboarding.tsx).

- Subscribes to `transcript_messages` via Supabase Realtime, filtered by `session_id`. Same data path as the regular tutor chat — the UI is agent-agnostic at the data layer.
- Each tutor message gets split into sentences and typed into the hero, one bubble per sentence.
- When the learner replies, the previous turn fades out and the next reply types in.
- The `generate_lessons` call comes through as a component message and renders as `LessonTiles` — three picker cards. Click one and you're off to `/`.
- Session creation is deferred until the learner submits their first message — visitors who land but never type cost zero tokens. The synthetic intro bubbles ("marhaban!", etc.) are rendered client-side in `Onboarding.tsx`.
- Session plumbing is in `useOnboardingSession`; flow tag is `onboarding`.
