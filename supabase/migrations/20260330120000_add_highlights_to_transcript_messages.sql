-- Add highlights column to transcript_messages for storing Arabizi word highlights
alter table "public"."transcript_messages"
  add column "highlights" jsonb default '[]'::jsonb;

comment on column "public"."transcript_messages"."highlights" is
  'Array of highlighted Arabizi words: [{word, meaning, start, end}]';
