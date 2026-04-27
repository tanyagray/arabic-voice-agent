import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSupabase } from '@/context/SupabaseContext';

export interface UserProfile {
  name: string | null;
  onboardingCompleted: boolean;
}

export function useUserProfile(): { profile: UserProfile | null; loading: boolean } {
  const { user } = useAuth();
  const supabase = useSupabase();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    supabase
      .from('profiles')
      .select('name, onboarding_completed_at')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setProfile({
          name: data?.name ?? null,
          onboardingCompleted: !!data?.onboarding_completed_at,
        });
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user, supabase]);

  return { profile, loading };
}
