import { getSupabaseClient } from '../client';
import {
  mapOwnedPrayerRequest,
  mapPrayerRequest,
  PRAYER_SELECT,
  PRAYER_SELECT_COLUMNS,
  type FeedAudienceMode,
} from './shared';
import { normalizePrayerLocation, type PrayerRequest } from '../prayer-data';
import { mapHotspotTotal, type MapHotspot } from '../map-hotspots';
import { getProfileByUsername } from './profiles';
import { logError } from '../logger';

const supabase = getSupabaseClient();

type QueryBehavior = {
  throwOnError?: boolean;
};

export type FeedPrayerFilters = {
  country?: string;
  savedOnly?: boolean;
  search?: string;
};

function normalizeFeedSearchTerm(value?: string): string {
  return (value || '')
    .trim()
    .slice(0, 80)
    .replace(/[^\p{L}\p{N}\s#@'_-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Map Hotspots ──────────────────────────────────────────────────────

export async function getMapHotspots({ throwOnError = false }: QueryBehavior = {}): Promise<
  MapHotspot[]
> {
  try {
    const { data, error } = await supabase.rpc('get_map_hotspot_totals');
    if (error || !Array.isArray(data)) throw new Error('Invalid map totals');
    const places = new Set<string>();
    return data.map((row: unknown) => {
      const hotspot = mapHotspotTotal(row);
      if (!hotspot || places.has(hotspot.placeId)) throw new Error('Invalid map totals');
      places.add(hotspot.placeId);
      return hotspot;
    });
  } catch {
    const error = new Error('Prayer map is unavailable');
    logError('getMapHotspots', error);
    if (throwOnError) throw error;
    return [];
  }
}

// ─── Feed ──────────────────────────────────────────────────────────────

export type LocationPrayerCursor = { createdAt: string; id: string };
export type LocationPrayerPage = {
  prayers: PrayerRequest[];
  nextCursor: LocationPrayerCursor | null;
  // A first-page snapshot, not a live or all-time total. Later pages omit it.
  totalCount: number | null;
};

function validLocationCursor(cursor: LocationPrayerCursor): boolean {
  return (
    typeof cursor.createdAt === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      cursor.createdAt
    ) &&
    Number.isFinite(Date.parse(cursor.createdAt)) &&
    /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(cursor.id)
  );
}

export async function getPublicPrayersAtLocationPage(
  city: string,
  country: string,
  {
    placeId,
    cursor,
    pageLimit = 50,
  }: {
    placeId?: string;
    cursor?: LocationPrayerCursor;
    pageLimit?: number;
  } = {}
): Promise<LocationPrayerPage> {
  try {
    if (cursor && !validLocationCursor(cursor)) throw new Error('Invalid location cursor');
    const limit = Number.isFinite(pageLimit)
      ? Math.max(1, Math.min(100, Math.trunc(pageLimit)))
      : 50;
    const location = normalizePrayerLocation(city, country);
    let query = supabase
      .from('prayer_requests')
      .select(PRAYER_SELECT, cursor ? undefined : { count: 'exact' })
      .eq('audience', 'public')
      .gt('public_expires_at', new Date().toISOString());
    query = placeId
      ? query.eq('location_place_id', placeId)
      : query.eq('location_city', location.city).eq('location_country', location.country);
    if (cursor) {
      // Keep PostgreSQL's microsecond precision; Date.toISOString would lose rows.
      query = query.or(
        `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`
      );
    }
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit + 1);
    if (error || !Array.isArray(data)) throw new Error('Invalid location page');
    const prayers = data
      .slice(0, limit)
      .map((row: Record<string, unknown>) => mapPrayerRequest(row));
    const last = prayers.at(-1);
    const nextCursor =
      data.length > limit && last ? { createdAt: last.createdAt!, id: last.id } : null;
    if (nextCursor && !validLocationCursor(nextCursor)) throw new Error('Invalid location page');
    return {
      prayers,
      nextCursor,
      totalCount:
        !cursor && typeof count === 'number' && Number.isSafeInteger(count) && count >= 0
          ? count
          : null,
    };
  } catch {
    const error = new Error('Location prayers are unavailable');
    logError('getPublicPrayersAtLocationPage', error);
    throw error;
  }
}

export async function getPublicPrayersAtLocation(
  city: string,
  country: string,
  pageLimit = 50,
  { throwOnError = false, placeId }: QueryBehavior & { placeId?: string } = {}
): Promise<PrayerRequest[]> {
  const location = normalizePrayerLocation(city, country);
  const safeLimit = Math.max(1, Math.min(pageLimit, 100));
  let query = supabase
    .from('prayer_requests')
    .select(PRAYER_SELECT)
    .eq('audience', 'public')
    .gt('public_expires_at', new Date().toISOString());
  query = placeId
    ? query.eq('location_place_id', placeId)
    : query.eq('location_city', location.city).eq('location_country', location.country);
  const { data, error } = await query.order('created_at', { ascending: false }).limit(safeLimit);

  if (error) {
    logError('getPublicPrayersAtLocation', error);
    if (throwOnError) throw error;
    return [];
  }

  if (!data) {
    return [];
  }

  return data.map((row: Record<string, unknown>) => mapPrayerRequest(row));
}

export async function getFeedPrayers(
  cursor?: string,
  pageLimit = 20,
  audienceMode: FeedAudienceMode = 'public',
  filters: FeedPrayerFilters = {},
  { throwOnError = false }: QueryBehavior = {}
): Promise<PrayerRequest[]> {
  let savedPrayerIds: string[] | null = null;

  if (filters.savedOnly) {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError && throwOnError) throw new Error('Prayer feed is unavailable');
    if (!user) return [];

    const { data, error } = await supabase
      .from('saved_prayers')
      .select('prayer_id')
      .eq('user_id', user.id);

    if (error || !data) {
      logError('fetch saved feed IDs', error);
      if (throwOnError) throw new Error('Prayer feed is unavailable');
      return [];
    }

    savedPrayerIds = data.map((row: { prayer_id: string }) => row.prayer_id);
    if (savedPrayerIds.length === 0) return [];
  }

  let query = supabase
    .from('prayer_requests')
    .select(PRAYER_SELECT)
    .order('created_at', { ascending: false })
    .limit(pageLimit);

  if (audienceMode === 'circle') {
    query = query.eq('audience', 'circle');
  } else {
    query = query.eq('audience', 'public').gt('public_expires_at', new Date().toISOString());
  }

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  if (filters.country) {
    const location = normalizePrayerLocation('Unknown', filters.country);
    query = query.eq('location_country', location.country);
  }

  if (savedPrayerIds) {
    query = query.in('id', savedPrayerIds);
  }

  const searchTerm = normalizeFeedSearchTerm(filters.search);
  if (searchTerm) {
    const pattern = `*${searchTerm}*`;
    query = query.or(
      `body.ilike.${pattern},location_city.ilike.${pattern},location_country.ilike.${pattern},category.ilike.${pattern}`
    );
  }

  const { data, error } = await query;

  if (error || !data) {
    logError('getFeedPrayers', error);
    if (throwOnError) throw new Error('Prayer feed is unavailable');
    return [];
  }

  return data.map((row: Record<string, unknown>) => mapPrayerRequest(row));
}

export async function getPrayerById(
  prayerId: string,
  { throwOnError = false }: QueryBehavior = {}
): Promise<PrayerRequest | null> {
  const { data, error } = await supabase
    .from('prayer_requests')
    .select(PRAYER_SELECT)
    .eq('id', prayerId)
    .maybeSingle();

  if (error) {
    logError('fetch prayer', error);
    if (throwOnError) throw new Error('Prayer is unavailable');
    return null;
  }

  if (!data) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const row = data as Record<string, unknown>;

  return user?.id && row.user_id === user.id ? mapOwnedPrayerRequest(row) : mapPrayerRequest(row);
}

export class PrayerSubmissionError extends Error {
  constructor(public readonly uncertain: boolean) {
    super(uncertain ? 'Prayer submission could not be confirmed' : 'Prayer could not be saved');
    this.name = 'PrayerSubmissionError';
  }
}

export async function createPrayerRequest(
  prayer: Omit<PrayerRequest, 'id' | 'createdAt'>,
  {
    requestId,
    expectedUserId,
    verifyExisting = false,
    throwOnError = false,
  }: QueryBehavior & {
    requestId?: string;
    expectedUserId?: string;
    verifyExisting?: boolean;
  } = {}
): Promise<string | null> {
  let writeStarted = false;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || (expectedUserId && user.id !== expectedUserId))
      throw new PrayerSubmissionError(verifyExisting);
    if (requestId && !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(requestId))
      throw new PrayerSubmissionError(false);

    const recover = async () => {
      const { data: existing, error } = await supabase
        .from('prayer_requests')
        .select('id, user_id, body, audience, is_anonymous, comments_enabled, location_place_id')
        .eq('id', requestId!)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw new PrayerSubmissionError(true);
      if (!existing) return null;
      if (
        existing.id !== requestId ||
        existing.user_id !== user.id ||
        existing.body !== prayer.text ||
        existing.audience !== (prayer.audience ?? 'public') ||
        existing.is_anonymous !== !prayer.username ||
        existing.comments_enabled !== (prayer.commentsEnabled ?? true) ||
        (prayer.audience !== 'private' &&
          prayer.placeId &&
          existing.location_place_id !== prayer.placeId)
      ) {
        throw new PrayerSubmissionError(true);
      }
      return requestId!;
    };
    if (requestId && verifyExisting) {
      const recovered = await recover();
      if (recovered) return recovered;
    }

    const isPrivate = prayer.audience === 'private';
    const location = isPrivate
      ? { city: '', country: '' }
      : !prayer.country.trim() || prayer.country.trim().toLowerCase() === 'unknown'
        ? { city: prayer.city.trim() || 'Unknown', country: 'Unknown' }
        : normalizePrayerLocation(prayer.city, prayer.country);

    writeStarted = true;
    const { data, error } = await supabase
      .from('prayer_requests')
      .insert({
        ...(requestId ? { id: requestId } : {}),
        user_id: user.id,
        body: prayer.text,
        category: prayer.category || null,
        audience: prayer.audience || 'public',
        location_city: location.city,
        location_country: location.country,
        // Canonical coordinates come from the database catalog, never caller GPS.
        location_lat: null,
        location_lng: null,
        ...(!isPrivate && prayer.placeId ? { location_place_id: prayer.placeId } : {}),
        is_anonymous: !prayer.username,
        comments_enabled: prayer.commentsEnabled ?? true,
      })
      .select('id')
      .single();

    if (error) {
      if (requestId && error.code === '23505') {
        const recovered = await recover();
        if (recovered) return recovered;
        throw new PrayerSubmissionError(true);
      }
      // HTTP status alone cannot distinguish rejection from a failed write confirmation.
      const rejected = ['42501', '23514', '23503', '22023'].includes(error.code);
      throw new PrayerSubmissionError(verifyExisting || !rejected);
    }
    if (!data?.id || (requestId && data.id !== requestId)) throw new PrayerSubmissionError(true);
    return (data as { id: string }).id;
  } catch (cause) {
    const error =
      cause instanceof PrayerSubmissionError
        ? cause
        : new PrayerSubmissionError(writeStarted || verifyExisting);
    logError('create prayer', error);
    if (throwOnError) throw error;
    return null;
  }
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

  const { data, error } = await supabase
    .from('prayer_requests')
    .delete()
    .eq('id', prayerId)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle();

  if (error) {
    logError('delete prayer', error);
    return false;
  }
  return Boolean(data);
}

export async function renewPublicPrayer(prayerId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('renew_public_prayer', { p_prayer_id: prayerId });
  if (error || typeof data !== 'string' || !Number.isFinite(Date.parse(data))) {
    logError('renew prayer', error || new Error('Invalid renewal response'));
    return null;
  }
  return data;
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
    .eq('is_anonymous', false)
    .or(`audience.neq.public,public_expires_at.gt.${new Date().toISOString()}`)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data) {
    logError('fetch user prayers', error);
    return [];
  }

  return (data as Array<Record<string, unknown>>).map((row) => mapPrayerRequest(row, profile));
}

export async function getMyPrayers(
  audience?: NonNullable<PrayerRequest['audience']>,
  { offset = 0, throwOnError = false }: QueryBehavior & { offset?: number } = {}
): Promise<PrayerRequest[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase.from('prayer_requests').select(PRAYER_SELECT).eq('user_id', user.id);

  if (audience) query = query.eq('audience', audience);

  const safeOffset = Number.isFinite(offset) ? Math.max(0, Math.trunc(offset)) : 0;
  const { data, error } = await query
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(safeOffset, safeOffset + 49);

  if (error || !data) {
    logError('fetch my prayers', error);
    if (error && throwOnError) throw error;
    return [];
  }

  return (data as Array<Record<string, unknown>>).map((row) => mapOwnedPrayerRequest(row));
}
