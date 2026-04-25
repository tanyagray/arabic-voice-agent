/**
 * useOnboardingSession — drives the onboarding flow.
 *
 * Opens a WebSocket to `/onboarding-session/{id}` for lightweight signals
 * (collected data, completion, errors, and to send user input). Transcript
 * messages themselves are delivered via Supabase Realtime on
 * `transcript_messages`, matching the existing chat pattern.
 *
 * The backend onboarding agent is goal-driven (no step machine): it gathers
 * what it needs at its own pace, then calls `generate_lessons` to render the
 * tile picker and mark onboarding complete.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createSession } from '@/api/sessions/sessions.api';
import { AppSettings } from '@/lib/app-settings';
import { useSupabase } from '@/context/SupabaseContext';
import type { TranscriptMessage } from '@/api/sessions/sessions.types';

export interface OnboardingSessionState {
  ready: boolean;
  error: string | null;
  messages: TranscriptMessage[];
  collected: Record<string, unknown>;
  completed: boolean;
  sendMessage: (text: string) => void;
  isAgentThinking: boolean;
}

export function useOnboardingSession(): OnboardingSessionState {
  const supabase = useSupabase();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [collected, setCollected] = useState<Record<string, unknown>>({});
  const [completed, setCompleted] = useState(false);
  const [isAgentThinking, setIsAgentThinking] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
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

        // Subscribe first, then open the WS so we don't miss the opener
        // bubbles the backend emits as soon as the connection is accepted.
        const channelReady = new Promise<void>((resolve) => {
          channel = supabase
            .channel(`onboarding_transcript:${sessionId}`)
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

        // Backstop: fetch any rows that landed between session creation and
        // the subscription becoming live.
        const { data: existing } = await supabase
          .from('transcript_messages')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });
        if (cancelled) return;
        (existing ?? []).forEach((m) => ingest(m as TranscriptMessage));

        const wsBase = AppSettings.apiUrl.replace(/^http/, 'ws');
        const url = `${wsBase}/onboarding-session/${sessionId}?token=${encodeURIComponent(session.access_token)}`;
        ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          if (cancelled) return;
          setReady(true);
        };

        ws.onmessage = (ev) => {
          if (cancelled) return;
          try {
            const msg = JSON.parse(ev.data) as { kind: string; data: unknown };
            if (msg.kind === 'context') {
              const ctx = msg.data as {
                onboarding?: {
                  collected?: Record<string, unknown>;
                  completed?: boolean;
                };
              };
              if (ctx.onboarding) {
                if (ctx.onboarding.collected) setCollected(ctx.onboarding.collected);
                if (ctx.onboarding.completed) setCompleted(true);
              }
            } else if (msg.kind === 'error') {
              const d = msg.data as { message: string };
              setError(d.message);
              setIsAgentThinking(false);
            }
          } catch (e) {
            console.warn('[onboarding] failed to parse ws message', e);
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
          setError(e instanceof Error ? e.message : 'Failed to start onboarding');
        }
      }
    })();

    return () => {
      cancelled = true;
      if (ws) ws.close();
      wsRef.current = null;
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase]);

  const sendMessage = useCallback((text: string) => {
    const ws = wsRef.current;
    const trimmed = text.trim();
    if (!ws || ws.readyState !== WebSocket.OPEN || !trimmed) return;
    setIsAgentThinking(true);
    ws.send(trimmed);
  }, []);

  return {
    ready,
    error,
    messages,
    collected,
    completed,
    sendMessage,
    isAgentThinking,
  };
}
