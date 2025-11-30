create schema if not exists config;

-- Schema-level permissions
-- Revoke default public access
revoke all on schema config from public;

-- Grant usage to anonymous users, authenticated users and service role
grant usage on schema config to anon;
grant usage on schema config to authenticated;
grant usage on schema config to service_role;

-- Set default privileges for all future tables in the config schema
-- Anonymous and authenticated users can read
alter default privileges in schema config
  grant select on tables to anon, authenticated;

-- Service role has full access
alter default privileges in schema config
  grant all on tables to service_role;

-- Ensure public has no default access
alter default privileges in schema config
  revoke all on tables from public;