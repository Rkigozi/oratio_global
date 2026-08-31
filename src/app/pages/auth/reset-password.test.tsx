import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";

vi.mock("../../hooks/auth-context", () => ({
  useAuth: vi.fn(),
}));

import { ResetPassword } from "./reset-password";
import { useAuth } from "../../hooks/auth-context";

describe("ResetPassword", () => {
  const mockResetPassword = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      profile: null,
      loading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      resetPassword: mockResetPassword,
      updatePassword: vi.fn(),
      needsEmailVerification: false,
    });
  });

  it("renders a safe-area aware back button with a mobile tap target", () => {
    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );

    const backButton = screen.getByRole("button", { name: /back/i });
    expect(backButton).toHaveStyle({
      top: "calc(env(safe-area-inset-top, 0px) + 0.75rem)",
    });
    expect(backButton).toHaveClass("min-h-11");
  });

  it("shows a non-enumerating confirmation after requesting a reset link", async () => {
    mockResetPassword.mockResolvedValue(null);

    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText("your@email.com"), {
      target: { value: "person@example.com" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));
    });

    expect(screen.getByText("Check Your Email")).toBeInTheDocument();
    expect(screen.getByText(/If that email is linked to an Oratio account/)).toBeInTheDocument();
    expect(screen.queryByText("person@example.com")).not.toBeInTheDocument();
  });
});
