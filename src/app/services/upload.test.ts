import { describe, it, expect } from "vitest";
import { uploadAvatar, getInitialAvatarUrl } from "./upload";

describe("uploadAvatar", () => {
  it("returns null when not authenticated (no user)", async () => {
    const file = new File(["test"], "test.png", { type: "image/png" });
    const result = await uploadAvatar(file);
    expect(result).toBeNull();
  });
});

describe("getInitialAvatarUrl", () => {
  it("returns UI Avatars URL for a given username", () => {
    const url = getInitialAvatarUrl("testuser");
    expect(url).toContain("ui-avatars.com");
    expect(url).toContain("T");
  });

  it("handles empty username", () => {
    const url = getInitialAvatarUrl("");
    expect(url).toContain("?");
  });
});
