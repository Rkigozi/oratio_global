import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { captureEvent } from '../../lib/analytics';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  profile: { username: string; display_name: string } | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
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
  signOut: () => Promise.resolve(),
  resetPassword: () => Promise.resolve(null),
  updatePassword: () => Promise.resolve(null),
  needsEmailVerification: false,
});

const AUTH_STARTUP_TIMEOUT_MS = 8_000;

async function withStartupTimeout<T>(promise: Promise<T>): Promise<T | null> {
  let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timeoutId = globalThis.setTimeout(() => resolve(null), AUTH_STARTUP_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId !== undefined) globalThis.clearTimeout(timeoutId);
  }
}

async function getSupabaseClient() {
  const { supabase } = await import('../services/supabase');
  return supabase;
}

export function AuthProvider({
  children,
  defer = false,
}: {
  children: ReactNode;
  defer?: boolean;
}) {
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
    let idleRequestId: number | undefined;
    let timeoutId: number | undefined;

    const initAuth = async () => {
      try {
        const supabase = await withStartupTimeout(getSupabaseClient());
        if (!supabase || !active) return;

        const sessionResult = await withStartupTimeout(supabase.auth.getSession());
        if (sessionResult?.data.session?.user && active) {
          setUser(sessionResult.data.session.user);
          void fetchProfile(sessionResult.data.session.user.id);
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
      } catch {
        // Network/config failure — don't leave the app stuck on a loading state.
      } finally {
        if (active) setLoading(false);
      }
    };

    if (defer) {
      // Public screens (landing, login, legal) don't need the session to
      // paint. Wait until after first paint before downloading the Supabase
      // client so it never competes with the first screen.
      const idleWindow = window as Window & {
        requestIdleCallback?: (
          callback: () => void,
          options?: { timeout?: number }
        ) => number;
      };
      if (typeof idleWindow.requestIdleCallback === 'function') {
        idleRequestId = idleWindow.requestIdleCallback(
          () => {
            if (active) void initAuth();
          },
          { timeout: 3000 }
        );
      } else {
        timeoutId = window.setTimeout(() => {
          if (active) void initAuth();
        }, 1200);
      }
    } else {
      void initAuth();
    }

    return () => {
      active = false;
      subscription?.unsubscribe();
      if (idleRequestId !== undefined) {
        const idleWindow = window as Window & { cancelIdleCallback?: (id: number) => void };
        idleWindow.cancelIdleCallback?.(idleRequestId);
      }
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [fetchProfile, defer]);

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
