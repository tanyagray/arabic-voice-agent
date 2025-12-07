create table public.agent_sessions (
  session_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Create index on session_id for faster lookups
create index idx_agent_sessions_session_id on public.agent_sessions(session_id);

-- Create index on user_id for user-specific queries
create index idx_agent_sessions_user_id on public.agent_sessions(user_id);

-- Create index on updated_at for cleanup queries
create index idx_agent_sessions_updated_at on public.agent_sessions(updated_at);

-- Table-level permissions
grant all on public.agent_sessions to service_role;
grant all on public.agent_sessions to authenticated;
grant all on public.agent_sessions to anon;

-- Enable Row Level Security
-- alter table user_data.agent_sessions enable row level security;

-- RLS Policies
-- Service role has full access to all sessions
-- create policy "Service role full access"
--  on user_data.agent_sessions
--  for all
--  to service_role
--  using (true)
--  with check (true);

-- Authenticated and anon users can only access their own sessions
--create policy "Users can access their own sessions"
--  on user_data.agent_sessions
--  for all
--  to authenticated, anon
--  using (auth.uid() = user_id)
--  with check (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
create or replace function public.update_agent_sessions_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger to update updated_at on row updates
create trigger update_agent_sessions_updated_at
  before update on public.agent_sessions
  for each row
  execute function public.update_agent_sessions_updated_at();
