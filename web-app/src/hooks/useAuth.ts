import { useEffect, useState } from 'react'
import { signInAnonymously, onAuthStateChange, getSession, isAnonymousUser } from '../lib/auth'
import type { Session, User } from '@supabase/supabase-js'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Check for existing session
    getSession()
      .then((session) => {
        setSession(session)
        setUser(session?.user ?? null)

        // If no session exists, sign in anonymously
        if (!session) {
          return signInAnonymously()
        }
      })
      .then((data) => {
        if (data) {
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
