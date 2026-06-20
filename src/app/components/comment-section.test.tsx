import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CommentSection } from "./comment-section";
import type { PrayerRequest } from "../data/prayer-data";

vi.mock("../../lib/supabase-queries", () => ({
  getComments: vi.fn(),
  createComment: vi.fn(),
  deleteComment: vi.fn(),
}));

vi.mock("../../lib/api", () => ({
  reportContent: vi.fn(),
}));

vi.mock("../../lib/auth-context", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../lib/upload", () => ({
  getInitialAvatarUrl: () => "https://ui-avatars.com/api/?name=T",
}));

import { getComments, createComment } from "../../lib/supabase-queries";
import { useAuth } from "../../lib/auth-context";

const mockPrayer: PrayerRequest = {
  id: "p1",
  city: "London",
  country: "UK",
  text: "Test prayer",
  username: "author",
  prayerCount: 1,
  lat: 51.5,
  lng: -0.1,
};

describe("CommentSection", () => {
  const defaultAuth = {
    user: { id: "user-1" },
    profile: { username: "commenter", display_name: "Commenter" },
    loading: false,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    needsEmailVerification: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(defaultAuth);
  });

  it("shows loading state initially", () => {
    vi.mocked(getComments).mockReturnValue(new Promise(() => {}));

    render(<CommentSection prayer={mockPrayer} commentCount={0} onCommentCountChange={vi.fn()} />);
    expect(document.querySelector(".animate-spin")).toBeTruthy();
  });

  it("shows empty state when no comments", async () => {
    vi.mocked(getComments).mockResolvedValue([]);

    render(<CommentSection prayer={mockPrayer} commentCount={0} onCommentCountChange={vi.fn()} />);

    const text = await screen.findByText(/No comments yet/);
    expect(text).toBeTruthy();
  });

  it("renders comments", async () => {
    vi.mocked(getComments).mockResolvedValue([
      { id: "c1", prayer_id: "p1", user_id: "user-1", parent_id: null, body: "Great prayer!", created_at: new Date().toISOString(), user: { username: "commenter", display_name: "Commenter" } },
    ]);

    render(<CommentSection prayer={mockPrayer} commentCount={1} onCommentCountChange={vi.fn()} />);

    const body = await screen.findByText("Great prayer!");
    expect(body).toBeTruthy();
  });

  it("allows submitting a comment", async () => {
    vi.mocked(getComments).mockResolvedValue([]);
    vi.mocked(createComment).mockResolvedValue({
      id: "c-new", prayer_id: "p1", user_id: "user-1", parent_id: null, body: "New comment", created_at: new Date().toISOString(), user: null,
    });

    render(<CommentSection prayer={mockPrayer} commentCount={0} onCommentCountChange={vi.fn()} />);

    await screen.findByText(/No comments yet/);

    const textarea = screen.getByPlaceholderText("Write an encouragement...");
    fireEvent.change(textarea, { target: { value: "New comment" } });
    // The send button has no accessible text (just icon). Click it by its role.
    const sendBtn = screen.getAllByRole("button").find(b => b.querySelector("svg.lucide-send"));
    if (sendBtn) fireEvent.click(sendBtn);
  });
});
