-- Manual migration: ALTER PUBLICATION is not captured by declarative schema diff
ALTER PUBLICATION supabase_realtime ADD TABLE transcript_messages;
