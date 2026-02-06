import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/**
 * Creates a Supabase client if env vars are present.
 * Returns null if env vars are missing (e.g., in Storybook without config).
 */
export function createSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabasePublishableKey) {
    return null;
  }

  return createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

/**
 * Gets a Supabase client, throwing if not configured.
 * Use this for non-React code that requires Supabase.
 */
export function getSupabaseClient(): SupabaseClient {
  const client = createSupabaseClient();
  if (!client) {
    throw new Error('Missing Supabase environment variables');
  }
  return client;
}

/**
 * Singleton Supabase client for backwards compatibility.
 * May be null if env vars are missing.
 */
export const supabase: SupabaseClient | null = createSupabaseClient();
