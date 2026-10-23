export type MapHotspot = {
  placeId: string;
  city: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  requestCount: number;
  // Current discovery is the server-managed 14-day public visibility window.
  recentRequestCount: number;
  peoplePrayedCount: number;
  latestRequestCreatedAt: string;
  nextExpiresAt: string;
};

export function mapHotspotTotal(value: unknown): MapHotspot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (
    typeof row.location_place_id !== 'string' ||
    !/^geonames:[0-9]+$/.test(row.location_place_id) ||
    typeof row.location_city !== 'string' ||
    !row.location_city.trim() ||
    row.location_city.trim().toLowerCase() === 'unknown' ||
    typeof row.location_country !== 'string' ||
    !row.location_country.trim() ||
    row.location_country.trim().toLowerCase() === 'unknown' ||
    typeof row.location_country_code !== 'string' ||
    !/^[A-Z]{2}$/.test(row.location_country_code) ||
    typeof row.location_lat !== 'number' ||
    !Number.isFinite(row.location_lat) ||
    Math.abs(row.location_lat) > 90 ||
    typeof row.location_lng !== 'number' ||
    !Number.isFinite(row.location_lng) ||
    Math.abs(row.location_lng) > 180 ||
    (row.location_lat === 0 && row.location_lng === 0) ||
    typeof row.request_count !== 'number' ||
    !Number.isSafeInteger(row.request_count) ||
    row.request_count < 1 ||
    typeof row.prayer_count !== 'number' ||
    !Number.isSafeInteger(row.prayer_count) ||
    row.prayer_count < 0 ||
    typeof row.latest_created_at !== 'string' ||
    !Number.isFinite(Date.parse(row.latest_created_at)) ||
    typeof row.next_expires_at !== 'string' ||
    !Number.isFinite(Date.parse(row.next_expires_at)) ||
    Date.parse(row.next_expires_at) <= Date.parse(row.latest_created_at)
  ) {
    return null;
  }
  return {
    placeId: row.location_place_id,
    city: row.location_city,
    country: row.location_country,
    countryCode: row.location_country_code,
    lat: row.location_lat,
    lng: row.location_lng,
    requestCount: row.request_count,
    recentRequestCount: row.request_count,
    peoplePrayedCount: row.prayer_count,
    latestRequestCreatedAt: row.latest_created_at,
    nextExpiresAt: row.next_expires_at,
  };
}

export function isMapHotspotCurrent(hotspot: MapHotspot, now = Date.now()): boolean {
  const deadline = Date.parse(hotspot.nextExpiresAt);
  return Number.isFinite(deadline) && deadline > now;
}

export function getHotspotMarkerSize(recentRequestCount: number): number {
  const count = Number.isFinite(recentRequestCount) ? Math.max(0, recentRequestCount) : 0;
  return Math.min(30, 16 + 2 * Math.log2(1 + count));
}
