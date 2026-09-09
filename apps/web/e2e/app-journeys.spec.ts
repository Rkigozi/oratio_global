import { test, expect } from '@playwright/test';

// Authenticated product journeys. These run against a real backend and are
// skipped unless E2E_TEST_EMAIL / E2E_TEST_PASSWORD are provided, so CI can
// stay credential-free while local/remote runs exercise the full product.

const email = process.env.E2E_TEST_EMAIL;
const password = process.env.E2E_TEST_PASSWORD;
const hasCredentials = Boolean(email && password);

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByPlaceholder('Email').fill(email!);
  await page.getByPlaceholder('Password').fill(password!);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/feed|\/$/, { timeout: 15_000 });
}

test.describe('Signed-in product journeys', () => {
  test.skip(!hasCredentials, 'E2E_TEST_EMAIL and E2E_TEST_PASSWORD are not set');

  test('signs in, prays for a prayer, and signs out', async ({ page }) => {
    await signIn(page);

    // The feed should render prayer cards after sign-in.
    await expect(page.locator('[data-testid="feed-scroll-container"]')).toBeVisible({
      timeout: 20_000,
    });

    // Open the first prayer card.
    const firstCard = page.locator('[data-testid="feed-scroll-container"] > div > div').first();
    await firstCard.click();

    // Detail page shows the pray button.
    const prayButton = page.getByRole('button', { name: /pray for this/i });
    await expect(prayButton).toBeVisible({ timeout: 20_000 });

    await prayButton.click();
    await expect(page.getByRole('button', { name: /prayed for this/i })).toBeVisible({
      timeout: 10_000,
    });

    // Comments section renders below the prayer.
    await expect(page.getByText(/Comments/).first()).toBeVisible();

    // Navigate to profile and sign out.
    await page.goto('/profile');
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/landing/, { timeout: 15_000 });
  });

  test('submits a prayer and sees it in the feed', async ({ page }) => {
    await signIn(page);

    await page.goto('/submit');
    await expect(page.getByPlaceholder(/Share what's on your heart/)).toBeVisible({
      timeout: 20_000,
    });

    const prayerText = `E2E test prayer ${Date.now()}`;
    await page.getByPlaceholder(/Share what's on your heart/).fill(prayerText);

    // Submit and land on the success or detail screen.
    await page.getByRole('button', { name: /submit prayer request/i }).click();
    await expect(page.getByText(/prayer/i).first()).toBeVisible({ timeout: 20_000 });

    // The feed shows the newly submitted prayer.
    await page.goto('/feed');
    await expect(page.getByText(prayerText).first()).toBeVisible({ timeout: 20_000 });
  });

  test('opens profile, settings, and updates screens', async ({ page }) => {
    await signIn(page);

    await page.goto('/profile');
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page).toHaveURL(/\/profile\/settings/, { timeout: 10_000 });

    await page.goto('/updates');
    await expect(page.getByText('Updates').first()).toBeVisible({ timeout: 20_000 });

    await page.goto('/profile/saved');
    await expect(page.getByText(/saved/i).first()).toBeVisible({ timeout: 20_000 });
  });
});
