-- Add billing + usage tracking.
-- profiles gains plan/Stripe columns; usage_events is an append-only ledger
-- used for monthly voice-second totals and daily chat-message counts.

alter table "public"."profiles"
  add column "plan" text not null default 'free' check (plan in ('free', 'pro')),
  add column "stripe_customer_id" text,
  add column "stripe_subscription_id" text,
  add column "subscription_status" text,
  add column "current_period_end" timestamptz;

create unique index profiles_stripe_customer_id_idx
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;


create table "public"."usage_events" (
  "id" bigserial primary key,
  "user_id" uuid not null references auth.users(id) on delete cascade,
  "occurred_at" timestamptz not null default now(),
  "kind" text not null check (kind in ('voice_seconds', 'chat_message')),
  "amount" integer not null check (amount >= 0)
);

create index idx_usage_events_user_kind_time
  on public.usage_events (user_id, kind, occurred_at desc);

alter table "public"."usage_events" enable row level security;


create policy "Users can read own usage"
  on "public"."usage_events"
  as permissive
  for select
  to authenticated
  using ((auth.uid() = user_id));


grant select on table "public"."usage_events" to "authenticated";
grant all on table "public"."usage_events" to "service_role";
grant usage, select on sequence "public"."usage_events_id_seq" to "service_role";
