import { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session, SupabaseClient } from '@supabase/supabase-js';
import posthog from '@/posthog';
import { useSupabase } from './SupabaseContext';
import { isAnonymousUser } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAnonymous: boolean;
  // Email auth methods
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  // OAuth methods
  signInWithGoogle: () => Promise<void>;
  // Anonymous auth method
  signInAnonymously: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Set up auth state listener FIRST (Supabase recommended pattern).
    // The INITIAL_SESSION event fires once with the current session,
    // replacing the need for a separate getSession() call.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return;

        console.log('Auth state changed:', {
          event,
          hasSession: !!session,
          userId: session?.user?.id,
          isAnonymous: session?.user?.is_anonymous,
        });

        if (event === 'INITIAL_SESSION') {
          if (session) {
            setSession(session);
            setUser(session.user);
          } else {
            // No existing session — auto-sign in anonymously
            console.log('No session found, signing in anonymously...');
            try {
              const { data, error } = await supabase.auth.signInAnonymously();
              if (error) {
                console.error('Anonymous sign-in failed:', error);
              } else if (!cancelled && data.session) {
                console.log('Anonymous sign-in successful:', data.user?.id);
                setSession(data.session);
                setUser(data.user);
              }
            } catch (err) {
              console.error('Anonymous sign-in error:', err);
            }
          }
          if (!cancelled) setLoading(false);
          return;
        }

        // Handle all other auth events (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.)
        setSession(session);
        setUser(session?.user ?? null);

        // Sync PostHog identity with Supabase auth state
        if (event === 'SIGNED_OUT') {
          posthog.reset();
        } else if (session?.user && !session.user.is_anonymous) {
          posthog.identify(session.user.id, { email: session.user.email });
        }
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Helper to ensure Supabase is available for auth operations
  const requireSupabase = (): SupabaseClient => {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }
    return supabase;
  };

  // Email auth methods
  const signIn = async (email: string, password: string) => {
    const client = requireSupabase();
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const client = requireSupabase();
    const { error } = await client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/verify-email?email=${encodeURIComponent(email)}`
      }
    });
    if (error) throw error;
  };

  const signOutUser = async () => {
    const client = requireSupabase();
    const { error } = await client.auth.signOut();
    if (error) throw error;

    // After sign out, auto sign-in anonymously
    await signInAnonymouslyInternal(client);
  };

  const resetPassword = async (email: string) => {
    const client = requireSupabase();
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  const updatePassword = async (password: string) => {
    const client = requireSupabase();
    const { error } = await client.auth.updateUser({ password });
    if (error) throw error;
  };

  const verifyOtp = async (email: string, token: string) => {
    const client = requireSupabase();
    const { error } = await client.auth.verifyOtp({
      email,
      token,
      type: 'email'
    });
    if (error) throw error;
  };

  const resendVerification = async (email: string) => {
    const client = requireSupabase();
    const { error } = await client.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/verify-email?email=${encodeURIComponent(email)}`
      }
    });
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    const client = requireSupabase();
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  };

  const signInAnonymouslyInternal = async (client: SupabaseClient) => {
    const { data, error } = await client.auth.signInAnonymously();
    if (error) throw error;
    setSession(data.session);
    setUser(data.user);
  };

  const signInAnonymously = async () => {
    const client = requireSupabase();
    await signInAnonymouslyInternal(client);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      isAnonymous: isAnonymousUser(user),
      signIn,
      signUp,
      signOut: signOutUser,
      resetPassword,
      updatePassword,
      verifyOtp,
      resendVerification,
      signInWithGoogle,
      signInAnonymously
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
