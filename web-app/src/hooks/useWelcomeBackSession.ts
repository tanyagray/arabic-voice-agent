import { useCallback, useEffect, useRef, useState } from 'react';
import { createSession } from '@/api/sessions/sessions.api';
import { AppSettings } from '@/lib/app-settings';
import { useSupabase } from '@/context/SupabaseContext';
import type { TranscriptMessage } from '@/api/sessions/sessions.types';

export interface WelcomeBackSessionState {
  ready: boolean;
  error: string | null;
  messages: TranscriptMessage[];
  completed: boolean;
  sendMessage: (text: string) => void;
  isAgentThinking: boolean;
}

export function useWelcomeBackSession(enabled: boolean): WelcomeBackSessionState {
  const supabase = useSupabase();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [completed, setCompleted] = useState(false);
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const pendingSendRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let ws: WebSocket | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const seenMessageIds = new Set<string>();

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (!session?.access_token) {
          setError('Authentication required');
          return;
        }

        const sessionId = await createSession();
        if (cancelled) return;

        const ingest = (m: TranscriptMessage) => {
          if (seenMessageIds.has(m.message_id)) return;
          seenMessageIds.add(m.message_id);
          setMessages((prev) => [...prev, m]);
          if (m.message_source === 'tutor') setIsAgentThinking(false);
        };

        const channelReady = new Promise<void>((resolve) => {
          channel = supabase
            .channel(`welcome_back_transcript:${sessionId}`)
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'transcript_messages',
                filter: `session_id=eq.${sessionId}`,
              },
              (payload) => ingest(payload.new as TranscriptMessage)
            )
            .subscribe((status) => {
              if (status === 'SUBSCRIBED') resolve();
            });
        });
        await channelReady;
        if (cancelled) return;

        const { data: existing } = await supabase
          .from('transcript_messages')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });
        if (cancelled) return;
        (existing ?? []).forEach((m) => ingest(m as TranscriptMessage));

        const wsBase = AppSettings.apiUrl.replace(/^http/, 'ws');
        const url = `${wsBase}/welcome-back-session/${sessionId}?token=${encodeURIComponent(session.access_token)}`;
        ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          if (cancelled) return;
          setReady(true);
          if (pendingSendRef.current) {
            ws!.send(pendingSendRef.current);
            pendingSendRef.current = null;
          }
        };

        ws.onmessage = (ev) => {
          if (cancelled) return;
          try {
            const msg = JSON.parse(ev.data) as { kind: string; data: unknown };
            if (msg.kind === 'context') {
              const ctx = msg.data as { welcome_back?: { completed?: boolean } };
              if (ctx.welcome_back?.completed) setCompleted(true);
            } else if (msg.kind === 'error') {
              const d = msg.data as { message: string };
              setError(d.message);
              setIsAgentThinking(false);
            }
          } catch (e) {
            console.warn('[welcome-back] failed to parse ws message', e);
          }
        };

        ws.onerror = () => {
          if (!cancelled) setError('WebSocket error');
        };

        ws.onclose = () => {
          if (!cancelled) setReady(false);
        };
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to start welcome-back session');
        }
      }
    })();

    return () => {
      cancelled = true;
      if (ws) ws.close();
      wsRef.current = null;
      if (channel) supabase.removeChannel(channel);
    };
  }, [enabled, supabase]);

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setIsAgentThinking(true);
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(trimmed);
    } else {
      pendingSendRef.current = trimmed;
    }
  }, []);

  return { ready, error, messages, completed, sendMessage, isAgentThinking };
}
