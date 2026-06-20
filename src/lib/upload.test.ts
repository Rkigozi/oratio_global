import { describe, it, expect, vi, beforeEach } from "vitest";
import { uploadAvatar, getInitialAvatarUrl } from "./upload";

describe("uploadAvatar", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("converts a file to a data URL", async () => {
    const file = new File(["test"], "test.png", { type: "image/png" });
    const result = await uploadAvatar(file);
    expect(result).toMatch(/^data:image\/png;base64,/);
  });

  it("handles various file types", async () => {
    const pngFile = new File(["fake-png-data"], "test.png", { type: "image/png" });
    const result = await uploadAvatar(pngFile);
    expect(result).toMatch(/^data:image\/png;base64,/);
  });
});

describe("getInitialAvatarUrl", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns UI Avatars URL for unknown user", () => {
    const url = getInitialAvatarUrl("testuser");
    expect(url).toContain("ui-avatars.com");
    expect(url).toContain("T");
  });

  it("returns stored photo if available", () => {
    localStorage.setItem(
      "oratio_profile",
      JSON.stringify({ photo: "https://example.com/photo.jpg", username: "testuser" }),
    );
    const url = getInitialAvatarUrl("testuser");
    expect(url).toBe("https://example.com/photo.jpg");
  });

  it("ignores stored photo if username does not match", () => {
    localStorage.setItem(
      "oratio_profile",
      JSON.stringify({ photo: "https://example.com/photo.jpg", username: "otheruser" }),
    );
    const url = getInitialAvatarUrl("testuser");
    expect(url).toContain("ui-avatars.com");
  });

  it("handles empty username", () => {
    const url = getInitialAvatarUrl("");
    expect(url).toContain("?");
  });
});
