-- Flow/node metadata on transcript messages so multi-flow conversations
-- (onboarding, tutor, etc.) can be grouped and filtered in the admin UI.

alter table "public"."transcript_messages"
  add column "flow" text,
  add column "node" text;

create index idx_transcript_messages_flow on public.transcript_messages (flow);
create index idx_transcript_messages_flow_session on public.transcript_messages (flow, session_id);
