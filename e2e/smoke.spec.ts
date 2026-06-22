import { test, expect } from "@playwright/test";

test("landing page loads", async ({ page }) => {
  await page.goto("/landing");
  await expect(page.getByText("Oratio")).toBeVisible();
});

test("login page is accessible from landing", async ({ page }) => {
  await page.goto("/landing");
  await page.getByText("Sign In").click();
  await expect(page).toHaveURL("/login");
});

test("feed page loads for anonymous users", async ({ page }) => {
  await page.goto("/feed");
  await expect(page.getByText("Prayer")).toBeVisible();
});
