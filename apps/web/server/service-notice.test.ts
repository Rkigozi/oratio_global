// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createNoticeHandler, type NoticeRecord } from './service-notice';
import { noticeDraftSchema, noticeStatus } from '@oratio/shared/service-notice';

const draft = () => ({
  title: 'Maintenance',
  message: 'Brief interruption tonight.',
  startsAt: new Date(Date.now() - 1000).toISOString(),
  endsAt: new Date(Date.now() + 3600_000).toISOString(),
});
const record = (): NoticeRecord => ({
  notice: { ...draft(), id: 'd6449951-06f2-4cbd-a1ef-b49963f1828c' },
  updatedAt: new Date().toISOString(),
  updatedBy: 'private-admin-id',
});
const read = vi.fn();
const write = vi.fn();
const authorize = vi.fn();
const userId = vi.fn();
const handle = createNoticeHandler({ store: { read, write }, authorize, userId });
function request(method = 'GET', body?: unknown, headers?: Record<string, string>) {
  return new Request('https://oratio.example/.netlify/functions/service-notice?manage=1', {
    method,
    headers: {
      Authorization: 'Bearer verified-token',
      'Content-Type': 'application/json',
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  read.mockResolvedValue({ data: record(), etag: 'version-1' });
  write.mockResolvedValue(true);
  authorize.mockResolvedValue(true);
  userId.mockResolvedValue('owner-id');
});

describe('notice HTTP boundary', () => {
  it('serves public notices without auth or a Supabase dependency, excluding private audit fields', async () => {
    userId.mockRejectedValue(new Error('Supabase down'));
    const response = await handle(
      new Request('https://oratio.example/.netlify/functions/service-notice')
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.notice.title).toBe('Maintenance');
    expect(JSON.stringify(data)).not.toContain('private-admin-id');
    expect(userId).not.toHaveBeenCalled();
    expect(authorize).not.toHaveBeenCalled();
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
  });
  it('returns no notice for missing or expired data', async () => {
    read.mockResolvedValueOnce(null);
    const get = () =>
      handle(new Request('https://oratio.example/.netlify/functions/service-notice'));
    expect(await (await get()).json()).toEqual({ notice: null });
    read.mockResolvedValueOnce({
      data: {
        ...record(),
        notice: { ...record().notice, endsAt: new Date(Date.now() - 1).toISOString() },
      },
    });
    expect(await (await get()).json()).toEqual({ notice: null });
  });
  it('does not turn a storage outage into a successful withdrawal', async () => {
    read.mockRejectedValue(new Error('secret upstream diagnostic'));
    const response = await handle(
      new Request('https://oratio.example/.netlify/functions/service-notice')
    );
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('secret');
  });
  it.each(['GET', 'PUT'])(
    'rejects missing, expired and non-admin credentials for %s',
    async (method) => {
      expect(
        (
          await handle(
            request(
              method,
              method === 'PUT' ? { notice: draft(), version: 'version-1' } : undefined,
              { Authorization: '' }
            )
          )
        ).status
      ).toBe(401);
      userId.mockResolvedValueOnce(null);
      expect((await handle(request(method))).status).toBe(401);
      authorize.mockResolvedValueOnce(false);
      expect((await handle(request(method))).status).toBe(403);
      expect(read).not.toHaveBeenCalled();
      expect(write).not.toHaveBeenCalled();
    }
  );
  it('rejects cross-origin admin requests and non-JSON writes', async () => {
    expect(
      (await handle(request('GET', undefined, { Origin: 'https://untrusted.example' }))).status
    ).toBe(403);
    expect((await handle(request('PUT', {}, { 'Content-Type': 'text/plain' }))).status).toBe(415);
    expect(write).not.toHaveBeenCalled();
  });
  it('publishes with a server-issued revision and verified actor, and withdraws atomically', async () => {
    const response = await handle(request('PUT', { notice: draft(), version: 'version-1' }));
    expect(response.status).toBe(200);
    expect(write).toHaveBeenCalledWith(
      expect.objectContaining({
        updatedBy: 'owner-id',
        notice: expect.objectContaining({ title: 'Maintenance', id: expect.any(String) }),
      }),
      'version-1'
    );
    const firstId = write.mock.calls[0][0].notice.id;
    await handle(request('PUT', { notice: draft(), version: 'version-2' }));
    expect(write.mock.calls[1][0].notice.id).not.toBe(firstId);
    await handle(request('PUT', { notice: null, version: 'version-3' }));
    expect(write).toHaveBeenLastCalledWith(expect.objectContaining({ notice: null }), 'version-3');
  });
  it('returns 409 on a stale version rather than overwriting', async () => {
    write.mockResolvedValue(false);
    expect((await handle(request('PUT', { notice: draft(), version: 'stale' }))).status).toBe(409);
  });
  it('stores and serves structured maintenance times without changing the display window', async () => {
    const notice = {
      ...draft(),
      maintenance: {
        startsAt: new Date(Date.now() + 600_000).toISOString(),
        endsAt: new Date(Date.now() + 1200_000).toISOString(),
      },
    };
    expect((await handle(request('PUT', { notice, version: null }))).status).toBe(200);
    const saved = write.mock.calls[0][0];
    expect(saved.notice).toEqual({ ...notice, id: expect.any(String) });
    read.mockResolvedValue({ data: saved, etag: 'new-version' });
    const response = await handle(
      new Request('https://oratio.example/.netlify/functions/service-notice')
    );
    expect(await response.json()).toEqual({ notice: saved.notice });
  });
  it.each([
    { title: 'x'.repeat(61) },
    { message: 'x'.repeat(241) },
    { message: '   ' },
    { startsAt: 'not-a-date' },
    { endsAt: '2020-01-01T00:00:00.000Z' },
    { endsAt: new Date(Date.now() + 8 * 86400_000).toISOString() },
    { enabled: true },
    { maintenance: { startsAt: '2026-10-07T00:30:00.000Z' } },
    { maintenance: { startsAt: '2026-10-07T02:30:00.000Z', endsAt: '2026-10-07T00:30:00.000Z' } },
  ])('validates text and schedules on the server: %j', async (override) => {
    expect(
      (await handle(request('PUT', { notice: { ...draft(), ...override }, version: null }))).status
    ).toBe(400);
    expect(write).not.toHaveBeenCalled();
  });
  it('bounds streamed body size and rejects malformed JSON', async () => {
    expect((await handle(request('PUT', { notice: 'x'.repeat(9000) }))).status).toBe(413);
    const bad = new Request(request('PUT'), { body: '{broken' });
    expect((await handle(bad)).status).toBe(400);
    expect(write).not.toHaveBeenCalled();
  });
  it('does not leak errors or permit mutation when auth is unavailable', async () => {
    userId.mockRejectedValue(new Error('credentials'));
    const response = await handle(request('PUT', { notice: draft(), version: null }));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('credentials');
    expect(write).not.toHaveBeenCalled();
  });
});

describe('notice contract', () => {
  it('counts Unicode text consistently and accepts the exact limit', () => {
    expect(
      noticeDraftSchema.safeParse({ ...draft(), message: '\u{1F64F}'.repeat(240) }).success
    ).toBe(true);
    expect(
      noticeDraftSchema.safeParse({ ...draft(), message: '\u{1F64F}'.repeat(241) }).success
    ).toBe(false);
  });
  it('uses an inclusive start and exclusive expiry', () => {
    const notice = record().notice!;
    const start = Date.parse(notice.startsAt);
    const end = Date.parse(notice.endsAt);
    expect(noticeStatus(null)).toBe('off');
    expect(noticeStatus(notice, start - 1)).toBe('scheduled');
    expect(noticeStatus(notice, start)).toBe('visible');
    expect(noticeStatus(notice, end)).toBe('expired');
  });
});
