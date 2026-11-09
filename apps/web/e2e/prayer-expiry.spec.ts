import { expect, test, type Page } from '@playwright/test';

// Isolated rendering/journey checks. All external requests are mocked; no live
// account, prayer, migration, email or telemetry is created by these tests.
const ownerId = 'd6449951-06f2-4cbd-a1ef-b49963f1828c';
const prayerId = 'd6449951-06f2-4cbd-a1ef-b49963f1828d';

async function prepare(
  page: Page,
  baseURL: string,
  options: { owner?: boolean; active?: boolean; failRenew?: boolean } = {}
) {
  const user = {
    id: options.owner === false ? 'd6449951-06f2-4cbd-a1ef-b49963f1828e' : ownerId,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'expiry-preview@example.test',
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  const payload = Buffer.from(
    JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })
  ).toString('base64url');
  const token = `eyJhbGciOiJIUzI1NiJ9.${payload}.test-signature`;
  const prayer = {
    id: prayerId,
    user_id: ownerId,
    body: 'Please keep our family in your prayers as we navigate this difficult season.',
    audience: 'public',
    is_anonymous: false,
    category: null,
    location_city: 'London',
    location_country: 'United Kingdom',
    location_lat: 51.5,
    location_lng: -0.1,
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    public_expires_at: new Date(Date.now() + (options.active ? 60_000 : -1000)).toISOString(),
    comments_enabled: true,
    prayer_count: 4,
    comment_count: 1,
    profiles: { username: 'expiry-preview', display_name: 'Expiry preview', avatar_url: null },
  };
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === new URL(baseURL).origin) return route.continue();
    if (url.pathname === '/auth/v1/token')
      return route.fulfill({
        json: {
          access_token: token,
          refresh_token: 'test-refresh',
          token_type: 'bearer',
          expires_in: 3600,
          user,
        },
      });
    if (url.pathname === '/auth/v1/user') return route.fulfill({ json: user });
    if (url.pathname === '/rest/v1/rpc/renew_public_prayer') {
      if (options.failRenew)
        return route.fulfill({
          status: 403,
          json: { code: '42501', message: 'Preview renewal failed' },
        });
      prayer.public_expires_at = new Date(Date.now() + 14 * 86400000).toISOString();
      return route.fulfill({ json: prayer.public_expires_at });
    }
    if (url.pathname === '/rest/v1/profiles')
      return route.fulfill({
        json: {
          id: user.id,
          username: 'expiry-preview',
          display_name: 'Expiry preview',
          avatar_url: null,
          preferences: {},
        },
      });
    if (url.pathname === '/rest/v1/prayer_requests')
      return route.fulfill({ json: url.searchParams.has('id') ? prayer : [prayer] });
    if (url.pathname === '/rest/v1/comments')
      return route.fulfill({
        headers: { 'content-range': '0-0/1', 'access-control-expose-headers': 'content-range' },
        json:
          request.method() === 'HEAD'
            ? undefined
            : [
                {
                  id: 'comment-preview',
                  prayer_id: prayerId,
                  user_id: 'peer-preview',
                  parent_id: null,
                  body: 'Keeping you in my prayers.',
                  created_at: prayer.created_at,
                  updated_at: prayer.created_at,
                  profiles: {
                    username: 'peer-preview',
                    display_name: 'Prayer partner',
                    avatar_url: null,
                  },
                },
              ],
      });
    if (url.pathname.startsWith('/rest/v1/')) return route.fulfill({ json: [] });
    return route.abort();
  });
  await page.goto(`/login?next=${encodeURIComponent(`/prayer/${prayerId}`)}`);
  await page.getByPlaceholder('Email').fill(user.email);
  await page.getByPlaceholder('Password').fill('local-preview-only');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  return prayer;
}

test.describe('Public prayer expiry (mocked services)', () => {
  for (const theme of ['light', 'dark']) {
    test(`${theme}: owner archive, history and renewal fit the viewport`, async ({
      page,
      baseURL,
    }, testInfo) => {
      const prayer = await prepare(page, baseURL!);
      await expect(page.getByRole('heading', { name: 'Archived prayer' })).toBeVisible();
      await page.evaluate((mode) => {
        document.documentElement.dataset.theme = mode;
      }, theme);
      await expect(page.getByText(prayer.body, { exact: true })).toBeVisible();
      await expect(page.getByText('Keeping you in my prayers.', { exact: true })).toBeVisible();
      await expect(page.getByText('Comments (1)', { exact: true })).toBeVisible();
      await expect(page.getByPlaceholder('Write an encouragement...')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Pray for this', exact: true })).toHaveCount(0);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
      ).toBe(false);
      await page.screenshot({
        path: testInfo.outputPath(`prayer-archive-${theme}.png`),
        fullPage: true,
      });
      await page.getByRole('button', { name: 'Renew for 14 days' }).click();
      await expect(page.getByRole('status')).toHaveText('Your prayer is public again for 14 days.');
      await expect(page.getByRole('heading', { name: 'Archived prayer' })).toHaveCount(0);
      await expect(page.getByPlaceholder('Write an encouragement...')).toBeVisible();
      await expect(page.getByText('4 people prayed', { exact: true })).toBeVisible();
      await expect(page.getByText('Keeping you in my prayers.', { exact: true })).toBeVisible();
      await page.screenshot({
        path: testInfo.outputPath(`prayer-renewed-${theme}.png`),
        fullPage: true,
      });
    });
  }
  test('expiry updates an already-open owner detail without a reload', async ({
    page,
    baseURL,
  }) => {
    await page.clock.install({ time: new Date() });
    await prepare(page, baseURL!, { active: true });
    await expect(page.getByText(/^Public until /)).toBeVisible();
    await page.clock.fastForward(60_001);
    await expect(page.getByRole('heading', { name: 'Archived prayer' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Renew for 14 days' })).toBeVisible();
    await expect(page.getByPlaceholder('Write an encouragement...')).toHaveCount(0);
  });
  test('expired shared links do not reveal cached prayer text to another account', async ({
    page,
    baseURL,
  }) => {
    const prayer = await prepare(page, baseURL!, { owner: false });
    await expect(page.getByText('Prayer unavailable', { exact: true })).toBeVisible();
    await expect(page.getByText(prayer.body, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Renew for 14 days' })).toHaveCount(0);
  });
  test('failed renewal keeps history and offers a retry', async ({ page, baseURL }) => {
    const prayer = await prepare(page, baseURL!, { failRenew: true });
    await page.getByRole('button', { name: 'Renew for 14 days' }).click();
    await expect(page.getByRole('status')).toContainText("We couldn't renew this prayer");
    await expect(page.getByRole('heading', { name: 'Archived prayer' })).toBeVisible();
    await expect(page.getByText(prayer.body, { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Renew for 14 days' })).toBeEnabled();
  });
});
