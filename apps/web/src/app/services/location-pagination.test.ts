import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { qb, from } = vi.hoisted(() => {
  const qb: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ['select', 'eq', 'gt', 'or', 'order', 'limit'])
    qb[method] = vi.fn().mockReturnThis();
  qb.then = vi.fn();
  return { qb, from: vi.fn(() => qb) };
});
vi.mock('@oratio/shared/client', () => ({ getSupabaseClient: () => ({ from }) }));
import { getPublicPrayersAtLocationPage } from '@oratio/shared/queries';

const timestamp = '2026-10-21T12:00:00.123456+00:00';
function row(n: number) {
  return {
    id: `71000000-0000-0000-0000-${String(n).padStart(12, '0')}`,
    body: `Prayer ${n}`,
    audience: 'public',
    created_at: timestamp,
    public_expires_at: '2026-11-04T12:00:00Z',
    location_city: 'London',
    location_country: 'United Kingdom',
    location_place_id: 'geonames:2643743',
    is_anonymous: true,
    profiles: { username: 'not-exposed' },
  };
}
function respond(data: unknown, count: number | null = 55, error: unknown = null) {
  qb.then.mockImplementation((resolve: (value: unknown) => void) =>
    resolve({ data, count, error })
  );
}

describe('location cursor pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    respond([]);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('fetches a bounded lookahead in deterministic timestamp/ID order with a separate total', async () => {
    const rows = Array.from({ length: 51 }, (_, n) => row(100 - n));
    respond(rows);
    const result = await getPublicPrayersAtLocationPage('Greater London', 'UK', {
      placeId: 'geonames:2643743',
    });
    expect(result.prayers).toHaveLength(50);
    expect(result.totalCount).toBe(55);
    expect(result.nextCursor).toEqual({ createdAt: timestamp, id: row(51).id });
    expect(result.prayers[0].username).toBeUndefined();
    expect(qb.eq).toHaveBeenCalledWith('location_place_id', 'geonames:2643743');
    expect(qb.eq).not.toHaveBeenCalledWith('location_city', expect.anything());
    expect(qb.eq).toHaveBeenCalledWith('audience', 'public');
    expect(qb.gt).toHaveBeenCalledWith('public_expires_at', expect.any(String));
    expect(qb.select).toHaveBeenCalledWith(expect.any(String), { count: 'exact' });
    expect(qb.order.mock.calls).toEqual([
      ['created_at', { ascending: false }],
      ['id', { ascending: false }],
    ]);
    expect(qb.limit).toHaveBeenCalledWith(51);
    expect(qb.or).not.toHaveBeenCalled();
  });

  it('preserves microseconds and includes the UUID tie-break below a cursor without recounting', async () => {
    const cursor = { createdAt: timestamp, id: row(51).id };
    respond([row(50)], 5);
    const result = await getPublicPrayersAtLocationPage('London', 'United Kingdom', {
      placeId: 'geonames:2643743',
      cursor,
    });
    expect(qb.or).toHaveBeenCalledWith(
      `created_at.lt.${timestamp},and(created_at.eq.${timestamp},id.lt.${cursor.id})`
    );
    expect(qb.select).toHaveBeenCalledWith(expect.any(String), undefined);
    expect(result.nextCursor).toBeNull();
    expect(result.totalCount).toBeNull();
    expect(result.prayers[0].id).toBe(row(50).id);
  });

  it('does not claim another page when exactly the requested page size is returned', async () => {
    respond([row(2), row(1)], 2);
    expect(await getPublicPrayersAtLocationPage('London', 'UK', { pageLimit: 2 })).toMatchObject({
      nextCursor: null,
      totalCount: 2,
    });
    expect(qb.eq).toHaveBeenCalledWith('location_city', 'London');
    expect(qb.eq).toHaveBeenCalledWith('location_country', 'United Kingdom');
  });

  it.each([
    [0, 2],
    [-5, 2],
    [2.9, 3],
    [1000, 101],
    [NaN, 51],
    [Infinity, 51],
  ])('bounds page size %s to query limit %s', async (pageLimit, limit) => {
    await getPublicPrayersAtLocationPage('London', 'UK', { pageLimit });
    expect(qb.limit).toHaveBeenCalledWith(limit);
  });

  it.each([
    { createdAt: 'invalid', id: row(1).id },
    { createdAt: `${timestamp},id.gt.0`, id: row(1).id },
    { createdAt: timestamp, id: `${row(1).id}),audience.eq.private` },
    { createdAt: timestamp, id: '' },
  ])('rejects malformed cursors before constructing a query: %j', async (cursor) => {
    await expect(getPublicPrayersAtLocationPage('London', 'UK', { cursor })).rejects.toThrow(
      'Location prayers are unavailable'
    );
    expect(from).not.toHaveBeenCalled();
  });

  it('returns a real empty page with no continuation', async () => {
    respond([], 0);
    expect(await getPublicPrayersAtLocationPage('London', 'UK')).toEqual({
      prayers: [],
      totalCount: 0,
      nextCursor: null,
    });
  });

  it.each([null, -1, 1.2, NaN])(
    'does not fabricate an unavailable/invalid total: %s',
    async (count) => {
      respond([row(1)], count);
      expect((await getPublicPrayersAtLocationPage('London', 'UK')).totalCount).toBeNull();
    }
  );

  it.each([
    { data: null, error: null },
    { data: [], error: { message: 'private backend detail' } },
    { data: {}, error: null },
  ])('turns invalid/failed responses into retryable errors', async ({ data, error }) => {
    respond(data, 0, error);
    await expect(getPublicPrayersAtLocationPage('London', 'UK')).rejects.toThrow(
      'Location prayers are unavailable'
    );
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
      'private backend detail'
    );
  });

  it('handles transport rejection without exposing provider detail', async () => {
    qb.then.mockImplementation(() => {
      throw new Error('private transport detail');
    });
    await expect(getPublicPrayersAtLocationPage('London', 'UK')).rejects.toThrow(
      'Location prayers are unavailable'
    );
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
      'private transport detail'
    );
  });
});
