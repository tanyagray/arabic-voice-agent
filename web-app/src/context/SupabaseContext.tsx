import { createContext, useContext, useMemo } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseClient } from '@/lib/supabase';

interface SupabaseContextType {
  client: SupabaseClient | null;
  isConfigured: boolean;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo(() => {
    const client = createSupabaseClient();
    return {
      client,
      isConfigured: client !== null,
    };
  }, []);

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
}

/**
 * Hook to get the Supabase client.
 * Throws if Supabase is not configured (env vars missing) or not within provider.
 * Use this for components that require Supabase.
 */
export function useSupabase(): SupabaseClient {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  if (context.client === null) {
    throw new Error('Supabase is not configured. Missing environment variables.');
  }
  return context.client;
}

/**
 * Hook to optionally get the Supabase client.
 * Returns null if Supabase is not configured.
 * Use this for components that can function without Supabase.
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
 * Returns true if env vars are present and client was created.
 */
export function useSupabaseConfigured(): boolean {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabaseConfigured must be used within a SupabaseProvider');
  }
  return context.isConfigured;
}
