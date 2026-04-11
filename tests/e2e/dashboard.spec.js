import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("loads without error", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    // No 500 error
    await expect(page.locator("text=Internal Server Error")).not.toBeVisible();
    await expect(page.locator("text=Application error")).not.toBeVisible();
  });

  test("page has a title", async ({ page }) => {
    await page.goto("/");
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });
});

test.describe("Dashboard Access Control", () => {
  test("unauthenticated access redirects away from dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    // Should redirect to login or onboarding — not stay on /dashboard
    await page.waitForURL(/\/(login|onboarding|$)/, { timeout: 10_000 });
    const url = page.url();
    expect(url).not.toMatch(/\/dashboard$/);
  });
});

test.describe("SEO Routes", () => {
  test("robots.txt returns correct content", async ({ page }) => {
    const res = await page.goto("/robots.txt");
    expect(res?.status()).toBe(200);
    const body = await page.content();
    expect(body).toMatch(/User-agent/i);
  });

  test("sitemap.xml returns valid XML", async ({ page }) => {
    const res = await page.goto("/sitemap.xml");
    expect(res?.status()).toBe(200);
    const body = await page.content();
    expect(body).toMatch(/urlset|sitemapindex/i);
  });
});

test.describe("Onboarding Page", () => {
  test("loads without crashing", async ({ page }) => {
    await page.goto("/onboarding");
    // Either shows onboarding content or redirects (if not authed)
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("text=Application error")).not.toBeVisible();
  });
});

test.describe("Mobile Layout", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("home page renders on mobile without layout overflow", async ({ page }) => {
    await page.goto("/");
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = 375;
    // Body should not overflow horizontally on mobile
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20);
  });
});
