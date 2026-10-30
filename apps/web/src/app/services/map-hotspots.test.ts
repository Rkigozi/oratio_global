import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const { rpc, from } = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock('@oratio/shared/client', () => ({ getSupabaseClient: () => ({ rpc, from }) }));
import { getMapHotspots } from '@oratio/shared/queries';
import {
  getHotspotMarkerSize,
  isMapHotspotCurrent,
  mapHotspotTotal,
} from '@oratio/shared/map-hotspots';

const row = {
  location_place_id: 'geonames:2643743',
  location_city: 'London',
  location_country: 'United Kingdom',
  location_country_code: 'GB',
  location_lat: 51.51,
  location_lng: -0.13,
  request_count: 3,
  prayer_count: 7,
  latest_created_at: '2026-10-20T12:00:00Z',
  next_expires_at: '2026-10-22T12:00:00Z',
};

describe('hotspot contract', () => {
  it('exposes place totals without a synthetic prayer or personal content', () => {
    expect(
      mapHotspotTotal({ ...row, body: 'Private text', user_id: 'person', profiles: {} })
    ).toEqual({
      placeId: row.location_place_id,
      city: 'London',
      country: 'United Kingdom',
      countryCode: 'GB',
      lat: 51.51,
      lng: -0.13,
      requestCount: 3,
      recentRequestCount: 3,
      peoplePrayedCount: 7,
      latestRequestCreatedAt: row.latest_created_at,
      nextExpiresAt: row.next_expires_at,
    });
  });

  it.each([
    { location_place_id: 'location:london' },
    { location_place_id: null },
    { location_city: '' },
    { location_city: 'Unknown' },
    { location_country: null },
    { location_country: 'Unknown' },
    { location_country_code: 'gb' },
    { location_lat: NaN },
    { location_lat: Infinity },
    { location_lat: 91 },
    { location_lng: -181 },
    { location_lat: 0, location_lng: 0 },
    { request_count: 0 },
    { request_count: -1 },
    { request_count: 1.5 },
    { request_count: '3' },
    { request_count: Number.MAX_SAFE_INTEGER + 1 },
    { prayer_count: -1 },
    { prayer_count: NaN },
    { latest_created_at: 'invalid' },
    { next_expires_at: null },
    { next_expires_at: 'invalid' },
    { next_expires_at: row.latest_created_at },
  ])('rejects an invalid aggregate instead of guessing a marker: %j', (change) => {
    expect(mapHotspotTotal({ ...row, ...change })).toBeNull();
  });

  it.each([null, undefined, [], 'prayer', 1])('rejects non-object rows: %j', (value) => {
    expect(mapHotspotTotal(value)).toBeNull();
  });

  it('allows zero engagement and real equator/prime-meridian centroids', () => {
    expect(mapHotspotTotal({ ...row, prayer_count: 0, location_lat: 0 })).toMatchObject({
      peoplePrayedCount: 0,
      lat: 0,
    });
    expect(mapHotspotTotal({ ...row, location_lng: 0 })).toMatchObject({ lng: 0 });
  });

  it('invalidates the whole cached aggregate at its first contributing expiry', () => {
    const hotspot = mapHotspotTotal(row)!;
    const deadline = Date.parse(row.next_expires_at);
    expect(isMapHotspotCurrent(hotspot, deadline - 1)).toBe(true);
    expect(isMapHotspotCurrent(hotspot, deadline)).toBe(false);
    expect(isMapHotspotCurrent({ ...hotspot, nextExpiresAt: 'invalid' }, deadline)).toBe(false);
  });
});

describe('request-only logarithmic marker scale', () => {
  it('grows logarithmically and stays within the existing marker dimensions', () => {
    expect(getHotspotMarkerSize(0)).toBe(16);
    expect(getHotspotMarkerSize(1)).toBe(18);
    expect(getHotspotMarkerSize(3)).toBe(20);
    expect(getHotspotMarkerSize(7)).toBe(22);
    expect(getHotspotMarkerSize(1_000_000)).toBe(30);
    const sizes = [0, 1, 2, 10, 100, 1000].map(getHotspotMarkerSize);
    expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
  });
  it.each([-1, NaN, Infinity])('returns a finite minimum for invalid counts: %s', (count) => {
    expect(getHotspotMarkerSize(count)).toBe(16);
  });
});

describe('aggregate-only hotspot query', () => {
  beforeEach(() => {
    rpc.mockReset();
    from.mockReset();
    rpc.mockResolvedValue({ data: [row], error: null });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('returns only the dedicated contract from the aggregate RPC', async () => {
    expect(await getMapHotspots({ throwOnError: true })).toEqual([mapHotspotTotal(row)]);
    expect(rpc).toHaveBeenCalledWith('get_map_hotspot_totals');
    expect(from).not.toHaveBeenCalled();
  });
  it('treats a valid empty aggregate differently from failure', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    expect(await getMapHotspots({ throwOnError: true })).toEqual([]);
    expect(console.error).not.toHaveBeenCalled();
  });
  it.each([
    { data: null, error: { message: 'private database details' } },
    { data: null, error: null },
    { data: {}, error: null },
    { data: [row, { ...row, request_count: -1 }], error: null },
    { data: [row, row], error: null },
  ])(
    'rejects incomplete, invalid or duplicated totals without a raw-row fallback',
    async (response) => {
      rpc.mockResolvedValue(response);
      await expect(getMapHotspots({ throwOnError: true })).rejects.toThrow(
        'Prayer map is unavailable'
      );
      expect(from).not.toHaveBeenCalled();
      expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
        'private database details'
      );
    }
  );
  it('handles a rejected transport request with the same recoverable failure', async () => {
    rpc.mockRejectedValue(new Error('private transport details'));
    await expect(getMapHotspots({ throwOnError: true })).rejects.toThrow(
      'Prayer map is unavailable'
    );
    expect(from).not.toHaveBeenCalled();
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
      'private transport details'
    );
  });
  it('preserves the nonthrowing compatibility option without querying individual prayers', async () => {
    rpc.mockResolvedValue({ data: null, error: new Error('offline') });
    expect(await getMapHotspots()).toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });
});
