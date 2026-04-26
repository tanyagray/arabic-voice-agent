/**
 * Hook for subscribing to a lesson proposal group via Supabase Realtime.
 *
 * Fetches all `lessons` rows in the given proposal group and watches for
 * INSERT/UPDATE events on the group so the tile picker can reflect the
 * proposed -> generating -> ready transition without a page refresh.
 */

import { useEffect, useState } from 'react';
import { useSupabase } from '@/context/SupabaseContext';

export type LessonStatus =
  | 'proposed'
  | 'dismissed'
  | 'generating'
  | 'ready'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'archived';

export interface LessonRow {
  id: string;
  proposal_group_id: string;
  created_by: string;
  session_id: string | null;
  title: string;
  blurb: string;
  arabic_preview: string | null;
  format: string;
  generation_hints: Record<string, unknown>;
  content_table: string | null;
  content_id: string | null;
  status: LessonStatus;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface UseLessonProposalGroupResult {
  lessons: LessonRow[];
  loading: boolean;
  error: string | null;
}

export function useLessonProposalGroup(
  proposalGroupId: string | undefined,
): UseLessonProposalGroupResult {
  const supabase = useSupabase();
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!proposalGroupId) {
      setLessons([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchInitial = async () => {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('lessons')
        .select('*')
        .eq('proposal_group_id', proposalGroupId)
        .order('created_at', { ascending: true });

      if (cancelled) return;
      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }
      setLessons((data ?? []) as LessonRow[]);
      setLoading(false);
    };

    fetchInitial();

    const channel = supabase
      .channel(`lessons:group:${proposalGroupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lessons',
          filter: `proposal_group_id=eq.${proposalGroupId}`,
        },
        (payload) => {
          if (cancelled) return;
          if (payload.eventType === 'INSERT') {
            const row = payload.new as LessonRow;
            setLessons((prev) =>
              prev.some((l) => l.id === row.id) ? prev : [...prev, row],
            );
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new as LessonRow;
            setLessons((prev) => prev.map((l) => (l.id === row.id ? row : l)));
          } else if (payload.eventType === 'DELETE') {
            const row = payload.old as { id: string };
            setLessons((prev) => prev.filter((l) => l.id !== row.id));
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [supabase, proposalGroupId]);

  return { lessons, loading, error };
}
