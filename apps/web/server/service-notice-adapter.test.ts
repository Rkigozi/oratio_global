// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import noticeFunction from '../netlify/functions/service-notice';
import { getStore } from '@netlify/blobs';

vi.mock('@netlify/blobs', () => ({ getStore: vi.fn() }));
const read = vi.fn();
const write = vi.fn();
const fetchMock = vi.fn();
const productionContext = {
  deploy: { context: 'production', id: 'production-id', published: true },
};
const handler = (request: Request) => noticeFunction(request, productionContext);
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('SUPABASE_URL', 'https://auth.example');
  vi.stubEnv('SUPABASE_ANON_KEY', 'public-test-key');
  vi.stubEnv('ORATIO_NOTICE_ADMIN_IDS', 'approved-id');
  vi.mocked(getStore).mockReturnValue({ getWithMetadata: read, setJSON: write } as never);
  read.mockResolvedValue(null);
  write.mockResolvedValue({ modified: true });
  fetchMock.mockImplementation(() => Promise.resolve(Response.json({ id: 'approved-id' })));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const adminRequest = (version: string | null = null) =>
  new Request('https://oratio.example/.netlify/functions/service-notice', {
    method: 'PUT',
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ notice: null, version }),
  });

it('maps versions to atomic conditional writes and separates deploy previews from production', async () => {
  await handler(adminRequest());
  expect(getStore).toHaveBeenCalledWith({
    name: 'service-notices-production',
    consistency: 'strong',
  });
  expect(write).toHaveBeenLastCalledWith('current', expect.objectContaining({ notice: null }), {
    onlyIfNew: true,
  });
  await handler(adminRequest('"version-1"'));
  expect(write).toHaveBeenLastCalledWith('current', expect.anything(), {
    onlyIfMatch: '"version-1"',
  });
  await noticeFunction(adminRequest(), {
    deploy: { context: 'deploy-preview', id: 'preview-id', published: false },
  });
  expect(getStore).toHaveBeenLastCalledWith({
    name: 'service-notices-preview-id',
    consistency: 'strong',
  });
});

it('isolates unpublished production builds and refuses storage access without runtime context', async () => {
  await noticeFunction(adminRequest(), {
    deploy: { context: 'production', id: 'not-published', published: false },
  });
  expect(getStore).toHaveBeenLastCalledWith({
    name: 'service-notices-not-published',
    consistency: 'strong',
  });
  vi.mocked(getStore).mockClear();
  expect((await noticeFunction(adminRequest())).status).toBe(503);
  expect(getStore).not.toHaveBeenCalled();
});
it('verifies the token with Supabase and checks the returned identity against the server allowlist', async () => {
  await handler(adminRequest());
  expect(fetchMock).toHaveBeenCalledWith(
    'https://auth.example/auth/v1/user',
    expect.objectContaining({
      headers: { apikey: 'public-test-key', Authorization: 'Bearer test-token' },
    })
  );
  fetchMock.mockResolvedValue(Response.json({ id: 'moderator-not-admin' }));
  expect((await handler(adminRequest())).status).toBe(403);
  expect(write).toHaveBeenCalledTimes(1);
});
it('fails closed with no configured admins or a rejected token', async () => {
  vi.stubEnv('ORATIO_NOTICE_ADMIN_IDS', '');
  expect((await handler(adminRequest())).status).toBe(403);
  fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
  expect((await handler(adminRequest())).status).toBe(401);
  expect(write).not.toHaveBeenCalled();
});
it('serves public data without calling Supabase when Supabase is offline', async () => {
  fetchMock.mockRejectedValue(new Error('offline'));
  expect(
    (await handler(new Request('https://oratio.example/.netlify/functions/service-notice'))).status
  ).toBe(200);
  expect(fetchMock).not.toHaveBeenCalled();
});
