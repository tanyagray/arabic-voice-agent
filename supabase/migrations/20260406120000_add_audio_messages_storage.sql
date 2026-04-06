-- Create storage bucket for audio messages (public, no signed URLs needed)
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-messages', 'audio-messages', true);

-- Storage RLS: authenticated users can download audio messages
CREATE POLICY "Authenticated users can download audio messages"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'audio-messages');

-- Storage RLS: service role can manage all audio message files
CREATE POLICY "Service role can manage audio message files"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'audio-messages')
  WITH CHECK (bucket_id = 'audio-messages');
