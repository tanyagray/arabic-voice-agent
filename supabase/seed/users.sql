-- Seed admin user for local and preview deployments
-- Password: admin (bcrypt hash)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change,
  email_change_token_new,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'tanyagray.nz@gmail.com',
  crypt('admin', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  '',
  '',
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  false
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'tanyagray.nz@gmail.com'
);

-- Grant admin access (profile row is auto-created by the trigger)
UPDATE public.profiles
SET is_admin = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'tanyagray.nz@gmail.com');

-- Seed test users for local and preview deployments
-- freeloader@mishmish.io — free plan, password: password
-- pro@mishmish.io — pro plan, password: password
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change,
  email_change_token_new,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  email,
  crypt('password', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  '',
  '',
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  false
FROM (VALUES ('freeloader@mishmish.io'), ('pro@mishmish.io')) AS v(email)
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.email = v.email
);

-- Upgrade pro@mishmish.io to the pro plan (freeloader keeps the default 'free')
UPDATE public.profiles
SET plan = 'pro',
    subscription_status = 'active',
    current_period_end = now() + interval '30 days'
WHERE id = (SELECT id FROM auth.users WHERE email = 'pro@mishmish.io');
