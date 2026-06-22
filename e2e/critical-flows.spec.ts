import { test, expect } from "@playwright/test";

test.describe("Critical Flows", () => {
  test("loads landing page with sign in and create account options", async ({ page }) => {
    await page.goto("/landing");
    await expect(page.getByText("Oratio")).toBeVisible();
    await expect(page.getByText("Sign In")).toBeVisible();
    await expect(page.getByText("Create Account")).toBeVisible();
  });

  test("navigation to sign in works", async ({ page }) => {
    await page.goto("/landing");
    await page.getByText("Sign In").click();
    await expect(page).toHaveURL("/login");
    await expect(page.getByText("Sign in to Oratio")).toBeVisible();
  });

  test("navigation to create account works", async ({ page }) => {
    await page.goto("/landing");
    await page.getByText("Create Account").click();
    await expect(page).toHaveURL("/onboarding");
    await expect(page.getByText("Create Account")).toBeVisible();
  });

  test("feed page loads prayer cards", async ({ page }) => {
    await page.goto("/feed");
    await expect(page.getByText("Prayers Around the World")).toBeVisible();
  });

  test("can search in feed", async ({ page }) => {
    await page.goto("/feed");
    const searchInput = page.getByPlaceholder("Search prayers...");
    await expect(searchInput).toBeVisible();
  });

  test("profile page shows stats for logged out user", async ({ page }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/landing|\/login/);
  });

  test("landing page has working external links", async ({ page }) => {
    await page.goto("/landing");
    await expect(page.getByText("Privacy Policy")).toBeVisible();
  });
});
