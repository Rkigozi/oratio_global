import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";

vi.mock("../../hooks/auth-context", () => ({
  useAuth: vi.fn(),
}));

import { Onboarding } from "./onboarding";
import { useAuth } from "../../hooks/auth-context";

describe("Onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: null,
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

  it("toggles password visibility", () => {
    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>
    );

    const passwordInput = screen.getByPlaceholderText("At least 6 characters") as HTMLInputElement;
    expect(passwordInput.type).toBe("password");

    fireEvent.click(screen.getByLabelText("Show password"));
    expect(passwordInput.type).toBe("text");

    fireEvent.click(screen.getByLabelText("Hide password"));
    expect(passwordInput.type).toBe("password");
  });
});
