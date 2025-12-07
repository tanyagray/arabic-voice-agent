import { supabase } from './supabase'
import type { User, Session } from '@supabase/supabase-js'

// Alias Session as UserSession to distinguish from AgentSession
export type UserSession = Session;

export interface AuthState {
  user: User | null
  session: UserSession | null
  isLoading: boolean
}

/**
 * Sign in anonymously
 * Creates a temporary anonymous user session
 */
export async function signInAnonymously() {
  const { data, error } = await supabase.auth.signInAnonymously()

  if (error) {
    console.error('Error signing in anonymously:', error)
    throw error
  }

  return data
}

/**
 * Get the current session
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    console.error('Error getting session:', error)
    throw error
  }

  return data.session
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('Error signing out:', error)
    throw error
  }
}

/**
 * Listen to authentication state changes
 */
export function onAuthStateChange(callback: (session: Session | null) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })

  return subscription
}

/**
 * Check if the current user is anonymous
 */
export function isAnonymousUser(user: User | null): boolean {
  return user?.is_anonymous === true
}
