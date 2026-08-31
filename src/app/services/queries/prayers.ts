import { supabase } from '../supabase';
import {
  hasMappablePrayerLocation,
  mapHotspotTotal,
  mapOwnedPrayerRequest,
  mapPrayerRequest,
  PRAYER_SELECT,
  PRAYER_SELECT_COLUMNS,
  type FeedAudienceMode,
  type MapHotspotTotalRow,
  type RpcResponse,
} from './shared';
import { normalizePrayerLocation, type PrayerRequest } from '../prayer-data';
import { getProfileByUsername } from './profiles';
import { logError } from '../../../lib/logger';

// ─── Map Hotspots ──────────────────────────────────────────────────────

export async function getMapHotspots(): Promise<PrayerRequest[]> {
  const aggregateResult = (await supabase.rpc('get_map_hotspot_totals')) as unknown as RpcResponse<
    MapHotspotTotalRow[]
  >;

  if (!aggregateResult.error && aggregateResult.data) {
    return aggregateResult.data.map(mapHotspotTotal).filter(hasMappablePrayerLocation);
  }

  const { data, error } = await supabase
    .from('prayer_requests')
    .select(PRAYER_SELECT)
    .eq('audience', 'public')
    .not('location_lat', 'is', null)
    .not('location_lng', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error || !data) {
    logError('getMapHotspots', error);
    return [];
  }

  return data
    .map((row: Record<string, unknown>) => mapPrayerRequest(row))
    .filter(hasMappablePrayerLocation);
}

// ─── Feed ──────────────────────────────────────────────────────────────

export async function getFeedPrayers(
  cursor?: string,
  pageLimit = 20,
  audienceMode: FeedAudienceMode = 'public'
): Promise<PrayerRequest[]> {
  let query = supabase
    .from('prayer_requests')
    .select(PRAYER_SELECT)
    .order('created_at', { ascending: false })
    .limit(pageLimit);

  if (audienceMode === 'circle') {
    query = query.eq('audience', 'circle');
  } else {
    query = query.eq('audience', 'public');
  }

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error || !data) {
    logError('getFeedPrayers', error);
    return [];
  }

  return data.map((row: Record<string, unknown>) => mapPrayerRequest(row));
}

export async function getPrayerById(prayerId: string): Promise<PrayerRequest | null> {
  const { data, error } = await supabase
    .from('prayer_requests')
    .select(PRAYER_SELECT)
    .eq('id', prayerId)
    .maybeSingle();

  if (error) {
    logError('fetch prayer', error);
    return null;
  }

  if (!data) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const row = data as Record<string, unknown>;

  return user?.id && row.user_id === user.id ? mapOwnedPrayerRequest(row) : mapPrayerRequest(row);
}

export async function createPrayerRequest(
  prayer: Omit<PrayerRequest, 'id' | 'createdAt'>
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const location = normalizePrayerLocation(prayer.city, prayer.country);

  const { data, error } = await supabase
    .from('prayer_requests')
    .insert({
      user_id: user.id,
      body: prayer.text,
      category: prayer.category || null,
      audience: prayer.audience || 'public',
      location_city: location.city,
      location_country: location.country,
      location_lat: prayer.lat,
      location_lng: prayer.lng,
      is_anonymous: !prayer.username,
      comments_enabled: prayer.commentsEnabled ?? true,
    })
    .select('id')
    .single();

  if (error) {
    logError('create prayer', error);
    return null;
  }
  return (data as { id: string }).id;
}

export async function updatePrayerRequest(
  prayerId: string,
  body: string
): Promise<{ text: string; editedAt: string } | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('prayer_requests')
    .update({ body })
    .eq('id', prayerId)
    .eq('user_id', user.id)
    .select('body, edited_at')
    .single();

  if (error || !data) {
    logError('update prayer', error);
    return null;
  }

  return {
    text: data.body as string,
    editedAt: data.edited_at as string,
  };
}

export async function deletePrayerRequest(prayerId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('prayer_requests')
    .delete()
    .eq('id', prayerId)
    .eq('user_id', user.id);

  if (error) {
    logError('delete prayer', error);
    return false;
  }
  return true;
}

export async function toggleCommentsEnabled(prayerId: string, enabled: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('prayer_requests')
    .update({ comments_enabled: enabled })
    .eq('id', prayerId);

  if (error) {
    logError('toggle comments', error);
    return false;
  }
  return true;
}

export async function getUserPrayers(username: string): Promise<PrayerRequest[]> {
  const profile = await getProfileByUsername(username);
  if (!profile) return [];

  const { data, error } = await supabase
    .from('prayer_requests')
    .select(PRAYER_SELECT_COLUMNS)
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data) {
    logError('fetch user prayers', error);
    return [];
  }

  return (data as Array<Record<string, unknown>>).map((row) => mapPrayerRequest(row, profile));
}

export async function getMyPrayers(): Promise<PrayerRequest[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('prayer_requests')
    .select(PRAYER_SELECT)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data) {
    logError('fetch my prayers', error);
    return [];
  }

  return (data as Array<Record<string, unknown>>).map((row) => mapOwnedPrayerRequest(row));
}
