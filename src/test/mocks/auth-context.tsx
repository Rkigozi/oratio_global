import { createContext, useContext, type ReactNode } from "react";
import { vi } from "vitest";

interface MockAuthState {
  user: { id: string; email?: string } | null;
  profile: { username: string; display_name: string } | null;
  loading: boolean;
  signUp: ReturnType<typeof vi.fn>;
  signIn: ReturnType<typeof vi.fn>;
  signInWithGoogle: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
  resetPassword: ReturnType<typeof vi.fn>;
  updatePassword: ReturnType<typeof vi.fn>;
  needsEmailVerification: boolean;
}

const defaultAuth: MockAuthState = {
  user: { id: "test-user-id", email: "test@example.com" },
  profile: { username: "testuser", display_name: "Test User" },
  loading: false,
  signUp: vi.fn().mockResolvedValue(null),
  signIn: vi.fn().mockResolvedValue(null),
  signInWithGoogle: vi.fn().mockResolvedValue(undefined),
  signOut: vi.fn().mockResolvedValue(undefined),
  resetPassword: vi.fn().mockResolvedValue(null),
  updatePassword: vi.fn().mockResolvedValue(null),
  needsEmailVerification: false,
};

const MockAuthContext = createContext<MockAuthState>(defaultAuth);

export function MockAuthProvider({
  children,
  overrides,
}: {
  children: ReactNode;
  overrides?: Partial<MockAuthState>;
}) {
  const value = { ...defaultAuth, ...overrides };
  return <MockAuthContext.Provider value={value}>{children}</MockAuthContext.Provider>;
}

export function useMockAuth() {
  return useContext(MockAuthContext);
}
