create table public.transcript_messages (
  message_id uuid primary key,
  session_id text not null references public.agent_sessions(session_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message_source text not null,
  message_kind text not null,
  message_text text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  message_text_canonical text
);

-- Indexes
create index idx_transcript_messages_session_id on public.transcript_messages(session_id);
create index idx_transcript_messages_user_id on public.transcript_messages(user_id);

-- Table-level permissions
grant all on public.transcript_messages to service_role;
grant all on public.transcript_messages to authenticated;
grant all on public.transcript_messages to anon;

-- Enable Row Level Security
alter table public.transcript_messages enable row level security;

-- RLS Policies
create policy "Users can manage their own transcript messages"
  on public.transcript_messages
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-update updated_at timestamp
create or replace function public.update_transcript_messages_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_transcript_messages_updated_at
  before update on public.transcript_messages
  for each row
  execute function public.update_transcript_messages_updated_at();

-- NOTE: Realtime publication is NOT captured by declarative diff.
-- A manual migration is required for:
--   ALTER PUBLICATION supabase_realtime ADD TABLE transcript_messages;
