import { createClient, SupabaseClient } from '@supabase/supabase-js'

let singletonClient: SupabaseClient | null = null;

/**
 * Creates a Supabase client with the given URL and key.
 */
export function createSupabaseClient(url: string, publishableKey: string): SupabaseClient {
  return createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

/**
 * Sets the singleton Supabase client (called once after config is fetched).
 */
export function setSupabaseClient(client: SupabaseClient): void {
  singletonClient = client;
}

/**
 * Returns the singleton Supabase client, or null if config hasn't loaded yet.
 * Use this for non-React code (e.g., API interceptors).
 */
export function getSupabaseClient(): SupabaseClient | null {
  return singletonClient;
}
