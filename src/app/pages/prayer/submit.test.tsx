import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ComponentProps, ReactNode } from "react";
import { act, render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";

vi.mock("../../hooks/auth-context", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../services/supabase-queries", () => ({
  createPrayerRequest: vi.fn(),
  getProfilePreferences: vi.fn(),
}));

vi.mock("../../hooks/use-geolocation", () => ({
  useGeolocation: vi.fn(),
}));

vi.mock("../../components/crisis-resources", () => ({
  CrisisResources: () => null,
}));

vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      ...props
    }: ComponentProps<"div"> & Record<string, unknown>) => <div {...props}>{children}</div>,
  },
}));

import { Submit } from "./submit";
import { useAuth } from '../../hooks/auth-context';
import { createPrayerRequest, getProfilePreferences } from '../../services/supabase-queries';
import { useGeolocation } from '../../hooks/use-geolocation';

describe("Submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-1", email: "test@example.com" } as any,
      profile: { username: "testuser", display_name: "Test User" },
      loading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
      needsEmailVerification: false,
    });
    vi.mocked(useGeolocation).mockReturnValue({
      location: null,
      loading: false,
      denied: false,
      error: null,
      requestLocation: vi.fn(),
      resetDenied: vi.fn(),
    });
    vi.mocked(getProfilePreferences).mockReturnValue(new Promise(() => {}));
    vi.mocked(createPrayerRequest).mockResolvedValue("prayer-1");
  });

  it("renders textarea, anonymous toggle, and submit button", () => {
    render(
      <MemoryRouter>
        <Submit />
      </MemoryRouter>
    );
    expect(
      screen.getByPlaceholderText(/share what's on your heart/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Submit Prayer Request")).toBeInTheDocument();
    expect(screen.getByText(/submitting as testuser/i)).toBeInTheDocument();
  });

  it("renders location section with auto-detect toggle", () => {
    render(
      <MemoryRouter>
        <Submit />
      </MemoryRouter>
    );
    expect(screen.getByText("Your Location")).toBeInTheDocument();
    expect(screen.getByLabelText(/auto-detect/i)).toBeInTheDocument();
  });

  it("calls createPrayerRequest on valid submit", async () => {
    render(
      <MemoryRouter>
        <Submit />
      </MemoryRouter>
    );

    fireEvent.change(
      screen.getByPlaceholderText(/share what's on your heart/i),
      { target: { value: "Please heal my family and bring peace" } }
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Submit Prayer Request"));
    });

    await vi.waitFor(() => {
      expect(createPrayerRequest).toHaveBeenCalled();
    });

    const callArg = vi.mocked(createPrayerRequest).mock.calls[0][0];
    expect(callArg.text).toContain("Please heal my family");
  });

  it("shows validation error when prayer text is too short", async () => {
    render(
      <MemoryRouter>
        <Submit />
      </MemoryRouter>
    );

    fireEvent.change(
      screen.getByPlaceholderText(/share what's on your heart/i),
      { target: { value: "Short" } }
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Submit Prayer Request"));
    });

    await vi.waitFor(() => {
      expect(screen.getByText(/at least 10 characters/i)).toBeInTheDocument();
    });

    expect(createPrayerRequest).not.toHaveBeenCalled();
  });

  it("shows success message after submission", async () => {
    render(
      <MemoryRouter>
        <Submit />
      </MemoryRouter>
    );

    fireEvent.change(
      screen.getByPlaceholderText(/share what's on your heart/i),
      { target: { value: "Please heal my family and bring peace to us all" } }
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Submit Prayer Request"));
    });

    await vi.waitFor(() => {
      expect(
        screen.getByText("Prayer Request Submitted")
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText("View in Feed")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Submit Another Request")
    ).toBeInTheDocument();
  });

  it("toggles anonymous mode", () => {
    render(
      <MemoryRouter>
        <Submit />
      </MemoryRouter>
    );

    expect(screen.getByText(/submitting as testuser/i)).toBeInTheDocument();

    const section = screen.getByText(/submitting as/i).closest("div")!.parentElement!;
    const toggle = section.querySelector("button")!;
    fireEvent.click(toggle);

    expect(screen.getByText(/submitting anonymously/i)).toBeInTheDocument();
  });
});
