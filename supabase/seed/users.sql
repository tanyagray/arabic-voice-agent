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
