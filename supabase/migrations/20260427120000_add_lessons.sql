-- Lookup of lesson formats and the table + handler each one is wired to.
-- Seeded with 'flashcards' (the only format wired end-to-end in this round);
-- new formats slot in by adding a row + a generator module.
CREATE TABLE public.lesson_formats (
  slug              text PRIMARY KEY,
  display_name      text NOT NULL,
  content_table     text NOT NULL,
  generator_handler text NOT NULL,
  enabled           boolean NOT NULL DEFAULT true,
  created_at        timestamp with time zone NOT NULL DEFAULT now()
);

INSERT INTO public.lesson_formats (slug, display_name, content_table, generator_handler) VALUES
  ('flashcards', 'Flashcards', 'flashcard_sets', 'agent.tutor.tools.generators.flashcards.generate');

-- Umbrella table: one row per proposed (and possibly generated) lesson.
-- A "proposal group" is the set of rows sharing a proposal_group_id, which is
-- everything emitted from a single propose_lessons tool call.
CREATE TABLE public.lessons (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_group_id   uuid NOT NULL,
  created_by          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id          text REFERENCES public.agent_sessions(session_id) ON DELETE SET NULL,

  title               text NOT NULL,
  blurb               text NOT NULL,
  arabic_preview      text,

  format              text NOT NULL REFERENCES public.lesson_formats(slug),
  generation_hints    jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Polymorphic content link, populated when the lesson reaches `ready`.
  content_table       text,
  content_id          uuid,

  status              text NOT NULL DEFAULT 'proposed'
                       CHECK (status IN ('proposed','dismissed','generating','ready','in_progress','completed','failed','archived')),
  error               text,

  started_at          timestamp with time zone,
  completed_at        timestamp with time zone,
  created_at          timestamp with time zone NOT NULL DEFAULT now(),
  updated_at          timestamp with time zone NOT NULL DEFAULT now(),

  CONSTRAINT lessons_content_pair_xor
    CHECK ((content_table IS NULL AND content_id IS NULL)
        OR (content_table IS NOT NULL AND content_id IS NOT NULL))
);

CREATE INDEX idx_lessons_creator ON public.lessons(created_by);
CREATE INDEX idx_lessons_group   ON public.lessons(proposal_group_id);
CREATE INDEX idx_lessons_status  ON public.lessons(status);
CREATE INDEX idx_lessons_content ON public.lessons(content_table, content_id);

-- Permissions
GRANT ALL ON public.lessons TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO authenticated;

GRANT ALL ON public.lesson_formats TO service_role;
GRANT SELECT ON public.lesson_formats TO authenticated;
GRANT SELECT ON public.lesson_formats TO anon;

-- RLS
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_formats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their own lessons"
  ON public.lessons
  FOR ALL
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Service role has full access to lessons"
  ON public.lessons
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can read lesson formats"
  ON public.lesson_formats
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Service role has full access to lesson formats"
  ON public.lesson_formats
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Auto-update updated_at on lessons
CREATE OR REPLACE FUNCTION public.update_lessons_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lessons_updated_at();

-- Realtime: clients subscribe to lessons rows by proposal_group_id for the
-- proposal-tile picker, and to individual rows to track generation progress.
ALTER PUBLICATION supabase_realtime ADD TABLE lessons;
