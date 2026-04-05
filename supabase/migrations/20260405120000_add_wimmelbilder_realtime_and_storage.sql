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
