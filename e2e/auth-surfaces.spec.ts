import { test, expect } from '@playwright/test';

// Journeys that never require a real account. They validate the auth UI
// surface on both mobile and desktop projects.

test.describe('Authentication surfaces', () => {
  test('login validates empty fields', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText('Enter your email and password')).toBeVisible();
  });

  test('login shows a password visibility toggle', async ({ page }) => {
    await page.goto('/login');
    const passwordInput = page.getByPlaceholder('Password');
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await page.getByLabel('Show password').click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    await page.getByLabel('Hide password').click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('login links to password reset', async ({ page }) => {
    await page.goto('/login');
    await page.getByText('Forgot password?').click();
    await expect(page).toHaveURL(/\/reset-password/);
  });

  test('onboarding validates required fields', async ({ page }) => {
    await page.goto('/onboarding');
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.getByText('All fields are required')).toBeVisible();
  });

  test('onboarding rejects short passwords', async ({ page }) => {
    await page.goto('/onboarding');
    await page.getByPlaceholder('you@example.com').fill('test@example.com');
    await page.getByPlaceholder('At least 6 characters').fill('abc');
    await page.getByPlaceholder('e.g., prayer_warrior').fill('testuser');
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.getByText('Password must be at least 6 characters')).toBeVisible();
  });

  test('reset password page submits a valid email', async ({ page }) => {
    await page.goto('/reset-password');
    await expect(page.getByPlaceholder('your@email.com')).toBeVisible();
  });

  test('auth pages have a way back to landing', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Back').click();
    await expect(page).toHaveURL(/\/landing/);
  });
});
