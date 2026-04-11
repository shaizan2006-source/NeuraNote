import { test, expect } from "@playwright/test";

test.describe("Pricing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pricing");
  });

  test("renders page without crashing", async ({ page }) => {
    await expect(page.locator("h1, h2")).toBeVisible();
  });

  test("shows all 4 plan cards", async ({ page }) => {
    await expect(page.locator("text=Free")).toBeVisible();
    await expect(page.locator("text=Student")).toBeVisible();
    await expect(page.locator("text=Pro")).toBeVisible();
    await expect(page.locator("text=School")).toBeVisible();
  });

  test("shows correct rupee prices", async ({ page }) => {
    await expect(page.locator("text=₹299")).toBeVisible();
    await expect(page.locator("text=₹599")).toBeVisible();
  });

  test("shows 'Most Popular' badge on Student plan", async ({ page }) => {
    await expect(page.locator("text=Most Popular")).toBeVisible();
  });

  test("shows 'Best Value' badge on Pro plan", async ({ page }) => {
    await expect(page.locator("text=Best Value")).toBeVisible();
  });

  test("free plan CTA navigates to signup", async ({ page }) => {
    await page.click("text=Get Started Free");
    await expect(page).toHaveURL(/\/signup/, { timeout: 10_000 });
  });

  test("paid plan redirects to login when not authenticated", async ({ page }) => {
    await page.click("text=Start for ₹299");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test("school plan Contact Us button is visible", async ({ page }) => {
    await expect(page.locator("text=Contact Us")).toBeVisible();
  });

  test("shows Razorpay security notice", async ({ page }) => {
    await expect(page.locator("text=Razorpay")).toBeVisible();
  });

  test("back to dashboard link is present", async ({ page }) => {
    await expect(page.locator("a[href='/dashboard']")).toBeVisible();
  });
});

test.describe("Pricing Page — Mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("plan cards are visible on mobile", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("text=Student")).toBeVisible();
    await expect(page.locator("text=₹299")).toBeVisible();
  });
});
