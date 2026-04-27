-- Refine the lessons table introduced in 20260427120000.
--
-- Lessons are now pure objective definitions: title + objective text only.
-- Activities (flashcards, wimmelbilder, etc.) are learning tools the tutor
-- deploys within a lesson session — not pre-linked on the lesson row itself.
-- Level and Arabic preview are UI chrome, not lesson properties.

ALTER TABLE public.lessons DROP CONSTRAINT IF EXISTS lessons_content_pair_xor;
DROP INDEX IF EXISTS public.idx_lessons_content;

ALTER TABLE public.lessons
  DROP COLUMN IF EXISTS content_table,
  DROP COLUMN IF EXISTS content_id,
  DROP COLUMN IF EXISTS format,
  DROP COLUMN IF EXISTS generation_hints,
  DROP COLUMN IF EXISTS arabic_preview;

ALTER TABLE public.lessons RENAME COLUMN blurb TO objective;

DROP TABLE IF EXISTS public.lesson_formats;
