import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";

const supabaseMock = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  upload: vi.fn(),
  getPublicUrl: vi.fn(),
}));
const heic2anyMock = vi.hoisted(() => vi.fn());

vi.mock("./supabase", () => ({
  supabase: {
    auth: {
      getUser: supabaseMock.getUser,
    },
    storage: {
      from: supabaseMock.from,
    },
  },
}));
vi.mock("heic2any", () => ({
  default: heic2anyMock,
}));

import { AVATAR_UPLOAD_TIMEOUT_MS, uploadAvatar, getInitialAvatarUrl, type UploadAvatarStatus } from "./upload";

beforeEach(() => {
  vi.clearAllMocks();
  supabaseMock.from.mockReturnValue({
    upload: supabaseMock.upload,
    getPublicUrl: supabaseMock.getPublicUrl,
  });
  supabaseMock.getUser.mockResolvedValue({ data: { user: null }, error: null });
  supabaseMock.upload.mockResolvedValue({ data: { path: "avatar.png" }, error: null });
  supabaseMock.getPublicUrl.mockReturnValue({
    data: { publicUrl: "https://cdn.example.com/avatar.png" },
  });
  heic2anyMock.mockResolvedValue(new Blob(["converted"], { type: "image/jpeg" }));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("uploadAvatar", () => {
  it("returns an auth error when not authenticated", async () => {
    const file = new File(["test"], "test.png", { type: "image/png" });
    const result = await uploadAvatar(file);
    expect(result).toEqual({
      url: null,
      error: "Please sign in again before changing your photo.",
    });
  });

  it("rejects files that are not images", async () => {
    const file = new File(["test"], "notes.txt", { type: "text/plain" });
    const result = await uploadAvatar(file);
    expect(result).toEqual({
      url: null,
      error: "Choose an image file to use as your profile photo.",
    });
    expect(supabaseMock.getUser).not.toHaveBeenCalled();
  });

  it("converts HEIC to JPEG before uploading", async () => {
    supabaseMock.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const statuses: UploadAvatarStatus[] = [];
    const file = new File(["test"], "avatar.heic", { type: "image/heic" });
    const result = await uploadAvatar(file, {
      onStatusChange: (status) => statuses.push(status),
    });

    expect(result).toEqual({
      url: "https://cdn.example.com/avatar.png",
      error: null,
    });
    expect(heic2anyMock).toHaveBeenCalledWith({
      blob: file,
      toType: "image/jpeg",
      quality: 0.82,
    });
    expect(supabaseMock.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^user-1\/\d+\.jpg$/),
      expect.objectContaining({ type: "image/jpeg" }),
      expect.objectContaining({
        contentType: "image/jpeg",
        upsert: true,
      }),
    );
    expect(statuses).toEqual(["checking", "converting", "uploading"]);
  });

  it("returns a clear error when HEIC conversion fails", async () => {
    supabaseMock.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    heic2anyMock.mockRejectedValue(new Error("conversion failed"));

    const file = new File(["test"], "avatar.heic", { type: "image/heic" });
    const result = await uploadAvatar(file);

    expect(result).toEqual({
      url: null,
      error: "That iPhone photo could not be converted. Try a screenshot, JPEG, PNG, or WebP image instead.",
    });
    expect(supabaseMock.upload).not.toHaveBeenCalled();
  });

  it("uploads an image and returns the public URL", async () => {
    supabaseMock.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const file = new File(["test"], "avatar.png", { type: "image/png" });
    const result = await uploadAvatar(file);

    expect(result).toEqual({
      url: "https://cdn.example.com/avatar.png",
      error: null,
    });
    expect(supabaseMock.from).toHaveBeenCalledWith("avatars");
    expect(supabaseMock.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^user-1\/\d+\.png$/),
      file,
      expect.objectContaining({
        contentType: "image/png",
        upsert: true,
      }),
    );
  });

  it("reports upload status while processing an authenticated avatar", async () => {
    supabaseMock.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const statuses: UploadAvatarStatus[] = [];
    const file = new File(["test"], "avatar.png", { type: "image/png" });
    await uploadAvatar(file, {
      onStatusChange: (status) => statuses.push(status),
    });

    expect(statuses).toEqual(["checking", "preparing", "uploading"]);
  });

  it("returns a clear error when storage rejects the upload", async () => {
    supabaseMock.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    supabaseMock.upload.mockResolvedValue({
      data: null,
      error: { message: "Payload too large" },
    });

    const file = new File(["test"], "avatar.png", { type: "image/png" });
    const result = await uploadAvatar(file);

    expect(result).toEqual({
      url: null,
      error: "That photo is still too large. Try a cropped or smaller image.",
    });
  });

  it("times out when storage does not respond", async () => {
    vi.useFakeTimers();
    supabaseMock.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    supabaseMock.upload.mockReturnValue(new Promise(() => {}));

    const file = new File(["test"], "avatar.png", { type: "image/png" });
    const resultPromise = uploadAvatar(file);

    await vi.advanceTimersByTimeAsync(AVATAR_UPLOAD_TIMEOUT_MS);

    await expect(resultPromise).resolves.toEqual({
      url: null,
      error: "Photo upload timed out. Check your connection and try again.",
    });
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
