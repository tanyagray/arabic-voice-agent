-- Enable Supabase Realtime for transcript_messages table
-- This allows the frontend to subscribe to INSERT/UPDATE/DELETE events

alter publication supabase_realtime add table transcript_messages;
