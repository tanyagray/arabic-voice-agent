/**
 * Hook for fetching a flashcard set and subscribing to realtime updates.
 *
 * Subscribes to both flashcard_sets (set status) and flashcards (card completion)
 * for live progress during generation.
 */

import { useCallback, useEffect, useState } from 'react';
import { useSupabase } from '@/context/SupabaseContext';
import type { FlashcardSet, Flashcard } from '@/api/flashcards/flashcards.types';

interface UseFlashcardSetResult {
  set: FlashcardSet | null;
  loading: boolean;
  error: string | null;
}

export function useFlashcardSet(setId: string | undefined): UseFlashcardSetResult {
  const supabase = useSupabase();
  const [set, setSet] = useState<FlashcardSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generateSignedUrls = useCallback(
    async (cards: Flashcard[]): Promise<Flashcard[]> => {
      const result: Flashcard[] = [];
      for (const card of cards) {
        const updated = { ...card };

        if (card.image_url === undefined && (card as any).image_path) {
          const { data } = await supabase.storage
            .from('flashcards')
            .createSignedUrl((card as any).image_path, 3600);
          updated.image_url = data?.signedUrl ?? null;
        }

        if (card.audio_url === undefined && (card as any).audio_path) {
          const { data } = await supabase.storage
            .from('flashcards')
            .createSignedUrl((card as any).audio_path, 3600);
          updated.audio_url = data?.signedUrl ?? null;
        }

        result.push(updated);
      }
      return result;
    },
    [supabase],
  );

  // Fetch initial data
  useEffect(() => {
    if (!setId) {
      setLoading(false);
      setError('No flashcard set ID provided');
      return;
    }

    const fetchData = async () => {
      // Fetch set
      const { data: setRow, error: fetchSetError } = await supabase
        .from('flashcard_sets')
        .select('*')
        .eq('id', setId)
        .single();

      if (fetchSetError) {
        setError(fetchSetError.message);
        setLoading(false);
        return;
      }

      // Fetch cards
      const { data: cardRows, error: cardsError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('set_id', setId)
        .order('ordinal');

      if (cardsError) {
        setError(cardsError.message);
        setLoading(false);
        return;
      }

      const cards = await generateSignedUrls(cardRows as Flashcard[]);
      setSet({ ...setRow, cards } as FlashcardSet);
      setLoading(false);
    };

    fetchData();

    // Subscribe to set status updates
    const setChannel = supabase
      .channel(`flashcard_sets:${setId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'flashcard_sets',
          filter: `id=eq.${setId}`,
        },
        (payload) => {
          setSet((prev) =>
            prev ? { ...prev, ...payload.new, cards: prev.cards } : null,
          );
        },
      )
      .subscribe();

    // Subscribe to individual card updates
    const cardChannel = supabase
      .channel(`flashcards:${setId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'flashcards',
          filter: `set_id=eq.${setId}`,
        },
        async (payload) => {
          const updatedCard = payload.new as Flashcard;

          // Generate signed URLs for completed cards
          if (updatedCard.status === 'complete') {
            const [withUrls] = await generateSignedUrls([updatedCard]);
            setSet((prev) => {
              if (!prev) return null;
              const cards = prev.cards.map((c) =>
                c.id === withUrls.id ? withUrls : c,
              );
              return { ...prev, cards };
            });
          } else {
            setSet((prev) => {
              if (!prev) return null;
              const cards = prev.cards.map((c) =>
                c.id === updatedCard.id ? { ...c, ...updatedCard } : c,
              );
              return { ...prev, cards };
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(setChannel);
      supabase.removeChannel(cardChannel);
    };
  }, [supabase, setId, generateSignedUrls]);

  return { set, loading, error };
}
