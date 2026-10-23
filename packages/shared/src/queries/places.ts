import { getSupabaseClient } from '../client';

export type PrayerPlace = {
  id: string;
  city: string;
  region: string;
  countryCode: string;
  country: string;
  lat: number;
  lng: number;
};

export function mapPrayerPlace(row: Record<string, unknown>): PrayerPlace | null {
  if (
    typeof row.id !== 'string' ||
    !/^geonames:[0-9]+$/.test(row.id) ||
    typeof row.city !== 'string' ||
    !row.city.trim() ||
    typeof row.country !== 'string' ||
    !row.country.trim() ||
    typeof row.country_code !== 'string' ||
    !/^[A-Z]{2}$/.test(row.country_code) ||
    typeof row.latitude !== 'number' ||
    !Number.isFinite(row.latitude) ||
    Math.abs(row.latitude) > 90 ||
    typeof row.longitude !== 'number' ||
    !Number.isFinite(row.longitude) ||
    Math.abs(row.longitude) > 180
  )
    return null;
  return {
    id: row.id,
    city: row.city,
    region: typeof row.region === 'string' ? row.region : '',
    countryCode: row.country_code,
    country: row.country,
    lat: row.latitude,
    lng: row.longitude,
  };
}

async function queryPlaces(
  name: 'search_prayer_places' | 'find_prayer_place',
  args: Record<string, string>
) {
  const { data, error } = await getSupabaseClient().rpc(name, args);
  if (error) throw new Error('Place lookup is unavailable');
  if (!Array.isArray(data)) throw new Error('Invalid place lookup response');
  return data.slice(0, 12).flatMap((row: Record<string, unknown>) => {
    const place = row && typeof row === 'object' ? mapPrayerPlace(row) : null;
    return place ? [place] : [];
  });
}

export async function searchPrayerPlaces(query: string): Promise<PrayerPlace[]> {
  const value = query.trim().replace(/\s+/g, ' ').slice(0, 80);
  if (value.length < 2) return [];
  return queryPlaces('search_prayer_places', { p_query: value });
}

export async function findPrayerPlace(city: string, country: string): Promise<PrayerPlace | null> {
  if (!city.trim() || !country.trim()) return null;
  const results = await queryPlaces('find_prayer_place', {
    p_city: city.trim().slice(0, 200),
    p_country: country.trim().slice(0, 200),
  });
  return results.length === 1 ? results[0] : null;
}
