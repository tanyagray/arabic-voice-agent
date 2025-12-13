create table public.transcript_messages (
  message_id uuid primary key,
  session_id text not null references public.agent_sessions(session_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message_source text not null,
  message_kind text not null,
  message_content text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Create index on session_id for faster lookups
create index idx_transcript_messages_session_id on public.transcript_messages(session_id);

-- Create index on user_id for user-specific queries
create index idx_transcript_messages_user_id on public.transcript_messages(user_id);

-- Table-level permissions
grant all on public.transcript_messages to service_role;
grant all on public.transcript_messages to authenticated;
grant all on public.transcript_messages to anon;

-- Create function to automatically update updated_at timestamp
create or replace function public.update_transcript_messages_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger to update updated_at on row updates
create trigger update_transcript_messages_updated_at
  before update on public.transcript_messages
  for each row
  execute function public.update_transcript_messages_updated_at();
