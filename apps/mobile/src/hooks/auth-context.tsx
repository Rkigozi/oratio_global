import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { supabase } from '../services/supabase';
import { withRequestTimeout } from '../services/request-timeout';

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
    const { data, error } = await withRequestTimeout(
      supabase
        .from('profiles')
        .select('username, display_name, avatar_url, bio, location')
        .eq('id', uid)
        .single()
    );
    return error ? null : ((data as AuthProfile | null) ?? null);
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
  const currentUserId = useRef<string | null>(null);
  const profileRequest = useRef(0);
  const sessionVersion = useRef(0);
  const signingOut = useRef(false);

  useEffect(() => {
    let active = true;
    const acceptSession = (nextUser: User | null) => {
      if (!active || (signingOut.current && nextUser)) return;
      sessionVersion.current += 1;
      const request = ++profileRequest.current;
      if (currentUserId.current !== (nextUser?.id ?? null)) setProfile(null);
      currentUserId.current = nextUser?.id ?? null;
      setUser(nextUser);
      setLoading(false);
      if (nextUser) {
        void fetchProfile(nextUser.id).then((prof) => {
          if (active && request === profileRequest.current && currentUserId.current === nextUser.id)
            setProfile(prof);
        });
      } else setProfile(null);
    };

    const restore = async () => {
      const version = sessionVersion.current;
      try {
        const {
          data: { session },
        } = await withTimeout(supabase.auth.getSession(), SESSION_RESTORE_TIMEOUT_MS);
        if (!active || version !== sessionVersion.current) return;
        acceptSession(session?.user ?? null);
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
      if (event === 'TOKEN_REFRESHED' && session?.user.id !== currentUserId.current) return;
      acceptSession(session?.user ?? null);
    });

    return () => {
      active = false;
      profileRequest.current += 1;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const updateAutoRefresh = (state: typeof AppState.currentState) => {
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
    if (!user || currentUserId.current !== user.id) {
      setProfile(null);
      return null;
    }

    const request = ++profileRequest.current;
    const nextProfile = await fetchProfile(user.id);
    if (request !== profileRequest.current || currentUserId.current !== user.id) return null;
    setProfile(nextProfile);
    return nextProfile;
  }, [user]);

  const signUp = useCallback(
    async (email: string, password: string, username: string): Promise<string | null> => {
      if (signingOut.current) return 'Finishing sign out. Please try again.';
      try {
        const { error, data } = await withRequestTimeout(
          supabase.auth.signUp({
            email,
            password,
            options: { data: { username } },
          })
        );
        if (error) return error.message;
        if (data?.user?.identities?.length === 0 || data?.user?.email_confirmed_at === null) {
          setNeedsEmailVerification(true);
        }
        return null;
      } catch {
        return "We couldn't confirm your sign-up. Check your email before trying again.";
      }
    },
    []
  );

  const signIn = useCallback(async (email: string, password: string): Promise<string | null> => {
    if (signingOut.current) return 'Finishing sign out. Please try again.';
    try {
      const { error } = await withRequestTimeout(
        supabase.auth.signInWithPassword({ email, password })
      );
      return error?.message || null;
    } catch {
      return "We couldn't sign you in. Check your connection and try again.";
    }
  }, []);

  const signOut = useCallback(async () => {
    signingOut.current = true;
    sessionVersion.current += 1;
    profileRequest.current += 1;
    currentUserId.current = null;
    setUser(null);
    setProfile(null);
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // The UI stays signed out even if revoking this device's token fails.
    } finally {
      signingOut.current = false;
    }
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<string | null> => {
    try {
      const { error } = await withRequestTimeout(
        supabase.auth.resetPasswordForEmail(email, {
          // The reset link opens the web update-password page, matching the web journey.
          redirectTo: 'https://oratiotest.netlify.app/update-password',
        })
      );
      return error?.message || null;
    } catch {
      return "We couldn't confirm delivery. Check your inbox before requesting another reset email.";
    }
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
