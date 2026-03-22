create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  updated_at timestamp with time zone not null default now(),
  is_admin boolean not null default false
);

-- Table-level permissions
grant all on public.profiles to service_role;
grant select on public.profiles to authenticated;

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- RLS Policies
-- Authenticated users can only read their own profile
create policy "Users can read own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
