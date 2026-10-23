import { beforeEach, describe, expect, it, vi } from 'vitest';
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@oratio/shared/client', () => ({ getSupabaseClient: () => ({ rpc }) }));
import { findPrayerPlace, mapPrayerPlace, searchPrayerPlaces } from '@oratio/shared/queries';

const row = {
  id: 'geonames:2643743',
  city: 'London',
  region: 'England',
  country_code: 'GB',
  country: 'United Kingdom',
  latitude: 51.51,
  longitude: -0.13,
};
describe('canonical place queries', () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue({ data: [row], error: null });
  });
  it('maps only catalog identity and fixed city fields', () => {
    expect(mapPrayerPlace(row)).toEqual({
      id: row.id,
      city: row.city,
      region: row.region,
      countryCode: 'GB',
      country: row.country,
      lat: row.latitude,
      lng: row.longitude,
    });
  });
  it.each([
    { id: 'made-up' },
    { country_code: 'gbr' },
    { city: '' },
    { latitude: NaN },
    { latitude: 91 },
    { longitude: -181 },
  ])('rejects malformed catalog rows: %j', (change) => {
    expect(mapPrayerPlace({ ...row, ...change })).toBeNull();
  });
  it('does not request an empty or one-character search', async () => {
    expect(await searchPrayerPlaces(' a ')).toEqual([]);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('uses a bounded RPC parameter instead of interpolating a filter', async () => {
    await searchPrayerPlaces('  London   UK  ');
    expect(rpc).toHaveBeenCalledWith('search_prayer_places', { p_query: 'London UK' });
    await searchPrayerPlaces('x'.repeat(200));
    expect(rpc.mock.calls[1][1].p_query).toHaveLength(80);
  });
  it('bounds results and excludes malformed rows', async () => {
    rpc.mockResolvedValue({
      data: [{ ...row, id: 'bad' }, ...Array.from({ length: 20 }, () => row)],
      error: null,
    });
    expect(await searchPrayerPlaces('London')).toHaveLength(11);
  });
  it('does not expose database errors or turn a failure into empty success', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'private internal details' } });
    await expect(searchPrayerPlaces('London')).rejects.toThrow('Place lookup is unavailable');
  });
  it('requires both city and country for automatic matching', async () => {
    expect(await findPrayerPlace('London', '')).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
    expect(await findPrayerPlace('London', 'GB')).toMatchObject({ id: row.id });
    expect(rpc).toHaveBeenCalledWith('find_prayer_place', { p_city: 'London', p_country: 'GB' });
  });
  it('does not auto-select an ambiguous or missing place', async () => {
    rpc.mockResolvedValue({ data: [row, { ...row, id: 'geonames:123' }], error: null });
    expect(await findPrayerPlace('London', 'GB')).toBeNull();
    rpc.mockResolvedValue({ data: [], error: null });
    expect(await findPrayerPlace('Unknown', 'GB')).toBeNull();
  });
});
