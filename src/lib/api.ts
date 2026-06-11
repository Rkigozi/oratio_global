import { supabase } from "./supabase";
import type { PrayerRequest } from "../app/data/prayer-data";

// ─── Types ────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  language_preference: string;
  created_at: string;
}

export interface Prayer {
  id: string;
  user_id: string;
  body: string;
  category: string | null;
  tags: string[];
  location_city: string;
  location_country: string;
  location_lat: number | null;
  location_lng: number | null;
  is_anonymous: boolean;
  prayer_count: number;
  is_answered: boolean;
  created_at: string;
  user?: Pick<Profile, "username" | "display_name"> | null;
}

export interface Comment {
  id: string;
  prayer_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  user?: Pick<Profile, "username" | "display_name"> | null;
}

export interface CreatePrayerInput {
  body: string;
  category?: string;
  tags?: string[];
  location_city: string;
  location_country: string;
  location_lat?: number;
  location_lng?: number;
  is_anonymous?: boolean;
}

export interface CreateCommentInput {
  prayer_id: string;
  body: string;
  parent_id?: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────

export async function signUpWithEmail(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({ provider: "google" });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

// ─── Profiles ─────────────────────────────────────────────────────────

export async function createProfile(profile: {
  id: string;
  username: string;
  display_name?: string;
}) {
  return supabase.from("profiles").insert(profile).select().single();
}

export async function getProfile(userId: string) {
  return supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
}

export async function updateProfile(
  userId: string,
  updates: { display_name?: string; language_preference?: string }
) {
  return supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();
}

export async function checkUsernameAvailable(username: string) {
  const { data } = await supabase
    .from("profiles")
    .select("username")
    .eq("username", username)
    .maybeSingle();
  return !data;
}

// ─── Prayers ──────────────────────────────────────────────────────────

export async function createPrayer(input: CreatePrayerInput) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Must be signed in to submit a prayer");

  return supabase
    .from("prayer_requests")
    .insert({
      user_id: user.id,
      body: input.body,
      category: input.category ?? null,
      tags: input.tags ?? [],
      location_city: input.location_city,
      location_country: input.location_country,
      location_lat: input.location_lat ?? null,
      location_lng: input.location_lng ?? null,
      is_anonymous: input.is_anonymous ?? false,
    })
    .select("*, user:user_id(username, display_name)")
    .single();
}

export async function getPrayers(options?: {
  limit?: number;
  offset?: number;
  category?: string;
  tag?: string;
  search?: string;
}) {
  let query = supabase
    .from("prayer_requests")
    .select("*, user:user_id(username, display_name)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (options?.limit) query = query.limit(options.limit);
  if (options?.offset) query = query.range(options.offset, options.offset + (options.limit ?? 20) - 1);
  if (options?.category) query = query.eq("category", options.category);
  if (options?.tag) query = query.contains("tags", [options.tag]);
  if (options?.search) {
    query = query.or(
      `body.ilike.%${options.search}%,location_city.ilike.%${options.search}%,location_country.ilike.%${options.search}%`
    );
  }

  return query;
}

export async function getPrayerById(id: string) {
  return supabase
    .from("prayer_requests")
    .select("*, user:user_id(username, display_name)")
    .eq("id", id)
    .single();
}

export async function getUserPrayers(userId: string) {
  return supabase
    .from("prayer_requests")
    .select("*, user:user_id(username, display_name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
}

export async function deletePrayer(id: string) {
  return supabase.from("prayer_requests").delete().eq("id", id);
}

// ─── Prayer Interactions ("I Prayed") ─────────────────────────────────

export async function prayForPrayer(prayerId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Must be signed in");

  const { error: insertError } = await supabase
    .from("prayer_interactions")
    .insert({ user_id: user.id, prayer_id: prayerId });

  if (insertError) return { error: insertError };

  await supabase.rpc("increment_prayer_count", { p_prayer_id: prayerId });
  return { error: null };
}

export async function unprayForPrayer(prayerId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Must be signed in");

  const { error: deleteError } = await supabase
    .from("prayer_interactions")
    .delete()
    .eq("user_id", user.id)
    .eq("prayer_id", prayerId);

  if (deleteError) return { error: deleteError };

  await supabase.rpc("decrement_prayer_count", { p_prayer_id: prayerId });
  return { error: null };
}

export async function hasPrayedForPrayer(prayerId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const { data } = await supabase
    .from("prayer_interactions")
    .select("id")
    .eq("user_id", user.id)
    .eq("prayer_id", prayerId)
    .maybeSingle();

  return !!data;
}

export async function getUserPrayedPrayers(userId: string) {
  return supabase
    .from("prayer_interactions")
    .select("prayer_id, prayer:prayer_id(*, user:user_id(username, display_name))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
}

// ─── Comments ─────────────────────────────────────────────────────────

export async function createComment(input: CreateCommentInput) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Must be signed in to comment");

  return supabase
    .from("comments")
    .insert({
      prayer_id: input.prayer_id,
      user_id: user.id,
      body: input.body,
      parent_id: input.parent_id ?? null,
    })
    .select("*, user:user_id(username, display_name)")
    .single();
}

export async function getCommentsByPrayer(prayerId: string) {
  return supabase
    .from("comments")
    .select("*, user:user_id(username, display_name)")
    .eq("prayer_id", prayerId)
    .order("created_at", { ascending: true });
}

export async function deleteComment(id: string) {
  return supabase.from("comments").delete().eq("id", id);
}

// ─── Reports ──────────────────────────────────────────────────────────

export async function reportContent(report: {
  reportable_type: "prayer" | "comment";
  reportable_id: string;
  reason: string;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Must be signed in");

  return supabase.from("reports").insert({
    ...report,
    reported_by: user.id,
  });
}

// ─── Moderation ────────────────────────────────────────────────────────

export async function getPendingReports() {
  return supabase
    .from("reports")
    .select("*, reporter:reported_by(username, display_name)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
}

export async function resolveReport(reportId: string, status: "resolved" | "dismissed") {
  return supabase
    .from("reports")
    .update({ status, resolved_at: new Date().toISOString() })
    .eq("id", reportId);
}

// ─── Map Data ─────────────────────────────────────────────────────────

export async function getPrayerHeatmapData() {
  const { data, error } = await supabase
    .from("prayer_requests")
    .select("location_city, location_country, location_lat, location_lng, prayer_count, category")
    .not("location_lat", "is", null)
    .not("location_lng", "is", null);

  if (error) return { data: null, error };

  // Aggregate by city for map markers
  const cityMap = new Map<string, {
    city: string;
    country: string;
    lat: number;
    lng: number;
    prayerCount: number;
  }>();

  for (const p of data) {
    const key = `${p.location_city},${p.location_country}`;
    const existing = cityMap.get(key);
    if (existing) {
      existing.prayerCount += p.prayer_count;
    } else {
      cityMap.set(key, {
        city: p.location_city,
        country: p.location_country,
        lat: p.location_lat!,
        lng: p.location_lng!,
        prayerCount: p.prayer_count,
      });
    }
  }

  return {
    data: Array.from(cityMap.values()),
    error: null,
  };
}

// ─── Convert DB prayer to frontend PrayerRequest ──────────────────────

export function dbPrayerToPrayerRequest(p: Prayer): PrayerRequest {
  return {
    id: p.id,
    city: p.location_city,
    country: p.location_country,
    text: p.body,
    displayName: p.is_anonymous ? undefined : (p.user?.display_name ?? undefined),
    username: p.is_anonymous ? undefined : (p.user?.username ?? undefined),
    prayerCount: p.prayer_count,
    lat: p.location_lat ?? 0,
    lng: p.location_lng ?? 0,
    category: p.category ?? undefined,
    createdAt: p.created_at,
  };
}
