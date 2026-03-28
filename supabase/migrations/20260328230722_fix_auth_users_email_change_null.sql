-- Fix NULL token/change columns in auth.users.
-- Newer versions of GoTrue cannot scan NULL values for these columns and
-- return "Database error querying schema" on sign-in. Backfill to empty
-- string and set defaults so future rows are never NULL.

UPDATE auth.users SET email_change           = '' WHERE email_change           IS NULL;
UPDATE auth.users SET email_change_token_new = '' WHERE email_change_token_new IS NULL;
UPDATE auth.users SET confirmation_token     = '' WHERE confirmation_token     IS NULL;
UPDATE auth.users SET recovery_token         = '' WHERE recovery_token         IS NULL;
