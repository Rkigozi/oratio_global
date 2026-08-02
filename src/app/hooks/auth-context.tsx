import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { logError } from '../../lib/logger';
import { captureEvent } from '../../lib/analytics';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  profile: { username: string; display_name: string } | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signInWithGoogle: (redirectPath?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<string | null>;
  updatePassword: (password: string) => Promise<string | null>;
  needsEmailVerification: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  loading: true,
  signUp: () => Promise.resolve(null),
  signIn: () => Promise.resolve(null),
  signInWithGoogle: () => Promise.resolve(),
  signOut: () => Promise.resolve(),
  resetPassword: () => Promise.resolve(null),
  updatePassword: () => Promise.resolve(null),
  needsEmailVerification: false,
});

async function getSupabaseClient() {
  const { supabase } = await import('../services/supabase');
  return supabase;
}

function getOAuthRedirectUrl(path = '/feed') {
  const safePath = path.startsWith('/') && !path.startsWith('//') ? path : '/feed';
  return `${window.location.origin}${safePath}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ username: string; display_name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);

  const fetchProfile = useCallback(async (uid: string) => {
    const supabase = await getSupabaseClient();
    const { data } = await supabase
      .from('profiles')
      .select('username, display_name')
      .eq('id', uid)
      .single();
    if (data) setProfile(data);
  }, []);

  useEffect(() => {
    let active = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const initAuth = async () => {
      const supabase = await getSupabaseClient();
      if (!active) return;

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user && active) {
          setUser(session.user);
          void fetchProfile(session.user.id);
        }
      } catch {
        // Network/config failure — don't leave the app stuck on a loading state.
      } finally {
        if (active) setLoading(false);
      }

      if (!active) return;

      const authState = supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
          setUser(session.user);
          if (event === 'PASSWORD_RECOVERY') {
            // User landed from a password reset email — don't fetch profile yet
            return;
          }
          void fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
      });

      subscription = authState.data.subscription;
    };

    void initAuth();

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, [fetchProfile]);

  useEffect(() => {
    if (!user?.id) return;

    const handleProfileUpdated = () => {
      void fetchProfile(user.id);
    };

    window.addEventListener('oratio-profile-updated', handleProfileUpdated);
    return () => {
      window.removeEventListener('oratio-profile-updated', handleProfileUpdated);
    };
  }, [fetchProfile, user?.id]);

  const signUp = async (
    email: string,
    password: string,
    username: string
  ): Promise<string | null> => {
    const supabase = await getSupabaseClient();
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (error) return error.message;
    captureEvent('user_signed_up', { method: 'email' });
    // If user needs email confirmation, set the flag
    if (data?.user?.identities?.length === 0 || data?.user?.email_confirmed_at === null) {
      setNeedsEmailVerification(true);
    }
    return null;
  };

  const signIn = async (email: string, password: string): Promise<string | null> => {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) captureEvent('user_signed_in', { method: 'email' });
    return error?.message || null;
  };

  const signInWithGoogle = async (redirectPath?: string) => {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: getOAuthRedirectUrl(redirectPath) },
    });
    if (error) logError('google sign-in', error);
    else captureEvent('user_signed_in', { method: 'google' });
  };

  const signOut = async () => {
    const supabase = await getSupabaseClient();
    await supabase.auth.signOut();
    captureEvent('user_signed_out');
    setUser(null);
    setProfile(null);
  };

  const resetPassword = async (email: string): Promise<string | null> => {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    if (!error) captureEvent('password_reset_requested');
    return error?.message || null;
  };

  const updatePassword = async (password: string): Promise<string | null> => {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) captureEvent('password_updated');
    return error?.message || null;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        resetPassword,
        updatePassword,
        needsEmailVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
