import { supabase } from "./supabase";
import type { PrayerRequest } from "../app/data/prayer-data";

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
    // Increment count
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
    // Decrement count
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
