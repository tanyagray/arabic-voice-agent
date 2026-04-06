-- Create wimmelbilder table
CREATE TABLE public.wimmelbilder (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  image_path text,
  image_width integer,
  image_height integer,
  objects jsonb,
  error text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_wimmelbilder_created_by ON public.wimmelbilder(created_by);

-- Table-level permissions
GRANT ALL ON public.wimmelbilder TO service_role;
GRANT SELECT ON public.wimmelbilder TO authenticated;
GRANT SELECT ON public.wimmelbilder TO anon;

-- Enable Row Level Security
ALTER TABLE public.wimmelbilder ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view wimmelbilder"
  ON public.wimmelbilder
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Service role has full access to wimmelbilder"
  ON public.wimmelbilder
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_wimmelbilder_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_wimmelbilder_updated_at
  BEFORE UPDATE ON public.wimmelbilder
  FOR EACH ROW
  EXECUTE FUNCTION public.update_wimmelbilder_updated_at();

-- Enable realtime for wimmelbilder table
ALTER PUBLICATION supabase_realtime ADD TABLE wimmelbilder;

-- Create storage bucket for wimmelbilder images (private, requires auth)
INSERT INTO storage.buckets (id, name, public)
VALUES ('wimmelbilder', 'wimmelbilder', false);

-- Storage RLS: allow authenticated and anonymous users to download images
CREATE POLICY "Authenticated users can download wimmelbilder images"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'wimmelbilder');

CREATE POLICY "Anonymous users can download wimmelbilder images"
  ON storage.objects
  FOR SELECT
  TO anon
  USING (bucket_id = 'wimmelbilder');

-- Storage RLS: service role can manage all wimmelbilder files
CREATE POLICY "Service role can manage wimmelbilder files"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'wimmelbilder')
  WITH CHECK (bucket_id = 'wimmelbilder');
