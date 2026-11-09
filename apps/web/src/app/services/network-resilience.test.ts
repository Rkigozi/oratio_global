import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const { qb, auth } = vi.hoisted(() => {
  const qb: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of [
    'select',
    'eq',
    'gt',
    'lt',
    'or',
    'in',
    'order',
    'limit',
    'insert',
    'single',
    'maybeSingle',
  ])
    qb[method] = vi.fn().mockReturnThis();
  qb.then = vi.fn();
  return { qb, auth: { getUser: vi.fn() } };
});
vi.mock('@oratio/shared/client', () => ({ getSupabaseClient: () => ({ auth, from: () => qb }) }));
import {
  createPrayerRequest,
  getFeedPrayers,
  getPrayerById,
  PrayerSubmissionError,
} from '@oratio/shared/queries';

const id = '72000000-0000-4000-8000-000000000001';
const prayer = {
  text: 'Synthetic prayer fixture',
  city: 'Unknown',
  country: 'Unknown',
  lat: 0,
  lng: 0,
  prayerCount: 0,
  username: 'owner',
  audience: 'private' as const,
  commentsEnabled: true,
};
const existing = {
  id,
  user_id: 'owner',
  body: prayer.text,
  audience: 'private',
  is_anonymous: false,
  comments_enabled: true,
  location_place_id: null,
};
const options = { requestId: id, expectedUserId: 'owner', throwOnError: true };
const respond = (data: unknown, error: unknown = null, status = 200) => ({ data, error, status });
const once = (data: unknown, error: unknown = null, status = 200) =>
  qb.then.mockImplementationOnce((resolve: (value: unknown) => void) =>
    resolve(respond(data, error, status))
  );

beforeEach(() => {
  vi.clearAllMocks();
  auth.getUser.mockResolvedValue({ data: { user: { id: 'owner' } }, error: null });
  qb.then.mockImplementation((resolve: (value: unknown) => void) => resolve(respond(null)));
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

describe('explicit read failures', () => {
  it('does not turn a failed feed into an empty success for native callers', async () => {
    once(null, new Error('network'));
    await expect(
      getFeedPrayers(undefined, 20, 'public', {}, { throwOnError: true })
    ).rejects.toThrow('Prayer feed is unavailable');
    expect(await getFeedPrayers()).toEqual([]);
  });
  it('propagates saved-ID lookup failures without querying an unfiltered feed', async () => {
    once(null, new Error('network'));
    await expect(
      getFeedPrayers(undefined, 20, 'public', { savedOnly: true }, { throwOnError: true })
    ).rejects.toThrow();
    expect(qb.select).toHaveBeenCalledTimes(1);
  });
  it('propagates saved-feed authentication errors', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('offline') });
    await expect(
      getFeedPrayers(undefined, 20, 'public', { savedOnly: true }, { throwOnError: true })
    ).rejects.toThrow();
    expect(qb.select).not.toHaveBeenCalled();
  });
  it('distinguishes a missing prayer from a failed read', async () => {
    expect(await getPrayerById(id, { throwOnError: true })).toBeNull();
    once(null, new Error('offline'));
    await expect(getPrayerById(id, { throwOnError: true })).rejects.toThrow(
      'Prayer is unavailable'
    );
  });
});

describe('same-ID prayer submission retries', () => {
  it('uses the provided primary key without trusting the caller for ownership or coordinates', async () => {
    once({ id });
    expect(await createPrayerRequest(prayer, options)).toBe(id);
    expect(qb.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id,
        user_id: 'owner',
        audience: 'private',
        location_city: '',
        location_lat: null,
        location_lng: null,
      })
    );
  });
  it('recovers a committed write after a lost confirmation, without inserting again', async () => {
    once(null, { code: '', message: 'private transport detail' }, 0);
    await expect(createPrayerRequest(prayer, options)).rejects.toMatchObject({ uncertain: true });
    once(existing);
    expect(await createPrayerRequest(prayer, { ...options, verifyExisting: true })).toBe(id);
    expect(qb.insert).toHaveBeenCalledTimes(1);
    expect(qb.eq).toHaveBeenCalledWith('user_id', 'owner');
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
      'private transport detail'
    );
  });
  it.each([
    { status: 406, code: 'PGRST116' },
    { status: 400, code: '' },
    { status: 403, code: '' },
  ])(
    'retains uncertainty for an ambiguous HTTP $status response ($code)',
    async ({ status, code }) => {
      once(null, { code }, status);
      await expect(createPrayerRequest(prayer, options)).rejects.toMatchObject({ uncertain: true });
    }
  );
  it('recovers the same ID after a failed write representation', async () => {
    once(null, { code: 'PGRST116' }, 406);
    await expect(createPrayerRequest(prayer, options)).rejects.toMatchObject({ uncertain: true });
    once(existing);
    expect(await createPrayerRequest(prayer, { ...options, verifyExisting: true })).toBe(id);
    expect(qb.insert).toHaveBeenCalledTimes(1);
  });
  it('reuses the ID when verification finds no committed row', async () => {
    once(null);
    once({ id });
    expect(await createPrayerRequest(prayer, { ...options, verifyExisting: true })).toBe(id);
    expect(qb.insert).toHaveBeenCalledWith(expect.objectContaining({ id }));
  });
  it('reconciles the unique-key conflict when another same-ID attempt wins', async () => {
    once(null, { code: '23505' }, 409);
    once(existing);
    expect(await createPrayerRequest(prayer, options)).toBe(id);
    expect(qb.insert).toHaveBeenCalledTimes(1);
  });
  it('does not send another write when verification fails', async () => {
    once(null, { message: 'offline' });
    await expect(
      createPrayerRequest(prayer, { ...options, verifyExisting: true })
    ).rejects.toMatchObject({ uncertain: true });
    expect(qb.insert).not.toHaveBeenCalled();
  });
  it('does not overwrite or claim a conflicting row as success', async () => {
    once({ ...existing, body: 'Different saved text' });
    await expect(
      createPrayerRequest(prayer, { ...options, verifyExisting: true })
    ).rejects.toMatchObject({ uncertain: true });
    expect(qb.insert).not.toHaveBeenCalled();
  });
  it('retains uncertainty when the duplicate row is no longer readable', async () => {
    once(null, { code: '23505' }, 409);
    once(null);
    await expect(createPrayerRequest(prayer, options)).rejects.toMatchObject({ uncertain: true });
  });
  it('distinguishes an explicit server rejection from an uncertain write', async () => {
    once(null, { code: '42501' }, 403);
    await expect(createPrayerRequest(prayer, options)).rejects.toMatchObject({ uncertain: false });
  });
  it('never submits an old account draft for a different signed-in account', async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: 'different-account' } }, error: null });
    await expect(createPrayerRequest(prayer, options)).rejects.toMatchObject({ uncertain: false });
    expect(qb.insert).not.toHaveBeenCalled();
  });

  it('keeps a previously uncertain ID unresolved when retry authentication is unavailable', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('offline') });
    await expect(
      createPrayerRequest(prayer, { ...options, verifyExisting: true })
    ).rejects.toMatchObject({ uncertain: true });
    expect(qb.insert).not.toHaveBeenCalled();
  });
  it('rejects invalid IDs before inserting and retains the legacy null-on-error option', async () => {
    await expect(
      createPrayerRequest(prayer, { ...options, requestId: 'invalid' })
    ).rejects.toBeInstanceOf(PrayerSubmissionError);
    expect(qb.insert).not.toHaveBeenCalled();
    once(null, { code: '42501' }, 403);
    expect(await createPrayerRequest(prayer)).toBeNull();
  });
});
