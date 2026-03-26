/**
 * AppSettings — singleton that holds all runtime configuration.
 *
 * Fetches Supabase credentials from the backend /config endpoint at startup
 * so they don't need to be baked in at build time.
 *
 * Usage:
 *   await AppSettings.init();          // call once at app startup
 *   const settings = AppSettings.get(); // synchronous access everywhere else
 */

import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface AppConfig {
  apiUrl: string
  supabaseUrl: string
  supabasePublishableKey: string
  supabase: SupabaseClient
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

let instance: AppConfig | null = null

export const AppSettings = {
  /**
   * Fetch config from the backend and initialise the Supabase client.
   * Safe to call multiple times — returns the cached instance after the first call.
   */
  async init(): Promise<AppConfig> {
    if (instance) return instance

    const res = await fetch(`${API_URL}/config`)
    if (!res.ok) {
      throw new Error(`Failed to fetch config: ${res.status} ${res.statusText}`)
    }

    const data = await res.json()

    const supabase = createClient(data.supabase_url, data.supabase_publishable_key, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })

    instance = {
      apiUrl: API_URL,
      supabaseUrl: data.supabase_url,
      supabasePublishableKey: data.supabase_publishable_key,
      supabase,
    }

    return instance
  },

  /**
   * Synchronous access to settings. Throws if init() hasn't completed.
   */
  get(): AppConfig {
    if (!instance) {
      throw new Error('AppSettings not initialised. Call AppSettings.init() first.')
    }
    return instance
  },

  /**
   * Returns the API URL (available immediately, before init).
   */
  get apiUrl(): string {
    return API_URL
  },
} as const
