import { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session, SupabaseClient } from '@supabase/supabase-js';
import { useSupabaseOptional } from './SupabaseContext';
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
  // Anonymous auth method
  signInAnonymously: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useSupabaseOptional();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If Supabase is not configured, skip auth initialization
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session loaded:', {
        hasSession: !!session,
        userId: session?.user?.id,
        isAnonymous: session?.user?.is_anonymous
      });
      setSession(session);
      setUser(session?.user ?? null);

      // DUAL AUTH: If no session exists, auto-sign in anonymously
      if (!session) {
        console.log('No session found, signing in anonymously...');
        return supabase.auth.signInAnonymously().then(({ data, error }) => {
          if (error) {
            console.error('Auth initialization error:', error);
            setLoading(false);
            return;
          }
          console.log('Anonymous sign-in successful:', data.user?.id);
          setSession(data.session);
          setUser(data.user);
          setLoading(false);
        });
      }

      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', {
        event: _event,
        hasSession: !!session,
        userId: session?.user?.id,
        isAnonymous: session?.user?.is_anonymous
      });
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
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
