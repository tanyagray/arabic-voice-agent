-- Enable RLS on profiles and allow authenticated users to read their own row.
-- Without this policy, anon-key queries (e.g. admin-app login check) return
-- no rows, blocking admin access even when is_admin = true.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);
