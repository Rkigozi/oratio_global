import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

vi.mock("./supabase", () => {
  const makeQb = () => {
    const qb: Record<string, ReturnType<typeof vi.fn>> = {};
    qb.select = vi.fn().mockReturnThis();
    qb.eq = vi.fn().mockReturnThis();
    qb.order = vi.fn().mockReturnThis();
    qb.limit = vi.fn().mockReturnThis();
    qb.single = vi.fn().mockReturnThis();
    qb.insert = vi.fn().mockReturnThis();
    qb.delete = vi.fn().mockReturnThis();
    qb.in = vi.fn().mockReturnThis();
    qb.not = vi.fn().mockReturnThis();
    qb.ilike = vi.fn().mockReturnThis();
    qb.maybeSingle = vi.fn().mockReturnThis();
    qb.range = vi.fn().mockReturnThis();
    qb.update = vi.fn().mockReturnThis();
    qb.then = vi.fn((resolve: (v: unknown) => void) => resolve({ data: null, error: null }));
    return qb;
  };
  const qb = makeQb();
  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "test-user" } }, error: null }),
        getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "t" } }, error: null }),
      },
      from: () => qb,
      rpc: vi.fn(),
      functions: { invoke: vi.fn() },
    },
  };
});

let m: typeof import("./supabase-queries");
let qb: Record<string, ReturnType<typeof vi.fn>>;
let auth: { getUser: ReturnType<typeof vi.fn>; getSession: ReturnType<typeof vi.fn> };
let rpc: ReturnType<typeof vi.fn>;
let functionsInvoke: ReturnType<typeof vi.fn>;

function setOnce(data: unknown, error: unknown = null, count?: number) {
  qb.then.mockImplementationOnce((resolve: (v: unknown) => void) =>
    resolve({ data, error, count } as never),
  );
}

function setAlways(data: unknown, error: unknown = null, count?: number) {
  qb.then.mockImplementation((resolve: (v: unknown) => void) =>
    resolve({ data, error, count } as never),
  );
}

beforeAll(async () => {
  const { supabase } = await import("./supabase");
  qb = supabase.from() as unknown as Record<string, ReturnType<typeof vi.fn>>;
  auth = supabase.auth as unknown as {
    getUser: ReturnType<typeof vi.fn>;
    getSession: ReturnType<typeof vi.fn>;
  };
  rpc = supabase.rpc as ReturnType<typeof vi.fn>;
  functionsInvoke = supabase.functions.invoke as ReturnType<typeof vi.fn>;
  m = await import("./supabase-queries");
});

beforeEach(() => {
  vi.clearAllMocks();

  auth.getUser.mockResolvedValue({ data: { user: { id: "test-user" } }, error: null });
  auth.getSession.mockResolvedValue({ data: { session: { access_token: "t" } }, error: null });

  qb.select.mockReturnThis();
  qb.eq.mockReturnThis();
  qb.order.mockReturnThis();
  qb.limit.mockReturnThis();
  qb.single.mockReturnThis();
  qb.insert.mockReturnThis();
  qb.delete.mockReturnThis();
  qb.in.mockReturnThis();
  qb.not.mockReturnThis();
  qb.ilike.mockReturnThis();
  qb.maybeSingle.mockReturnThis();
  qb.range.mockReturnThis();
  qb.update.mockReturnThis();
  qb.then.mockImplementation((resolve: (v: unknown) => void) => resolve({ data: null, error: null }));

  functionsInvoke.mockResolvedValue({ error: null });
});

describe("getMapHotspots", () => {
  it("returns mapped prayers on success", async () => {
    setAlways([
      {
        id: "p1", body: "Prayer 1", category: "Health",
        location_city: "London", location_country: "UK",
        location_lat: 51.5, location_lng: -0.1,
        is_anonymous: false, prayer_count: 5, created_at: "2024-01-01",
        comments_enabled: true,
        profiles: { username: "user1", display_name: "User One" },
      },
      {
        id: "p2", body: "Prayer 2", category: "Family",
        location_city: null, location_country: null,
        location_lat: null, location_lng: null,
        is_anonymous: true, prayer_count: 0, created_at: "2024-01-02",
        comments_enabled: false,
        profiles: { username: "user2", display_name: "User Two" },
      },
    ]);
    const result = await m.getMapHotspots();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("p1");
    expect(result[0].username).toBe("user1");
    expect(result[0].name).toBe("User One");
    expect(result[1].username).toBeUndefined();
    expect(result[0].commentsEnabled).toBe(true);
    expect(result[1].commentsEnabled).toBe(false);
  });

  it("returns empty array on error", async () => {
    setAlways(null, new Error("DB error"));
    expect(await m.getMapHotspots()).toEqual([]);
  });

  it("returns empty array when data is null", async () => {
    setAlways(null);
    expect(await m.getMapHotspots()).toEqual([]);
  });
});

describe("getFeedPrayers", () => {
  it("returns mapped prayers on success", async () => {
    setAlways([
      {
        id: "f1", body: "Feed 1", category: "Other",
        location_city: "NYC", location_country: "US",
        location_lat: 40.7, location_lng: -74.0,
        is_anonymous: false, prayer_count: 3, created_at: "2024-01-01",
        comments_enabled: true,
        profiles: { username: "u1", display_name: "U1" },
      },
    ]);
    const result = await m.getFeedPrayers();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("f1");
  });

  it("returns empty array on error", async () => {
    setAlways(null, new Error("fail"));
    expect(await m.getFeedPrayers()).toEqual([]);
  });
});

describe("getPrayerById", () => {
  it("returns prayer when found", async () => {
    setAlways({
      id: "p1", body: "Detail", category: "Health",
      location_city: "Rome", location_country: "Italy",
      location_lat: 41.9, location_lng: 12.5,
      is_anonymous: false, prayer_count: 10, created_at: "2024-01-01",
      comments_enabled: true,
      profiles: { username: "ruser", display_name: "R User" },
    });
    const result = await m.getPrayerById("p1");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("p1");
  });

  it("returns null when not found", async () => {
    setAlways(null, new Error("not found"));
    expect(await m.getPrayerById("missing")).toBeNull();
  });

  it("returns null when data is null without error", async () => {
    setAlways(null);
    expect(await m.getPrayerById("missing")).toBeNull();
  });
});

describe("createPrayerRequest", () => {
  const prayer = {
    text: "Test prayer", city: "London", country: "UK",
    lat: 51.5, lng: -0.1, category: "Health",
    username: "user1", prayerCount: 0, commentsEnabled: true,
  };

  it("creates and returns ID on success", async () => {
    setAlways({ id: "new-id" });
    const result = await m.createPrayerRequest(prayer);
    expect(result).toBe("new-id");
  });

  it("returns null if no user", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.createPrayerRequest(prayer)).toBeNull();
  });

  it("returns null on insert error", async () => {
    setAlways(null, new Error("insert failed"));
    expect(await m.createPrayerRequest(prayer)).toBeNull();
  });
});

describe("deletePrayerRequest", () => {
  it("returns true on success", async () => {
    setAlways(null);
    expect(await m.deletePrayerRequest("p1")).toBe(true);
  });

  it("returns false on error", async () => {
    setAlways(null, new Error("delete failed"));
    expect(await m.deletePrayerRequest("p1")).toBe(false);
  });
});

describe("togglePray", () => {
  it("inserts interaction and increments count when praying", async () => {
    setAlways(null);
    const result = await m.togglePray("p1", true);
    expect(result).toBe(true);
    expect(rpc).toHaveBeenCalledWith("increment_prayer_count", { p_prayer_id: "p1" });
  });

  it("deletes interaction and decrements count when unpraying", async () => {
    setAlways(null);
    const result = await m.togglePray("p1", false);
    expect(result).toBe(true);
    expect(rpc).toHaveBeenCalledWith("decrement_prayer_count", { p_prayer_id: "p1" });
  });

  it("returns false if no user", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.togglePray("p1", true)).toBe(false);
  });
});

describe("getComments", () => {
  it("returns comments on success", async () => {
    setAlways([
      {
        id: "c1", prayer_id: "p1", user_id: "u1",
        parent_id: null, body: "Great prayer",
        created_at: "2024-01-01",
        profiles: { username: "commenter", display_name: "Commenter" },
      },
      {
        id: "c2", prayer_id: "p1", user_id: "u2",
        parent_id: "c1", body: "Reply",
        created_at: "2024-01-02",
        profiles: null,
      },
    ]);
    const result = await m.getComments("p1");
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("c1");
    expect(result[0].user?.username).toBe("commenter");
    expect(result[1].parent_id).toBe("c1");
    expect(result[1].user).toBeNull();
  });

  it("returns empty on error", async () => {
    setAlways(null, new Error("fail"));
    expect(await m.getComments("p1")).toEqual([]);
  });
});

describe("createComment", () => {
  it("creates comment on success", async () => {
    setAlways({
      id: "c-new", prayer_id: "p1", user_id: "test-user",
      parent_id: null, body: "Nice!", created_at: "2024-01-01",
    });
    const result = await m.createComment({ prayer_id: "p1", body: "Nice!" });
    expect(result).not.toBeNull();
    expect(result!.id).toBe("c-new");
    expect(result!.user).toBeNull();
  });

  it("returns null if no user", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.createComment({ prayer_id: "p1", body: "Nice!" })).toBeNull();
  });

  it("handles parent_id", async () => {
    setAlways({
      id: "c-reply", prayer_id: "p1", user_id: "test-user",
      parent_id: "c1", body: "Reply", created_at: "2024-01-01",
    });
    const result = await m.createComment({ prayer_id: "p1", body: "Reply", parent_id: "c1" });
    expect(result).not.toBeNull();
    expect(result!.parent_id).toBe("c1");
  });
});

describe("deleteComment", () => {
  it("returns true on success", async () => {
    setAlways(null);
    expect(await m.deleteComment("c1")).toBe(true);
  });

  it("returns false on error", async () => {
    setAlways(null, new Error("fail"));
    expect(await m.deleteComment("c1")).toBe(false);
  });
});

describe("followUser", () => {
  it("inserts follow on success", async () => {
    setAlways(null);
    expect(await m.followUser("target")).toBe(true);
  });

  it("returns false if no user", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.followUser("target")).toBe(false);
  });
});

describe("unfollowUser", () => {
  it("deletes follow on success", async () => {
    setAlways(null);
    expect(await m.unfollowUser("target")).toBe(true);
  });

  it("returns false if no user", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.unfollowUser("target")).toBe(false);
  });
});

describe("getFollowingIds", () => {
  it("returns following IDs", async () => {
    setAlways([{ following_id: "u2" }, { following_id: "u3" }]);
    const result = await m.getFollowingIds();
    expect(result).toEqual(["u2", "u3"]);
  });

  it("returns empty if no user", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.getFollowingIds()).toEqual([]);
  });
});

describe("getFollowers", () => {
  it("returns follower profiles", async () => {
    setAlways([{ follower_id: "u2", profiles: { username: "follower1", display_name: "Follower One" } }]);
    const result = await m.getFollowers("u1");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("u2");
    expect(result[0].username).toBe("follower1");
    expect(result[0].display_name).toBe("Follower One");
  });

  it("returns empty array when no followers", async () => {
    setAlways(null);
    expect(await m.getFollowers("u1")).toEqual([]);
  });
});

describe("getFollowing", () => {
  it("returns following profiles", async () => {
    setAlways([{ following_id: "u3", profiles: { username: "following1", display_name: "Following One" } }]);
    const result = await m.getFollowing("u1");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("u3");
    expect(result[0].username).toBe("following1");
    expect(result[0].display_name).toBe("Following One");
  });

  it("returns empty array when not following anyone", async () => {
    setAlways(null);
    expect(await m.getFollowing("u1")).toEqual([]);
  });
});

describe("isFollowing", () => {
  it("returns true when following", async () => {
    setAlways({ id: 1 });
    expect(await m.isFollowing("target")).toBe(true);
  });

  it("returns false when not following", async () => {
    setAlways(null);
    expect(await m.isFollowing("target")).toBe(false);
  });

  it("returns false if no user", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.isFollowing("target")).toBe(false);
  });
});

describe("getFollowCounts", () => {
  it("returns follower and following counts", async () => {
    setAlways<unknown>(null, null, 5);
    const result = await m.getFollowCounts("uid1");
    expect(result).toEqual({ followers: 5, following: 5 });
  });
});

describe("createReport", () => {
  it("creates report on success", async () => {
    setAlways(null);
    expect(
      await m.createReport({ reportable_type: "prayer", reportable_id: "p1", reason: "Spam" }),
    ).toBe(true);
  });

  it("returns false if no user", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(
      await m.createReport({ reportable_type: "prayer", reportable_id: "p1", reason: "Spam" }),
    ).toBe(false);
  });
});

describe("getPendingReports", () => {
  it("returns pending reports", async () => {
    setAlways([{ id: "r1", reason: "Spam" }]);
    const result = await m.getPendingReports();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("r1");
  });

  it("returns empty on error", async () => {
    setAlways(null, new Error("fail"));
    expect(await m.getPendingReports()).toEqual([]);
  });
});

describe("resolveReport", () => {
  it("returns true on success", async () => {
    setAlways(null);
    expect(await m.resolveReport("r1", "resolved")).toBe(true);
    expect(qb.update).toHaveBeenCalledWith({ status: "resolved", resolved_at: expect.any(String) });
  });

  it("returns false on error", async () => {
    setAlways(null, new Error("fail"));
    expect(await m.resolveReport("r1", "dismissed")).toBe(false);
  });
});

describe("updateProfile", () => {
  it("returns true on success", async () => {
    setAlways(null);
    expect(await m.updateProfile({ display_name: "New Name" })).toBe(true);
  });

  it("returns false if no user", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.updateProfile({ display_name: "New Name" })).toBe(false);
  });
});

describe("getMyProfile", () => {
  it("returns profile on success", async () => {
    const profileData = {
      id: "test-user", username: "user1", display_name: "User 1",
      avatar_url: null, bio: "Hello", location: "London", created_at: "2024-01-01",
    };
    setAlways(profileData);
    const result = await m.getMyProfile();
    expect(result).toEqual(profileData);
  });

  it("returns null if no user", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.getMyProfile()).toBeNull();
  });

  it("returns null on error", async () => {
    setAlways(null, new Error("fail"));
    expect(await m.getMyProfile()).toBeNull();
  });
});

describe("getProfileByUsername", () => {
  it("returns profile on success", async () => {
    const profileData = {
      id: "uid1", username: "user1", display_name: "User 1",
      avatar_url: null, created_at: "2024-01-01",
    };
    setAlways(profileData);
    const result = await m.getProfileByUsername("user1");
    expect(result).toEqual(profileData);
  });

  it("returns null when not found", async () => {
    setAlways(null, new Error("not found"));
    expect(await m.getProfileByUsername("nobody")).toBeNull();
  });
});

describe("getUserPrayers", () => {
  it("returns user prayers on success", async () => {
    setOnce(
      { id: "uid1", username: "user1", display_name: "User 1", avatar_url: null, created_at: "2024-01-01" },
    );
    setOnce([
      {
        id: "p1", body: "Prayer", category: "Other",
        location_city: "NYC", location_country: "US",
        location_lat: 40.7, location_lng: -74.0,
        is_anonymous: false, prayer_count: 3, created_at: "2024-01-01",
        comments_enabled: true,
      },
    ]);
    const result = await m.getUserPrayers("user1");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("p1");
    expect(result[0].username).toBe("user1");
  });

  it("returns empty if profile not found", async () => {
    setOnce(null, new Error("not found"));
    expect(await m.getUserPrayers("nonexistent")).toEqual([]);
  });
});

describe("searchUsers", () => {
  it("returns matching users on success", async () => {
    setAlways([{ username: "testuser", display_name: "Test User" }]);
    const result = await m.searchUsers("test");
    expect(result).toHaveLength(1);
    expect(result[0].username).toBe("testuser");
  });

  it("returns empty on error", async () => {
    setAlways(null, new Error("fail"));
    expect(await m.searchUsers("test")).toEqual([]);
  });
});

describe("toggleSavePrayer", () => {
  it("inserts when save=true", async () => {
    setAlways(null);
    expect(await m.toggleSavePrayer("p1", true)).toBe(true);
  });

  it("deletes when save=false", async () => {
    setAlways(null);
    expect(await m.toggleSavePrayer("p1", false)).toBe(true);
  });

  it("returns false if no user", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.toggleSavePrayer("p1", true)).toBe(false);
  });
});

describe("getSavedPrayerIds", () => {
  it("returns saved IDs", async () => {
    setAlways([{ prayer_id: "p1" }, { prayer_id: "p2" }]);
    const result = await m.getSavedPrayerIds();
    expect(result).toEqual(["p1", "p2"]);
  });

  it("returns empty if no user", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.getSavedPrayerIds()).toEqual([]);
  });
});

describe("getSavedPrayers", () => {
  it("returns saved prayers on success", async () => {
    setOnce([{ prayer_id: "p1" }]);
    setOnce([
      {
        id: "p1", body: "Saved", category: "Other",
        location_city: "Berlin", location_country: "Germany",
        location_lat: 52.5, location_lng: 13.4,
        is_anonymous: false, prayer_count: 1, created_at: "2024-01-01",
        comments_enabled: true,
        profiles: { username: "u1", display_name: "U1" },
      },
    ]);
    const result = await m.getSavedPrayers();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("p1");
  });

  it("returns empty if no saved IDs", async () => {
    setAlways([]);
    expect(await m.getSavedPrayers()).toEqual([]);
  });

  it("returns empty if no user", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.getSavedPrayers()).toEqual([]);
  });
});

describe("getMyPrayers", () => {
  it("returns my prayers on success", async () => {
    setAlways([
      {
        id: "p1", body: "Mine", category: "Other",
        location_city: "Tokyo", location_country: "Japan",
        location_lat: 35.7, location_lng: 139.7,
        is_anonymous: false, prayer_count: 2, created_at: "2024-01-01",
        comments_enabled: true,
      },
    ]);
    const result = await m.getMyPrayers();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("p1");
  });

  it("returns empty if no user", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.getMyPrayers()).toEqual([]);
  });
});

describe("getMyPrayedForPrayers", () => {
  it("returns prayed-for prayers on success", async () => {
    setAlways([
      {
        prayer_id: "p1",
        prayer_requests: {
          id: "p1", body: "Prayed for", category: "Other",
          location_city: "Sydney", location_country: "Australia",
          location_lat: -33.9, location_lng: 151.2,
          is_anonymous: false, prayer_count: 5, created_at: "2024-01-01",
          comments_enabled: true,
          profiles: { username: "other", display_name: "Other" },
        },
      },
    ]);
    const result = await m.getMyPrayedForPrayers();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("p1");
  });

  it("returns empty if no user", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.getMyPrayedForPrayers()).toEqual([]);
  });
});

describe("subscribeToWaitlist", () => {
  it('returns "subscribed" on success', async () => {
    setAlways(null);
    expect(await m.subscribeToWaitlist("test@test.com")).toBe("subscribed");
  });

  it('returns "exists" on duplicate', async () => {
    qb.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ error: { code: "23505" } } as never),
    );
    expect(await m.subscribeToWaitlist("dup@test.com", "landing")).toBe("exists");
  });

  it('returns "error" on other failure', async () => {
    qb.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ error: { code: "PGRST116", message: "other" } } as never),
    );
    expect(await m.subscribeToWaitlist("fail@test.com", "info")).toBe("error");
  });
});

describe("toggleCommentsEnabled", () => {
  it("returns true on success", async () => {
    setAlways(null);
    expect(await m.toggleCommentsEnabled("p1", false)).toBe(true);
  });

  it("returns false on error", async () => {
    setAlways(null, new Error("fail"));
    expect(await m.toggleCommentsEnabled("p1", true)).toBe(false);
  });
});

describe("deleteAccount", () => {
  it("returns null on success", async () => {
    functionsInvoke.mockResolvedValue({ data: {}, error: null });
    const result = await m.deleteAccount();
    expect(result).toBeNull();
    expect(functionsInvoke).toHaveBeenCalledWith("delete-account", {
      headers: { Authorization: "Bearer t" },
    });
  });

  it('returns "Not authenticated" if no session', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    expect(await m.deleteAccount()).toBe("Not authenticated");
  });

  it("returns error message on invoke failure", async () => {
    functionsInvoke.mockResolvedValue({ data: null, error: new Error("Failed to delete account") });
    const result = await m.deleteAccount();
    expect(result).toBe("Failed to delete account");
  });
});

describe("getMyPrayedIds", () => {
  it("returns prayed IDs on success", async () => {
    setAlways([{ prayer_id: "p1" }]);
    expect(await m.getMyPrayedIds()).toEqual(["p1"]);
  });

  it("returns empty if no user", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.getMyPrayedIds()).toEqual([]);
  });

  it("returns empty on error", async () => {
    setAlways(null, new Error("fail"));
    expect(await m.getMyPrayedIds()).toEqual([]);
  });
});

describe("getMySavedIds", () => {
  it("returns saved IDs on success", async () => {
    setAlways([{ prayer_id: "p1" }]);
    expect(await m.getMySavedIds()).toEqual(["p1"]);
  });

  it("returns empty if no user", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.getMySavedIds()).toEqual([]);
  });

  it("returns empty on error", async () => {
    setAlways(null, new Error("fail"));
    expect(await m.getMySavedIds()).toEqual([]);
  });
});

describe("getProfilePreferences", () => {
  const defaults = {
    notify_on_prayed: true,
    notify_on_comment: true,
    language: "auto",
    comments_enabled_default: true,
  };

  it("returns merged preferences on success", async () => {
    setAlways({ preferences: { language: "es", notify_on_prayed: false } });
    const result = await m.getProfilePreferences();
    expect(result.language).toBe("es");
    expect(result.notify_on_prayed).toBe(false);
    expect(result.notify_on_comment).toBe(true);
  });

  it("returns defaults if no user", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.getProfilePreferences()).toEqual(defaults);
  });

  it("returns defaults on error", async () => {
    setAlways(null, new Error("fail"));
    expect(await m.getProfilePreferences()).toEqual(defaults);
  });
});

describe("updateProfilePreferences", () => {
  it("merges and updates preferences on success", async () => {
    setOnce({ preferences: { notify_on_prayed: true, notify_on_comment: true, language: "auto", comments_enabled_default: true } });
    setOnce(null);
    expect(await m.updateProfilePreferences({ language: "fr" })).toBe(true);
  });

  it("returns false if no user", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await m.updateProfilePreferences({ language: "fr" })).toBe(false);
  });
});
