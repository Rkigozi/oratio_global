import { createContext, useContext, useState, type ReactNode } from "react";
import { getProfile, logoutProfile, type UserProfile } from "../app/data/profile-data";

interface AuthState {
  profile: UserProfile | null;
  signOut: () => void;
}

const AuthContext = createContext<AuthState>({
  profile: null,
  signOut: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const p = getProfile();
      if (p.username && p.username !== "anonymous") return p;
    } catch { /* ignore */ }
    return null;
  });

  const signOut = () => {
    logoutProfile();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ profile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
