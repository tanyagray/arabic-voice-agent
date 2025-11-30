create table config.personas (
  id integer primary key,
  locale text not null,
  voice_provider text not null,
  voice_id text not null
);

-- Table-level permissions
grant select on config.personas to anon, authenticated;
grant all on config.personas to service_role;

-- Enable Row Level Security
alter table config.personas enable row level security;

-- RLS Policies
-- Allow anyone (including anon) to read persona configurations
create policy "Public read access"
  on config.personas
  for select
  using (true);

-- Only service role can modify (it bypasses RLS, but being explicit)
-- This prevents authenticated users from inserting/updating/deleting
create policy "Service role can modify"
  on config.personas
  for all
  to service_role
  using (true)
  with check (true);
