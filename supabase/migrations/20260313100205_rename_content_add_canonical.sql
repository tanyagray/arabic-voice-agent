-- Rename message_content to message_text (display text)
-- Add message_text_canonical for full Arabic with harakaat (TTS, source of truth)
alter table "public"."transcript_messages" rename column "message_content" to "message_text";

alter table "public"."transcript_messages" add column "message_text_canonical" text;
