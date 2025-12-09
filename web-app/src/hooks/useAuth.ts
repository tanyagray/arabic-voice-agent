/**
 * @deprecated This hook is deprecated. Use AuthContext from '@/contexts/AuthContext' instead.
 *
 * Migration guide:
 * - Replace: import { useAuth } from '@/hooks/useAuth'
 * - With: import { useAuth } from '@/contexts/AuthContext'
 *
 * The new hook provides additional email auth methods while maintaining
 * backward compatibility with existing properties (user, session, isLoading, isAnonymous).
 */
import { useEffect, useState } from 'react'
import { signInAnonymously, onAuthStateChange, getSession, isAnonymousUser, type UserSession } from '../lib/auth'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [session, setSession] = useState<UserSession | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Check for existing session
    getSession()
      .then((session) => {
        if (session) {
          console.log('Found existing Supabase session:', session.user.id);
        }
        setSession(session)
        setUser(session?.user ?? null)

        // If no session exists, sign in anonymously
        if (!session) {
          console.log('No session found, signing in anonymously...');
          return signInAnonymously()
        }
      })
      .then((data) => {
        if (data) {
          console.log('Anonymous sign-in successful:', data.user?.id);
          setSession(data.session)
          setUser(data.user)
        }
      })
      .catch((err) => {
        console.error('Auth initialization error:', err)
        setError(err)
      })
      .finally(() => {
        setIsLoading(false)
      })

    // Listen for auth state changes
    const subscription = onAuthStateChange((session) => {
      console.log('Auth state changed. User:', session?.user?.id, 'Is Anonymous:', session?.user?.is_anonymous);
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return {
    session,
    user,
    isLoading,
    error,
    isAnonymous: isAnonymousUser(user),
  }
}
