import { expect, test } from '@playwright/test';

// Isolated UI checks: no real login, role grant, notice publication or backend writes.
test.describe('Service notice editor (mocked services)', () => {
  test.use({ timezoneId: 'Europe/London', locale: 'en-GB' });
  test.beforeEach(async ({ page, baseURL }) => {
    const user = {
      id: 'd6449951-06f2-4cbd-a1ef-b49963f1828c',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'notice-preview@example.test',
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    };
    const payload = Buffer.from(
      JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })
    ).toString('base64url');
    const token = `eyJhbGciOiJIUzI1NiJ9.${payload}.test-signature`;
    await page.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.origin === new URL(baseURL!).origin) return route.continue();
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
      if (url.pathname.startsWith('/rest/v1/profiles'))
        return route.fulfill({
          json: { username: 'notice-preview', display_name: 'Notice preview', preferences: {} },
        });
      if (url.pathname.startsWith('/rest/v1/')) return route.fulfill({ json: [] });
      return route.abort();
    });
    let notice: unknown = null;
    let version: string | null = null;
    await page.route('**/.netlify/functions/service-notice?manage=1', async (route) => {
      if (route.request().method() === 'PUT') {
        notice = route.request().postDataJSON().notice;
        if (notice) notice = { ...(notice as object), id: user.id };
        version = 'test-version';
        return route.fulfill({ json: { saved: true } });
      }
      return route.fulfill({ json: { notice, version, updatedAt: null } });
    });
    await page.goto('/login?next=%2Fadmin%2Fservice-notices');
    await page.getByPlaceholder('Email').fill(user.email);
    await page.getByPlaceholder('Password').fill('local-preview-only');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'New notice' })).toBeVisible();
  });

  for (const theme of ['light', 'dark']) {
    test(`${theme}: preview, publish and withdraw fit the viewport`, async ({ page }, testInfo) => {
      await page.evaluate((mode) => {
        document.documentElement.dataset.theme = mode;
      }, theme);
      await page.getByLabel(/^Title/).fill('Scheduled maintenance');
      await page
        .getByLabel(/^Message/)
        .fill(
          'We are carrying out maintenance tonight. Some features may be temporarily unavailable. Thank you for your patience.'
        );
      await page.getByLabel('Include maintenance times').check();
      await page.getByLabel('Maintenance starts').fill('2030-10-06T23:30');
      await page.getByLabel('Maintenance ends').fill('2030-10-07T01:00');
      await page.getByRole('button', { name: 'Preview notice' }).click();
      await expect(page.getByRole('region', { name: 'Notice preview' })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Notice preview' })).toContainText(
        /Maintenance:.*6 Oct 2030.*23:30.*(?:BST|GMT\+1).*7 Oct 2030.*01:00.*(?:BST|GMT\+1)/
      );
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth
      );
      expect(overflow).toBe(false);
      await page.getByRole('region', { name: 'Notice preview' }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: testInfo.outputPath(`notice-preview-${theme}.png`) });
      await page.getByRole('main').evaluate((element) => {
        element.scrollTop = 0;
      });
      await page.screenshot({ path: testInfo.outputPath(`notice-editor-${theme}.png`) });
      const publishing = page.waitForRequest(
        (request) => request.method() === 'PUT' && request.url().includes('service-notice')
      );
      await page.getByRole('button', { name: 'Publish notice' }).click();
      expect((await publishing).postDataJSON().notice.maintenance).toEqual({
        startsAt: '2030-10-06T22:30:00.000Z',
        endsAt: '2030-10-07T00:00:00.000Z',
      });
      await expect(page.getByRole('status').filter({ hasText: 'Notice saved' })).toBeVisible();
      page.once('dialog', (dialog) => dialog.accept());
      await page.getByRole('button', { name: 'Withdraw notice' }).click();
      await expect(page.getByRole('status').filter({ hasText: 'Notice withdrawn' })).toBeVisible();
    });
  }

  test('rejects a local maintenance time skipped by daylight saving', async ({ page }) => {
    await page.getByLabel(/^Message/).fill('Test maintenance');
    await page.getByLabel('Include maintenance times').check();
    await page.getByLabel('Maintenance starts').fill('2030-03-31T01:30');
    await page.getByLabel('Maintenance ends').fill('2030-03-31T03:00');
    await expect(page.getByRole('alert')).toContainText('Enter valid maintenance dates');
    await expect(page.getByRole('button', { name: 'Preview notice' })).toBeDisabled();
    await page.getByLabel('Maintenance starts').fill('2030-03-31T02:30');
    await expect(page.getByRole('button', { name: 'Preview notice' })).toBeEnabled();
  });
});
