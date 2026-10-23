import { normalizePrayerLocation, type PrayerRequest } from '../prayer-data';

export type PrayerAudience = 'public' | 'circle' | 'private';
export type FeedAudienceMode = Exclude<PrayerAudience, 'private'>;

export type PrayerProfileRow = {
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
};

export type RpcResponse<T> = {
  data: T | null;
  error: unknown;
};

export const PRAYER_SELECT_COLUMNS = `
  id, user_id, body, category,
  location_city, location_country, location_lat, location_lng,
  is_anonymous, audience, prayer_count, comment_count, created_at, edited_at, comments_enabled,
  public_expires_at, location_place_id, location_country_code
`;

export const PRAYER_SELECT = `${PRAYER_SELECT_COLUMNS},
  profiles!inner(username, display_name, avatar_url)
`;

export function mapPrayerRequest(
  row: Record<string, unknown>,
  profileOverride?: PrayerProfileRow | null
): PrayerRequest {
  const profile =
    profileOverride ?? ((row.profiles as PrayerProfileRow | null | undefined) || null);
  const isAnonymous = row.is_anonymous === true;
  const attribution = profile?.display_name || profile?.username || undefined;
  const location = normalizePrayerLocation(
    (row.location_city as string | null) || 'Unknown',
    (row.location_country as string | null) || 'Unknown'
  );

  return {
    id: row.id as string,
    city: location.city,
    country: location.country,
    placeId: typeof row.location_place_id === 'string' ? row.location_place_id : undefined,
    countryCode:
      typeof row.location_country_code === 'string' ? row.location_country_code : undefined,
    text: row.body as string,
    audience: (row.audience as PrayerAudience | null) || 'public',
    name: isAnonymous ? undefined : attribution,
    displayName: isAnonymous ? undefined : attribution,
    username: isAnonymous ? undefined : profile?.username || undefined,
    prayerCount: (row.prayer_count as number) || 0,
    lat: (row.location_lat as number) || 0,
    lng: (row.location_lng as number) || 0,
    category: (row.category as string) || undefined,
    createdAt: row.created_at as string,
    editedAt: (row.edited_at as string | null) || undefined,
    expiresAt: (row.public_expires_at as string | null) || undefined,
    isAnonymous,
    commentCount: (row.comment_count as number) || 0,
    commentsEnabled: row.comments_enabled !== false,
    avatarUrl: isAnonymous ? undefined : profile?.avatar_url || undefined,
    authorId: (row.user_id as string | null) || undefined,
  };
}

export function mapOwnedPrayerRequest(row: Record<string, unknown>): PrayerRequest {
  return {
    ...mapPrayerRequest({ ...row, is_anonymous: false }),
    isAnonymous: row.is_anonymous === true,
  };
}
