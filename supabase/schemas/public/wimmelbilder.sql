create table public.wimmelbilder (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  status text not null default 'pending',
  image_path text,
  image_width integer,
  image_height integer,
  objects jsonb,
  error text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Indexes
create index idx_wimmelbilder_created_by on public.wimmelbilder(created_by);

-- Table-level permissions
grant all on public.wimmelbilder to service_role;
grant select on public.wimmelbilder to authenticated;
grant select on public.wimmelbilder to anon;

-- Enable Row Level Security
alter table public.wimmelbilder enable row level security;

-- RLS Policies
create policy "Anyone can view wimmelbilder"
  on public.wimmelbilder
  for select
  to authenticated, anon
  using (true);

create policy "Service role has full access to wimmelbilder"
  on public.wimmelbilder
  for all
  to service_role
  using (true)
  with check (true);

-- Auto-update updated_at timestamp
create or replace function public.update_wimmelbilder_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_wimmelbilder_updated_at
  before update on public.wimmelbilder
  for each row
  execute function public.update_wimmelbilder_updated_at();

-- NOTE: Realtime publication is NOT captured by declarative diff.
-- A manual migration is required for:
--   ALTER PUBLICATION supabase_realtime ADD TABLE wimmelbilder;
