-- Enable RLS and add user-scoped policies for agent_sessions and transcript_messages

alter table "public"."agent_sessions" enable row level security;

create policy "Users can manage their own agent sessions"
  on "public"."agent_sessions"
  as permissive
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


alter table "public"."transcript_messages" enable row level security;

create policy "Users can manage their own transcript messages"
  on "public"."transcript_messages"
  as permissive
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
