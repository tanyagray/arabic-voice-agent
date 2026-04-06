-- Create flashcard_sets table
CREATE TABLE public.flashcard_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  language text NOT NULL DEFAULT 'ar-AR',
  status text NOT NULL DEFAULT 'pending',
  error text,
  is_public boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_flashcard_sets_created_by ON public.flashcard_sets(created_by);

-- Create flashcards table
CREATE TABLE public.flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES public.flashcard_sets(id) ON DELETE CASCADE,
  ordinal smallint NOT NULL,
  arabic_text text NOT NULL,
  transliteration text NOT NULL,
  english text NOT NULL,
  image_path text,
  audio_path text,
  status text NOT NULL DEFAULT 'pending',
  error text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_flashcards_set_id ON public.flashcards(set_id);

-- Table-level permissions: flashcard_sets
GRANT ALL ON public.flashcard_sets TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcard_sets TO authenticated;
GRANT SELECT ON public.flashcard_sets TO anon;

-- Table-level permissions: flashcards
GRANT ALL ON public.flashcards TO service_role;
GRANT SELECT ON public.flashcards TO authenticated;
GRANT SELECT ON public.flashcards TO anon;

-- Enable Row Level Security
ALTER TABLE public.flashcard_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

-- RLS Policies: flashcard_sets
CREATE POLICY "Owners can manage their own flashcard sets"
  ON public.flashcard_sets
  FOR ALL
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Anyone can view public flashcard sets"
  ON public.flashcard_sets
  FOR SELECT
  TO authenticated, anon
  USING (is_public = true);

CREATE POLICY "Service role has full access to flashcard sets"
  ON public.flashcard_sets
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies: flashcards (inherit from parent set)
CREATE POLICY "Users can view flashcards they own or that are public"
  ON public.flashcards
  FOR SELECT
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM public.flashcard_sets
      WHERE id = flashcards.set_id
      AND (created_by = auth.uid() OR is_public = true)
    )
  );

CREATE POLICY "Service role has full access to flashcards"
  ON public.flashcards
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_flashcard_sets_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_flashcard_sets_updated_at
  BEFORE UPDATE ON public.flashcard_sets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_flashcard_sets_updated_at();

CREATE OR REPLACE FUNCTION public.update_flashcards_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_flashcards_updated_at
  BEFORE UPDATE ON public.flashcards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_flashcards_updated_at();

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE flashcard_sets;
ALTER PUBLICATION supabase_realtime ADD TABLE flashcards;

-- Create storage bucket for flashcard images and audio
INSERT INTO storage.buckets (id, name, public)
VALUES ('flashcards', 'flashcards', false);

-- Storage RLS: allow authenticated and anonymous users to download
CREATE POLICY "Authenticated users can download flashcard files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'flashcards');

CREATE POLICY "Anonymous users can download flashcard files"
  ON storage.objects
  FOR SELECT
  TO anon
  USING (bucket_id = 'flashcards');

-- Storage RLS: service role can manage all flashcard files
CREATE POLICY "Service role can manage flashcard files"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'flashcards')
  WITH CHECK (bucket_id = 'flashcards');
