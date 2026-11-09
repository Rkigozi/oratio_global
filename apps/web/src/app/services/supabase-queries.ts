// Domain query modules live in packages/shared and are shared with the
// mobile app. Importing ./supabase first registers the web client with the
// shared holder before any query module evaluates.

import './supabase';
import { getMapHotspots as getCanonicalMapHotspots } from '@oratio/shared/queries';
import type { PrayerRequest } from '@oratio/shared/prayer-data';

export * from '@oratio/shared/queries';

// Keep the existing web renderer compatible without leaking its marker shape into shared/native code.
export async function getMapHotspots(
  options?: Parameters<typeof getCanonicalMapHotspots>[0]
): Promise<PrayerRequest[]> {
  return (await getCanonicalMapHotspots(options)).map((hotspot) => ({
    id: `location:${hotspot.placeId}`,
    placeId: hotspot.placeId,
    countryCode: hotspot.countryCode,
    city: hotspot.city,
    country: hotspot.country,
    lat: hotspot.lat,
    lng: hotspot.lng,
    text: '',
    requestCount: hotspot.requestCount,
    prayerCount: hotspot.peoplePrayedCount,
    createdAt: hotspot.latestRequestCreatedAt,
    expiresAt: hotspot.nextExpiresAt,
  }));
}
