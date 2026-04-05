/**
 * Hook for fetching a wimmelbilder record and subscribing to realtime updates.
 */

import { useEffect, useState } from 'react';
import { useSupabase } from '@/context/SupabaseContext';

export interface WimmelbilderObject {
  box_2d?: [number, number, number, number];
  bbox_2d?: [number, number, number, number];
  bbox?: [number, number, number, number];
  label?: string;
  meta: string;
}

/** Get the bounding box from an object, handling key name variations from Gemini. */
export function getBox(obj: WimmelbilderObject): [number, number, number, number] | null {
  return obj.box_2d ?? obj.bbox_2d ?? obj.bbox ?? null;
}

export interface Wimmelbild {
  id: string;
  description: string;
  status: 'pending' | 'generating_image' | 'detecting_objects' | 'complete' | 'failed';
  image_path: string | null;
  image_width: number | null;
  image_height: number | null;
  objects: WimmelbilderObject[] | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

interface UseWimmelbildResult {
  data: Wimmelbild | null;
  imageUrl: string | null;
  loading: boolean;
  error: string | null;
}

export function useWimmelbild(wimmelbildId: string | undefined): UseWimmelbildResult {
  const supabase = useSupabase();
  const [data, setData] = useState<Wimmelbild | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial data
  useEffect(() => {
    if (!wimmelbildId) {
      setLoading(false);
      setError('No wimmelbilder ID provided');
      return;
    }

    const fetchData = async () => {
      const { data: row, error: fetchError } = await supabase
        .from('wimmelbilder')
        .select('*')
        .eq('id', wimmelbildId)
        .single();

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      setData(row as Wimmelbild);
      setLoading(false);
    };

    fetchData();

    // Subscribe to realtime updates for this specific row
    const channel = supabase
      .channel(`wimmelbilder:${wimmelbildId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wimmelbilder',
          filter: `id=eq.${wimmelbildId}`,
        },
        (payload) => {
          setData(payload.new as Wimmelbild);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, wimmelbildId]);

  // Generate signed URL when image_path is available
  useEffect(() => {
    if (!data?.image_path) {
      setImageUrl(null);
      return;
    }

    const getSignedUrl = async () => {
      const { data: urlData, error: urlError } = await supabase.storage
        .from('wimmelbilder')
        .createSignedUrl(data.image_path!, 3600);

      if (urlError) {
        console.error('Failed to create signed URL:', urlError);
        return;
      }

      setImageUrl(urlData.signedUrl);
    };

    getSignedUrl();
  }, [supabase, data?.image_path]);

  return { data, imageUrl, loading, error };
}
