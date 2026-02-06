/**
 * Hook for subscribing to transcript messages via Supabase Realtime.
 *
 * Fetches initial messages and subscribes to new messages for the active session.
 */

import { useEffect, useRef } from 'react';
import { useSupabaseOptional } from '@/context/SupabaseContext';
import { useStore } from '@/store';
import type { TranscriptMessage } from '@/api/sessions/sessions.types';

export function useTranscriptMessages() {
  const supabase = useSupabaseOptional();
  const activeSessionId = useStore((s) => s.session.activeSessionId);
  const messages = useStore((s) => s.session.messages);
  const setMessages = useStore((s) => s.session.setMessages);
  const addMessage = useStore((s) => s.session.addMessage);

  // Track message IDs we've already seen to avoid duplicates
  const seenMessageIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Skip if Supabase is not configured or no active session
    if (!supabase || !activeSessionId) {
      setMessages([]);
      seenMessageIds.current.clear();
      return;
    }

    // Fetch initial messages for this session
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('transcript_messages')
        .select('*')
        .eq('session_id', activeSessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch transcript messages:', error);
        return;
      }

      if (data) {
        // Track all fetched message IDs
        seenMessageIds.current = new Set(data.map((m) => m.message_id));
        setMessages(data as TranscriptMessage[]);
      }
    };

    fetchMessages();

    // Subscribe to new messages for this session
    const channel = supabase
      .channel(`transcript_messages:${activeSessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transcript_messages',
          filter: `session_id=eq.${activeSessionId}`,
        },
        (payload) => {
          const newMessage = payload.new as TranscriptMessage;

          // Skip if we've already seen this message
          if (seenMessageIds.current.has(newMessage.message_id)) {
            return;
          }

          seenMessageIds.current.add(newMessage.message_id);
          addMessage(newMessage);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, activeSessionId, setMessages, addMessage]);

  // Update seen IDs when messages change (e.g., from optimistic updates)
  useEffect(() => {
    messages.forEach((m) => seenMessageIds.current.add(m.message_id));
  }, [messages]);
}
