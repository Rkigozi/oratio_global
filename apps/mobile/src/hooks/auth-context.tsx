import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface AuthState {
  user: User | null;
  profile: { username: string; display_name: string } | null;
  loading: boolean;
  needsEmailVerification: boolean;
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
  signUp: () => Promise.resolve(null),
  signIn: () => Promise.resolve(null),
  signOut: () => Promise.resolve(),
  resetPassword: () => Promise.resolve(null),
});

async function fetchProfile(uid: string) {
  const { data } = await supabase
    .from('profiles')
    .select('username, display_name')
    .eq('id', uid)
    .single();
  return (data as { username: string; display_name: string } | null) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ username: string; display_name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);

  useEffect(() => {
    let active = true;

    const restore = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!active) return;
        if (session?.user) {
          setUser(session.user);
          const prof = await fetchProfile(session.user.id);
          if (active && prof) setProfile(prof);
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
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
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
