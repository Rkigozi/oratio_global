import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { AuthGuard } from "./auth-guard";

vi.mock("../../hooks/auth-context", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../hooks/auth-context';

describe("AuthGuard", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-1" },
      profile: null,
      loading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
      needsEmailVerification: false,
    });
  });

  it("renders outlet when authenticated", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<AuthGuard />}>
            <Route index element={<div>Authenticated Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText("Authenticated Content")).toBeTruthy();
  });

  it("redirects to /landing when not authenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null, loading: false,
      profile: null, signUp: vi.fn(), signIn: vi.fn(), signInWithGoogle: vi.fn(),
      signOut: vi.fn(), resetPassword: vi.fn(), updatePassword: vi.fn(), needsEmailVerification: false,
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<AuthGuard />}>
            <Route index element={<div>Protected</div>} />
          </Route>
          <Route path="/landing" element={<div>Landing Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText("Landing Page")).toBeTruthy();
  });

  it("shows loading spinner while auth loads", () => {
    vi.useFakeTimers();
    vi.mocked(useAuth).mockReturnValue({
      user: null, loading: true,
      profile: null, signUp: vi.fn(), signIn: vi.fn(), signInWithGoogle: vi.fn(),
      signOut: vi.fn(), resetPassword: vi.fn(), updatePassword: vi.fn(), needsEmailVerification: false,
    });

    const { container } = render(
      <MemoryRouter>
        <AuthGuard />
      </MemoryRouter>
    );

    expect(container.querySelector(".animate-spin")).toBeNull();

    act(() => {
      vi.advanceTimersByTime(180);
    });

    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });
});
