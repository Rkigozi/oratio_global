import { supabase } from "./supabase";
import type { PrayerRequest } from "../app/data/prayer-data";
import { logError } from "./logger";

export interface Comment {
  id: string;
  prayer_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  user?: { username: string; display_name: string } | null;
}

// ─── Map Hotspots ──────────────────────────────────────────────────────

export async function getMapHotspots(): Promise<PrayerRequest[]> {
  const { data, error } = await supabase
    .from("prayer_requests")
    .select(`
      id, body, category,
      location_city, location_country, location_lat, location_lng,
      is_anonymous, prayer_count, created_at, comments_enabled,
      profiles!inner(username, display_name, avatar_url)
    `)
    .not("location_lat", "is", null)
    .not("location_lng", "is", null)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error || !data) {
    logError("getMapHotspots", error);
    return [];
  }

  return data.map((row: Record<string, unknown>) => {
    const profile = row.profiles as { username: string; display_name: string; avatar_url: string };
    return {
      id: row.id as string,
      city: (row.location_city as string) || "Unknown",
      country: (row.location_country as string) || "Unknown",
      text: row.body as string,
      name: row.is_anonymous ? undefined : (profile.display_name || profile.username),
      displayName: row.is_anonymous ? undefined : (profile.display_name || profile.username),
      username: row.is_anonymous ? undefined : profile.username,
      prayerCount: (row.prayer_count as number) || 0,
      lat: (row.location_lat as number) || 0,
      lng: (row.location_lng as number) || 0,
      category: (row.category as string) || undefined,
      createdAt: row.created_at as string,
      commentsEnabled: row.comments_enabled !== false,
      avatarUrl: profile.avatar_url || undefined,
    } as PrayerRequest;
  });
}

// ─── Feed ──────────────────────────────────────────────────────────────

export async function getFeedPrayers(): Promise<PrayerRequest[]> {
  const { data, error } = await supabase
    .from("prayer_requests")
    .select(`
      id, body, category,
      location_city, location_country, location_lat, location_lng,
      is_anonymous, prayer_count, created_at, comments_enabled,
      profiles!inner(username, display_name, avatar_url)
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) {
    logError("getFeedPrayers", error);
    return [];
  }

  return data.map((row: Record<string, unknown>) => {
    const profile = row.profiles as { username: string; display_name: string; avatar_url: string };
    return {
      id: row.id as string,
      city: (row.location_city as string) || "Unknown",
      country: (row.location_country as string) || "Unknown",
      text: row.body as string,
      name: row.is_anonymous ? undefined : (profile.display_name || profile.username),
      displayName: row.is_anonymous ? undefined : (profile.display_name || profile.username),
      username: row.is_anonymous ? undefined : profile.username,
      prayerCount: (row.prayer_count as number) || 0,
      lat: (row.location_lat as number) || 0,
      lng: (row.location_lng as number) || 0,
      category: (row.category as string) || undefined,
      createdAt: row.created_at as string,
      commentsEnabled: row.comments_enabled !== false,
      avatarUrl: profile.avatar_url || undefined,
    } as PrayerRequest;
  });
}

export async function getPrayerById(prayerId: string): Promise<PrayerRequest | null> {
  const { data, error } = await supabase
    .from("prayer_requests")
    .select(`
      id, body, category,
      location_city, location_country, location_lat, location_lng,
      is_anonymous, prayer_count, created_at, comments_enabled,
      profiles!inner(username, display_name, avatar_url)
    `)
    .eq("id", prayerId)
    .single();

  if (error || !data) {
    logError("fetch prayer", error);
    return null;
  }

  const profile = (data as Record<string, unknown>).profiles as { username: string; display_name: string; avatar_url: string };
  return {
    id: data.id as string,
    city: (data.location_city as string) || "Unknown",
    country: (data.location_country as string) || "Unknown",
    text: data.body as string,
    name: data.is_anonymous ? undefined : (profile.display_name || profile.username),
    displayName: data.is_anonymous ? undefined : (profile.display_name || profile.username),
    username: data.is_anonymous ? undefined : profile.username,
    prayerCount: (data.prayer_count as number) || 0,
    lat: (data.location_lat as number) || 0,
    lng: (data.location_lng as number) || 0,
    category: (data.category as string) || undefined,
    createdAt: data.created_at as string,
    commentsEnabled: data.comments_enabled !== false,
    avatarUrl: profile.avatar_url || undefined,
  } as PrayerRequest;
}

export async function createPrayerRequest(
  prayer: Omit<PrayerRequest, "id" | "createdAt">
): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("prayer_requests")
    .insert({
      user_id: user.id,
      body: prayer.text,
      category: prayer.category || null,
      location_city: prayer.city,
      location_country: prayer.country,
      location_lat: prayer.lat,
      location_lng: prayer.lng,
      is_anonymous: !prayer.username,
      comments_enabled: prayer.commentsEnabled ?? true,
    })
    .select("id")
    .single();

  if (error) {
    logError("create prayer", error);
    return null;
  }
  return (data as { id: string }).id;
}

export async function deletePrayerRequest(prayerId: string): Promise<boolean> {
  const { error } = await supabase
    .from("prayer_requests")
    .delete()
    .eq("id", prayerId);

  if (error) {
    logError("delete prayer", error);
    return false;
  }
  return true;
}

// ─── Prayer Interactions ("I Prayed") ─────────────────────────────────

export async function togglePray(
  prayerId: string,
  prayed: boolean
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  if (prayed) {
    const { error } = await supabase
      .from("prayer_interactions")
      .insert({ user_id: user.id, prayer_id: prayerId });
    if (error) {
      logError("add prayer interaction", error);
      return false;
    }
    await supabase.rpc("increment_prayer_count", { p_prayer_id: prayerId });
  } else {
    const { error } = await supabase
      .from("prayer_interactions")
      .delete()
      .eq("user_id", user.id)
      .eq("prayer_id", prayerId);
    if (error) {
      logError("remove prayer interaction", error);
      return false;
    }
    await supabase.rpc("decrement_prayer_count", { p_prayer_id: prayerId });
  }
  return true;
}


// ─── Comments ──────────────────────────────────────────────────────────

export async function getComments(prayerId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from("comments")
    .select(`
      id, prayer_id, user_id, parent_id, body, created_at,
      profiles(username, display_name)
    `)
    .eq("prayer_id", prayerId)
    .order("created_at", { ascending: true });

  if (error || !data) {
    logError("fetch comments", error);
    return [];
  }

  return (data as Array<Record<string, unknown>>).map((row) => {
    const profile = row.profiles as { username: string; display_name: string; avatar_url: string } | null;
    return {
      id: row.id as string,
      prayer_id: row.prayer_id as string,
      user_id: row.user_id as string,
      parent_id: (row.parent_id as string) || null,
      body: row.body as string,
      created_at: row.created_at as string,
      user: profile ? { username: profile.username, display_name: profile.display_name } : null,
    } as Comment;
  });
}

export async function createComment(input: {
  prayer_id: string;
  body: string;
  parent_id?: string | null;
}): Promise<Comment | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("comments")
    .insert({
      prayer_id: input.prayer_id,
      user_id: user.id,
      body: input.body,
      parent_id: input.parent_id || null,
    })
    .select("id, prayer_id, user_id, parent_id, body, created_at")
    .single();

  if (error || !data) {
    logError("create comment", error);
    return null;
  }

  return {
    ...(data as Comment),
    parent_id: (data as Record<string, unknown>).parent_id as string | null,
    user: null,
  };
}

export async function deleteComment(commentId: string): Promise<boolean> {
  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId);

  if (error) {
    logError("delete comment", error);
    return false;
  }
  return true;
}

// ─── Follows ───────────────────────────────────────────────────────────

export async function followUser(followingId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: user.id, following_id: followingId });

  if (error) {
    logError("follow user", error);
    return false;
  }
  return true;
}

export async function unfollowUser(followingId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", followingId);

  if (error) {
    logError("unfollow user", error);
    return false;
  }
  return true;
}

export async function getFollowingIds(): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);

  return (data || []).map((r: { following_id: string }) => r.following_id);
}

export async function getFollowers(userId: string): Promise<Array<{ id: string; username: string; display_name: string | null }>> {
  const { data } = await supabase
    .from("follows")
    .select(`
      follower_id,
      profiles!follower_id(username, display_name)
    `)
    .eq("following_id", userId);

  if (!data) return [];

  return (data as Array<Record<string, unknown>>).map((row) => {
    const profile = row.profiles as { username: string; display_name: string | null } | null;
    return {
      id: row.follower_id as string,
      username: profile?.username || "unknown",
      display_name: profile?.display_name || null,
    };
  });
}

export async function getFollowing(userId: string): Promise<Array<{ id: string; username: string; display_name: string | null }>> {
  const { data } = await supabase
    .from("follows")
    .select(`
      following_id,
      profiles!following_id(username, display_name)
    `)
    .eq("follower_id", userId);

  if (!data) return [];

  return (data as Array<Record<string, unknown>>).map((row) => {
    const profile = row.profiles as { username: string; display_name: string | null } | null;
    return {
      id: row.following_id as string,
      username: profile?.username || "unknown",
      display_name: profile?.display_name || null,
    };
  });
}

export async function isFollowing(followingId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", user.id)
    .eq("following_id", followingId)
    .maybeSingle();

  return !!data;
}

export async function getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
  const [followers, following] = await Promise.all([
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", userId),
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", userId),
  ]);

  return {
    followers: followers.count ?? 0,
    following: following.count ?? 0,
  };
}

// ─── Reports ───────────────────────────────────────────────────────────

export async function createReport(input: {
  reportable_type: "prayer" | "comment";
  reportable_id: string;
  reason: string;
}): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.from("reports").insert({
    reportable_type: input.reportable_type,
    reportable_id: input.reportable_id,
    reported_by: user.id,
    reason: input.reason,
  });

  if (error) {
    logError("create report", error);
    return false;
  }
  return true;
}

export async function getPendingReports(): Promise<Array<Record<string, unknown>>> {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    logError("fetch reports", error);
    return [];
  }
  return data || [];
}

export async function resolveReport(reportId: string, status: "resolved" | "dismissed"): Promise<boolean> {
  const { error } = await supabase
    .from("reports")
    .update({ status, resolved_at: new Date().toISOString() })
    .eq("id", reportId);

  if (error) {
    logError("resolve report", error);
    return false;
  }
  return true;
}

// ─── Profiles ──────────────────────────────────────────────────────────

export async function updateProfile(data: {
  display_name?: string;
  bio?: string;
  location?: string;
  avatar_url?: string;
}): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("profiles")
    .update(data)
    .eq("id", user.id);

  if (error) {
    logError("update profile", error);
    return false;
  }
  return true;
}

export async function getMyProfile(): Promise<{
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  created_at: string;
} | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, location, created_at")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    logError("fetch my profile", error);
    return null;
  }
  return data;
}

export async function getProfileByUsername(username: string): Promise<{
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
} | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, created_at")
    .eq("username", username)
    .single();

  if (error || !data) {
    logError("fetch profile", error);
    return null;
  }
  return data;
}

export async function getUserPrayers(username: string): Promise<PrayerRequest[]> {
  const profile = await getProfileByUsername(username);
  if (!profile) return [];

  const { data, error } = await supabase
    .from("prayer_requests")
    .select(`
      id, body, category,
      location_city, location_country, location_lat, location_lng,
      is_anonymous, prayer_count, created_at, comments_enabled
    `)
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) {
    logError("fetch user prayers", error);
    return [];
  }

  return (data as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    city: (row.location_city as string) || "Unknown",
    country: (row.location_country as string) || "Unknown",
    text: row.body as string,
    name: row.is_anonymous ? undefined : (profile.display_name || profile.username),
    displayName: row.is_anonymous ? undefined : (profile.display_name || profile.username),
    username: row.is_anonymous ? undefined : profile.username,
    prayerCount: (row.prayer_count as number) || 0,
    lat: (row.location_lat as number) || 0,
    lng: (row.location_lng as number) || 0,
    category: (row.category as string) || undefined,
    createdAt: row.created_at as string,
    commentsEnabled: row.comments_enabled !== false,
  })) as PrayerRequest[];
}

export async function searchUsers(query: string): Promise<Array<{ username: string; display_name: string | null }>> {
  const { data, error } = await supabase
    .from("profiles")
    .select("username, display_name")
    .ilike("username", `%${query}%`)
    .limit(20);

  if (error || !data) {
    logError("search users", error);
    return [];
  }
  return data;
}

// ─── Saved Prayers ─────────────────────────────────────────────────────

export async function toggleSavePrayer(
  prayerId: string,
  save: boolean
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  if (save) {
    const { error } = await supabase
      .from("saved_prayers")
      .insert({ user_id: user.id, prayer_id: prayerId });
    if (error) {
      logError("save prayer", error);
      return false;
    }
  } else {
    const { error } = await supabase
      .from("saved_prayers")
      .delete()
      .eq("user_id", user.id)
      .eq("prayer_id", prayerId);
    if (error) {
      logError("unsave prayer", error);
      return false;
    }
  }
  return true;
}

export async function getSavedPrayerIds(): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("saved_prayers")
    .select("prayer_id")
    .eq("user_id", user.id);

  return (data || []).map((r: { prayer_id: string }) => r.prayer_id);
}

export async function getSavedPrayers(): Promise<PrayerRequest[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const savedIds = await getSavedPrayerIds();
  if (savedIds.length === 0) return [];

  const { data, error } = await supabase
    .from("prayer_requests")
    .select(`
      id, body, category,
      location_city, location_country, location_lat, location_lng,
      is_anonymous, prayer_count, created_at, comments_enabled,
      profiles!inner(username, display_name, avatar_url)
    `)
    .in("id", savedIds)
    .order("created_at", { ascending: false });

  if (error || !data) {
    logError("fetch saved prayers", error);
    return [];
  }

  return (data as Array<Record<string, unknown>>).map((row) => {
    const profile = row.profiles as { username: string; display_name: string; avatar_url: string } | null;
    return {
      id: row.id as string,
      city: (row.location_city as string) || "Unknown",
      country: (row.location_country as string) || "Unknown",
      text: row.body as string,
      name: row.is_anonymous ? undefined : (profile?.display_name || profile?.username),
      displayName: row.is_anonymous ? undefined : (profile?.display_name || profile?.username),
      username: row.is_anonymous ? undefined : profile?.username,
      prayerCount: (row.prayer_count as number) || 0,
      lat: (row.location_lat as number) || 0,
      lng: (row.location_lng as number) || 0,
      category: (row.category as string) || undefined,
      createdAt: row.created_at as string,
      commentsEnabled: row.comments_enabled !== false,
      avatarUrl: profile?.avatar_url || undefined,
    } as PrayerRequest;
  });
}

export async function getMyPrayers(): Promise<PrayerRequest[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("prayer_requests")
    .select(`
      id, body, category,
      location_city, location_country, location_lat, location_lng,
      is_anonymous, prayer_count, created_at, comments_enabled
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) {
    logError("fetch my prayers", error);
    return [];
  }

  return (data as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    city: (row.location_city as string) || "Unknown",
    country: (row.location_country as string) || "Unknown",
    text: row.body as string,
    prayerCount: (row.prayer_count as number) || 0,
    lat: (row.location_lat as number) || 0,
    lng: (row.location_lng as number) || 0,
    category: (row.category as string) || undefined,
    createdAt: row.created_at as string,
    commentsEnabled: row.comments_enabled !== false,
  })) as PrayerRequest[];
}

export async function getMyPrayedForPrayers(): Promise<PrayerRequest[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("prayer_interactions")
    .select(`
      prayer_id,
      prayer_requests!inner(
        id, body, category,
        location_city, location_country, location_lat, location_lng,
        is_anonymous, prayer_count, created_at, comments_enabled,
        profiles!inner(username, display_name, avatar_url)
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) {
    logError("fetch prayed-for prayers", error);
    return [];
  }

  return (data as Array<Record<string, unknown>>).map((row) => {
    const prayer = row.prayer_requests as Record<string, unknown>;
    const profile = prayer.profiles as { username: string; display_name: string; avatar_url: string } | null;
    return {
      id: prayer.id as string,
      city: (prayer.location_city as string) || "Unknown",
      country: (prayer.location_country as string) || "Unknown",
      text: prayer.body as string,
      name: prayer.is_anonymous ? undefined : (profile?.display_name || profile?.username),
      displayName: prayer.is_anonymous ? undefined : (profile?.display_name || profile?.username),
      username: prayer.is_anonymous ? undefined : profile?.username,
      prayerCount: (prayer.prayer_count as number) || 0,
      lat: (prayer.location_lat as number) || 0,
      lng: (prayer.location_lng as number) || 0,
      category: (prayer.category as string) || undefined,
      createdAt: prayer.created_at as string,
      commentsEnabled: prayer.comments_enabled !== false,
      avatarUrl: profile?.avatar_url || undefined,
    } as PrayerRequest;
  });
}

// ─── Waitlist ──────────────────────────────────────────────────────────

export async function subscribeToWaitlist(
  email: string,
  source: "landing" | "info" = "landing"
): Promise<"subscribed" | "exists" | "error"> {
  const { error } = await supabase
    .from("waitlist")
    .insert({ email, source });

  if (!error) return "subscribed";

  if (error.code === "23505") return "exists";

  logError("subscribe", error);
  return "error";
}

// ─── Comments Toggle ──────────────────────────────────────────────────

export async function toggleCommentsEnabled(
  prayerId: string,
  enabled: boolean
): Promise<boolean> {
  const { error } = await supabase
    .from("prayer_requests")
    .update({ comments_enabled: enabled })
    .eq("id", prayerId);

  if (error) {
    logError("toggle comments", error);
    return false;
  }
  return true;
}

// ─── Account Deletion ─────────────────────────────────────────────────

export async function deleteAccount(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return "Not authenticated";

  const { error } = await supabase.functions.invoke("delete-account", {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) {
    return error.message || "Failed to delete account";
  }
  return null;
}

// ─── Prayer Interactions for current user ────────────────────────────

export async function getMyPrayedIds(): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("prayer_interactions")
    .select("prayer_id")
    .eq("user_id", user.id);

  if (error || !data) {
    logError("fetch prayed IDs", error);
    return [];
  }

  return data.map((row: { prayer_id: string }) => row.prayer_id);
}

export async function getMySavedIds(): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("saved_prayers")
    .select("prayer_id")
    .eq("user_id", user.id);

  if (error || !data) {
    logError("fetch saved IDs", error);
    return [];
  }

  return data.map((row: { prayer_id: string }) => row.prayer_id);
}

// ─── Profile Preferences ──────────────────────────────────────────────

export interface ProfilePreferences {
  notify_on_prayed: boolean;
  notify_on_comment: boolean;
  language: string;
  comments_enabled_default: boolean;
}

const defaultPreferences: ProfilePreferences = {
  notify_on_prayed: true,
  notify_on_comment: true,
  language: "auto",
  comments_enabled_default: true,
};

export async function getProfilePreferences(): Promise<ProfilePreferences> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return defaultPreferences;

  const { data, error } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    logError("fetch preferences", error);
    return defaultPreferences;
  }

  return { ...defaultPreferences, ...((data.preferences as Partial<ProfilePreferences>) || {}) };
}

export async function updateProfilePreferences(
  prefs: Partial<ProfilePreferences>
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const current = await getProfilePreferences();
  const merged = { ...current, ...prefs };

  const { error } = await supabase
    .from("profiles")
    .update({ preferences: merged })
    .eq("id", user.id);

  if (error) {
    logError("update preferences", error);
    return false;
  }
  return true;
}
