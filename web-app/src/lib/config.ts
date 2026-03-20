/**
 * Runtime configuration fetched from the backend /config endpoint.
 *
 * The only build-time env var is VITE_API_URL (the backend address).
 * Everything else comes from the backend at startup.
 */

export interface AppConfig {
  apiUrl: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

let cachedConfig: AppConfig | null = null;

/**
 * Fetches runtime config from the backend. Caches the result.
 * Throws if the fetch fails or returns invalid data.
 */
export async function fetchConfig(): Promise<AppConfig> {
  if (cachedConfig) return cachedConfig;

  const res = await fetch(`${API_URL}/config`);
  if (!res.ok) {
    throw new Error(`Failed to fetch config: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  cachedConfig = {
    apiUrl: API_URL,
    supabaseUrl: data.supabase_url,
    supabasePublishableKey: data.supabase_publishable_key,
  };

  return cachedConfig;
}

/**
 * Returns the cached config synchronously.
 * Throws if fetchConfig() hasn't been called yet.
 */
export function getConfig(): AppConfig {
  if (!cachedConfig) {
    throw new Error('Config not loaded yet. Call fetchConfig() first.');
  }
  return cachedConfig;
}

/**
 * Returns the API URL (available immediately from env).
 */
export function getApiUrl(): string {
  return API_URL;
}
