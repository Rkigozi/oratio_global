import { test, expect } from '@playwright/test';

test.describe('Critical Flows', () => {
  test('loads landing page with sign in and create account options', async ({ page }) => {
    await page.goto('/landing');
    await expect(page.getByRole('heading', { name: 'ORATIO' })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
  });

  test('navigation to sign in works', async ({ page }) => {
    await page.goto('/landing');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL('/login');
    await expect(page.getByText('Sign back in to your account.')).toBeVisible();
  });

  test('navigation to create account works', async ({ page }) => {
    await page.goto('/landing');
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page).toHaveURL('/onboarding');
    await expect(page.getByText('Create Account')).toBeVisible();
  });

  test('anonymous users cannot access private app routes', async ({ page }) => {
    const privateRoutes = [
      '/',
      '/feed',
      '/submit',
      '/profile',
      '/profile/settings',
      '/profile/circle',
      '/moderate',
    ];

    for (const route of privateRoutes) {
      // The auth guard can redirect mid-navigation (double navigation is
      // normal here); we only care that the final URL is a public screen.
      await page.goto(route).catch(() => {});
      await expect(page).toHaveURL(/\/landing|\/login/, { timeout: 10_000 });
    }
  });

  test('anonymous users are redirected from profile', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/landing|\/login/);
  });

  test('landing page has working external links', async ({ page }) => {
    await page.goto('/landing');
    await expect(page.getByText('Privacy Policy')).toBeVisible();
    await expect(page.getByText('Terms of Service')).toBeVisible();
  });
});
