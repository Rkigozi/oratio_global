import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "./supabase";
import type { User } from "@supabase/supabase-js";
import { getProfile, type UserProfile, saveProfile } from "../app/data/profile-data";

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          setUser(data.user);
          try {
            const { data: dbProfile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", data.user.id)
              .single();
            if (dbProfile) {
              const p: UserProfile = {
                username: dbProfile.username,
                displayName: dbProfile.display_name || "",
                avatar: dbProfile.avatar_url || "🙏",
                photo: undefined,
                joinedAt: data.user.created_at || new Date().toISOString(),
              };
              setProfile(p);
              saveProfile(p);
            }
          } catch {
            setProfile(getProfile());
          }
        } else {
          setProfile(getProfile());
        }
      } catch {
        setProfile(getProfile());
      }
      setLoading(false);
    };

    void initialize();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setUser(null);
    setProfile(getProfile());
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
