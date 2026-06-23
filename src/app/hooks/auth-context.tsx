import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from '../services/supabase';
import { logError } from '../../lib/logger';
import posthog from "posthog-js";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  profile: { username: string; display_name: string } | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<string | null>;
  updatePassword: (password: string) => Promise<string | null>;
  needsEmailVerification: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  loading: true,
  signUp: async () => null,
  signIn: async () => null,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  resetPassword: async () => null,
  updatePassword: async () => null,
  needsEmailVerification: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ username: string; display_name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);

  const fetchProfile = async (uid: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("username, display_name")
      .eq("id", uid)
      .single();
    if (data) setProfile(data);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        void fetchProfile(session.user.id);
      }
      setLoading(false);
    }).catch(() => {
      // Network/config failure — don't leave the app stuck on a loading state.
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        if (event === "PASSWORD_RECOVERY") {
          // User landed from a password reset email — don't fetch profile yet
          return;
        }
        void fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, username: string): Promise<string | null> => {
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (error) return error.message;
    posthog.capture("user_signed_up", { method: "email" });
    // If user needs email confirmation, set the flag
    if (data?.user?.identities?.length === 0 || data?.user?.email_confirmed_at === null) {
      setNeedsEmailVerification(true);
    }
    return null;
  };

  const signIn = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) posthog.capture("user_signed_in", { method: "email" });
    return error?.message || null;
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) logError("google sign-in", error);
    else posthog.capture("user_signed_in", { method: "google" });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const resetPassword = async (email: string): Promise<string | null> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    return error?.message || null;
  };

  const updatePassword = async (password: string): Promise<string | null> => {
    const { error } = await supabase.auth.updateUser({ password });
    return error?.message || null;
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signInWithGoogle, signOut, resetPassword, updatePassword, needsEmailVerification }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
