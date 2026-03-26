import { AppSettings } from './app-settings'

/**
 * Returns the Supabase client created during AppSettings.init().
 * Must only be called after ConfigProvider has finished loading.
 */
export function getSupabase() {
  return AppSettings.get().supabase
}
