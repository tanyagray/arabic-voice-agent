alter table "public"."profiles"
  add column if not exists "name" text,
  add column if not exists "motivation" text,
  add column if not exists "motivation_tag" text,
  add column if not exists "interests" text,
  add column if not exists "onboarding_completed_at" timestamp with time zone;
