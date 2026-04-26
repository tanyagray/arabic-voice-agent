# Onboarding Agent

This is the agent that says hi to brand-new learners and gets them set up. One agent, one goal — it picks its own pace.

## What it does

Figures out two things from the learner, gently:

1. Their **name**.
2. Why they want to learn Arabic — travel, family, religion, work, just curious, whatever.

If they'd rather not say, that's fine — it notes the refusal and moves on. Once it has both, it wraps up by showing three starter lesson tiles tailored to that motivation.

## The vibe

It plays Mishmish (مشمش, "apricot") — a warm Arabic tutor. Talks in English, sprinkles in the odd Arabic word (`marhaban`, `ahlan`, `mumtaz`) for flavour. No full Arabic sentences, no Arabic script — the learner doesn't speak it yet.

## Tools it uses

- **`say(text, highlights?)`** — one chat bubble per call. The agent calls it a few times per turn so things feel natural (greeting on one line, question on the next). `highlights` lets it tag Arabic words so their meaning pops up on hover.
- **`generate_lessons(intro, tiles)`** — called once, right at the end. Spits out the three lesson tiles, saves the profile, marks onboarding done.

Everything visible goes through `say`. The agent's `final_output` is ignored on purpose — we want structured bubbles with highlight metadata, not parsed-out text.

## Files

- [onboarding_agent.py](onboarding_agent.py) — the `Agent` + harness options.
- [onboarding_instructions.py](onboarding_instructions.py) — builds the prompt, injects what's been collected so far.
- [system.md](system.md) — the actual system prompt (job, rules, tile guidance).
- [tools/say_tool.py](tools/say_tool.py) — the bubble emitter.
- [tools/generate_lessons_tool.py](tools/generate_lessons_tool.py) — emits the tiles and writes the profile row.

## The UI side

Lives in [web-app/src/pages/Onboarding.tsx](../../../web-app/src/pages/Onboarding.tsx).

- Each `say` bubble types itself into a big hero area, one line at a time. Highlighted words are tinted; tap or hover to see what they mean.
- When the learner replies, the previous turn fades out and the next batch of bubbles types in.
- The `generate_lessons` call comes through as a component message and renders as `LessonTiles` — three picker cards. Click one and you're off to `/`.
- Session plumbing is in `useOnboardingSession`; flow tag is `onboarding`.
