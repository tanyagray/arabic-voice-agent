-- Add cover image path to flashcard_sets
ALTER TABLE public.flashcard_sets
  ADD COLUMN cover_image_path text;
