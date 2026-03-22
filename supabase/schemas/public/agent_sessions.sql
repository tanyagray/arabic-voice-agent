create table public.agent_sessions (
  session_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Indexes
create index idx_agent_sessions_session_id on public.agent_sessions(session_id);
create index idx_agent_sessions_user_id on public.agent_sessions(user_id);
create index idx_agent_sessions_updated_at on public.agent_sessions(updated_at);

-- Table-level permissions
grant all on public.agent_sessions to service_role;
grant all on public.agent_sessions to authenticated;
grant all on public.agent_sessions to anon;

-- Enable Row Level Security
alter table public.agent_sessions enable row level security;

-- RLS Policies
create policy "Users can manage their own agent sessions"
  on public.agent_sessions
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-update updated_at timestamp
create or replace function public.update_agent_sessions_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_agent_sessions_updated_at
  before update on public.agent_sessions
  for each row
  execute function public.update_agent_sessions_updated_at();
