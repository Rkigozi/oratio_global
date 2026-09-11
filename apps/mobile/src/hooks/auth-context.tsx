import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { AppState, type AppStateStatus } from 'react-native';
import { supabase } from '../services/supabase';

const SESSION_RESTORE_TIMEOUT_MS = 5000;

export type AuthProfile = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
};

interface AuthState {
  user: User | null;
  profile: AuthProfile | null;
  loading: boolean;
  needsEmailVerification: boolean;
  refreshProfile: () => Promise<AuthProfile | null>;
  signUp: (email: string, password: string, username: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<string | null>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  loading: true,
  needsEmailVerification: false,
  refreshProfile: () => Promise.resolve(null),
  signUp: () => Promise.resolve(null),
  signIn: () => Promise.resolve(null),
  signOut: () => Promise.resolve(),
  resetPassword: () => Promise.resolve(null),
});

async function fetchProfile(uid: string) {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_url, bio, location')
      .eq('id', uid)
      .single();
    return (data as AuthProfile | null) ?? null;
  } catch {
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Session restore timed out')), timeoutMs);
    promise.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);

  useEffect(() => {
    let active = true;

    const restore = async () => {
      try {
        const {
          data: { session },
        } = await withTimeout(supabase.auth.getSession(), SESSION_RESTORE_TIMEOUT_MS);
        if (!active) return;
        if (session?.user) {
          setUser(session.user);
          void fetchProfile(session.user.id).then((prof) => {
            if (active && prof) setProfile(prof);
          });
        }
      } catch {
        // Network/config failure — leave the app signed out rather than stuck.
      } finally {
        if (active) setLoading(false);
      }
    };

    void restore();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        void fetchProfile(session.user.id).then((prof) => {
          if (active && prof) setProfile(prof);
        });
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const updateAutoRefresh = (state: AppStateStatus) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    };

    updateAutoRefresh(AppState.currentState);
    const appStateSubscription = AppState.addEventListener('change', updateAutoRefresh);

    return () => {
      appStateSubscription.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return null;
    }

    const nextProfile = await fetchProfile(user.id);
    if (nextProfile) setProfile(nextProfile);
    return nextProfile;
  }, [user]);

  const signUp = useCallback(
    async (email: string, password: string, username: string): Promise<string | null> => {
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      if (error) return error.message;
      if (data?.user?.identities?.length === 0 || data?.user?.email_confirmed_at === null) {
        setNeedsEmailVerification(true);
      }
      return null;
    },
    []
  );

  const signIn = useCallback(async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message || null;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setProfile(null);
    }
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<string | null> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // The reset link opens the web update-password page, matching the web journey.
      redirectTo: 'https://oratiotest.netlify.app/update-password',
    });
    return error?.message || null;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        needsEmailVerification,
        refreshProfile,
        signUp,
        signIn,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
