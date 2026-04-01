-- Add columns to store all display text variants so users can switch response modes
-- and see existing messages re-rendered in the new mode.
alter table "public"."transcript_messages"
  add column "message_text_scaffolded" text,
  add column "message_text_transliterated" text;
