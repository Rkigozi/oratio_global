import { supabase } from "./supabase";
import type { PrayerRequest } from "../app/data/prayer-data";

export interface Comment {
  id: string;
  prayer_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  user?: { username: string; display_name: string } | null;
}

// ─── Feed ──────────────────────────────────────────────────────────────

export async function getFeedPrayers(): Promise<PrayerRequest[]> {
  const { data, error } = await supabase
    .from("prayer_requests")
    .select(`
      id, body, category, tags,
      location_city, location_country, location_lat, location_lng,
      is_anonymous, prayer_count, created_at,
      profiles!inner(username, display_name)
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) {
    console.error("Failed to fetch feed:", error?.message);
    return [];
  }

  return data.map((row: Record<string, unknown>) => {
    const profile = row.profiles as { username: string; display_name: string };
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
      category: (row.category as string) || "Other",
      createdAt: row.created_at as string,
    } as PrayerRequest;
  });
}

export async function getPrayerById(prayerId: string): Promise<PrayerRequest | null> {
  const { data, error } = await supabase
    .from("prayer_requests")
    .select(`
      id, body, category, tags,
      location_city, location_country, location_lat, location_lng,
      is_anonymous, prayer_count, created_at,
      profiles!inner(username, display_name)
    `)
    .eq("id", prayerId)
    .single();

  if (error || !data) {
    console.error("Failed to fetch prayer:", error?.message);
    return null;
  }

  const profile = (data as Record<string, unknown>).profiles as { username: string; display_name: string };
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
    category: (data.category as string) || "Other",
    createdAt: data.created_at as string,
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
      category: prayer.category || "Other",
      location_city: prayer.city,
      location_country: prayer.country,
      location_lat: prayer.lat,
      location_lng: prayer.lng,
      is_anonymous: !prayer.username,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create prayer:", error.message);
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
    console.error("Failed to delete prayer:", error.message);
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
      console.error("Failed to add prayer interaction:", error.message);
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
      console.error("Failed to remove prayer interaction:", error.message);
      return false;
    }
    await supabase.rpc("decrement_prayer_count", { p_prayer_id: prayerId });
  }
  return true;
}

export async function hasPrayed(prayerId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("prayer_interactions")
    .select("id")
    .eq("user_id", user.id)
    .eq("prayer_id", prayerId)
    .maybeSingle();

  return !!data;
}

export async function getPrayedIds(): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("prayer_interactions")
    .select("prayer_id")
    .eq("user_id", user.id);

  return (data || []).map((r: { prayer_id: string }) => r.prayer_id);
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
    console.error("Failed to fetch comments:", error?.message);
    return [];
  }

  return (data as Array<Record<string, unknown>>).map((row) => {
    const profile = row.profiles as { username: string; display_name: string } | null;
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
    console.error("Failed to create comment:", error?.message);
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
    console.error("Failed to delete comment:", error.message);
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
    console.error("Failed to follow user:", error.message);
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
    console.error("Failed to unfollow user:", error.message);
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

export async function getFollowers(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("following_id", userId);

  return (data || []).map((r: { follower_id: string }) => r.follower_id);
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
    console.error("Failed to create report:", error.message);
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
    console.error("Failed to fetch reports:", error.message);
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
    console.error("Failed to resolve report:", error.message);
    return false;
  }
  return true;
}

// ─── Profiles ──────────────────────────────────────────────────────────

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
    console.error("Failed to fetch profile:", error?.message);
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
      id, body, category, tags,
      location_city, location_country, location_lat, location_lng,
      is_anonymous, prayer_count, created_at
    `)
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) {
    console.error("Failed to fetch user prayers:", error?.message);
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
    category: (row.category as string) || "Other",
    createdAt: row.created_at as string,
  })) as PrayerRequest[];
}

export async function searchUsers(query: string): Promise<Array<{ username: string; display_name: string | null }>> {
  const { data, error } = await supabase
    .from("profiles")
    .select("username, display_name")
    .ilike("username", `%${query}%`)
    .limit(20);

  if (error || !data) {
    console.error("Failed to search users:", error?.message);
    return [];
  }
  return data;
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

  console.error("Failed to subscribe:", error.message);
  return "error";
}
