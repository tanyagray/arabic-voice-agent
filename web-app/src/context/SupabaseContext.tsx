import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Center, Text, VStack, Button } from '@chakra-ui/react';
import { AppSettings } from '@/lib/app-settings';
import { initPostHog } from '@/posthog';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface SupabaseContextType {
  client: SupabaseClient | null;
  isConfigured: boolean;
  loading: boolean;
  error: string | null;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SupabaseContextType>({
    client: null,
    isConfigured: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    AppSettings.init()
      .then((settings) => {
        initPostHog();
        setState({ client: settings.supabase, isConfigured: true, loading: false, error: null });
      })
      .catch((err) => {
        console.error('Failed to load config:', err);
        setState({ client: null, isConfigured: false, loading: false, error: err.message });
      });
  }, []);

  if (state.loading) {
    return <LoadingSpinner />;
  }

  if (state.error) {
    return (
      <Center minH="100vh">
        <VStack gap={4}>
          <Text color="gray.600">Failed to load app configuration.</Text>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </VStack>
      </Center>
    );
  }

  return (
    <SupabaseContext.Provider value={state}>
      {children}
    </SupabaseContext.Provider>
  );
}

/**
 * Hook to get the Supabase client.
 * Throws if Supabase is not configured or not within provider.
 */
export function useSupabase(): SupabaseClient {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  if (context.client === null) {
    throw new Error('Supabase is not configured. Config may still be loading.');
  }
  return context.client;
}

/**
 * Hook to optionally get the Supabase client.
 * Returns null if Supabase is not configured or still loading.
 */
export function useSupabaseOptional(): SupabaseClient | null {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabaseOptional must be used within a SupabaseProvider');
  }
  return context.client;
}

/**
 * Hook to check if Supabase is configured.
 */
export function useSupabaseConfigured(): boolean {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabaseConfigured must be used within a SupabaseProvider');
  }
  return context.isConfigured;
}

/**
 * Hook to get the loading/error state of config fetching.
 */
export function useSupabaseStatus(): { loading: boolean; error: string | null } {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabaseStatus must be used within a SupabaseProvider');
  }
  return { loading: context.loading, error: context.error };
}
