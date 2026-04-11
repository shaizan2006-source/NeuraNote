import { test, expect } from "@playwright/test";

test.describe("Login Page", () => {
  test("renders all form elements", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("input[type='email']")).toBeVisible();
    await expect(page.locator("input[type='password']")).toBeVisible();
    await expect(page.locator("button[type='submit']")).toBeVisible();
  });

  test("shows forgot password link", async ({ page }) => {
    await page.goto("/login");
    const link = page.locator("a[href='/forgot-password']");
    await expect(link).toBeVisible();
  });

  test("shows Google OAuth button", async ({ page }) => {
    await page.goto("/login");
    const googleBtn = page.locator("text=Continue with Google");
    await expect(googleBtn).toBeVisible();
  });

  test("shows error for invalid email format", async ({ page }) => {
    await page.goto("/login");
    await page.fill("input[type='email']", "notanemail");
    await page.fill("input[type='password']", "SomePass1");
    await page.click("button[type='submit']");
    await expect(page.locator("text=valid email")).toBeVisible({ timeout: 5_000 });
  });

  test("shows error for wrong credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill("input[type='email']", "nosuchuser99@test.example.com");
    await page.fill("input[type='password']", "WrongPass123");
    await page.click("button[type='submit']");
    // Auth error or "Incorrect email or password"
    await expect(
      page.locator("text=Incorrect email").or(page.locator("text=Authentication failed"))
    ).toBeVisible({ timeout: 15_000 });
  });

  test("password show/hide toggle works", async ({ page }) => {
    await page.goto("/login");
    const pwInput = page.locator("input[name='password'], input[type='password']");
    // Initially hidden
    await expect(pwInput).toHaveAttribute("type", "password");
    // Click the toggle button
    await page.locator("button[aria-label*='password'], button:has-text('👁'), button:has-text('Show')").first().click();
    await expect(pwInput).toHaveAttribute("type", "text");
  });

  test("rate limits after 5 failed attempts", async ({ page }) => {
    await page.goto("/login");
    // 5 rapid failed attempts
    for (let i = 0; i < 5; i++) {
      await page.fill("input[type='email']", "ratetest@example.com");
      await page.fill("input[type='password']", `WrongPass${i}`);
      await page.click("button[type='submit']");
      await page.waitForTimeout(200);
    }
    // 6th attempt — should hit client-side rate limit
    await page.fill("input[type='email']", "ratetest@example.com");
    await page.fill("input[type='password']", "WrongPass999");
    await page.click("button[type='submit']");
    await expect(page.locator("text=Too many attempts")).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Signup Page", () => {
  test("renders form with all required fields", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator("input[type='email']")).toBeVisible();
    await expect(page.locator("input[type='password']").first()).toBeVisible();
    await expect(page.locator("button[type='submit']")).toBeVisible();
  });

  test("shows Google OAuth button", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator("text=Continue with Google")).toBeVisible();
  });

  test("shows password strength feedback on typing", async ({ page }) => {
    await page.goto("/signup");
    const pwInput = page.locator("input[type='password']").first();
    await pwInput.fill("weak");
    await expect(page.locator("text=Weak")).toBeVisible({ timeout: 3_000 });
  });

  test("shows Strong label for a strong password", async ({ page }) => {
    await page.goto("/signup");
    const pwInput = page.locator("input[type='password']").first();
    await pwInput.fill("MyStr0ng!Pass123");
    await expect(page.locator("text=Strong")).toBeVisible({ timeout: 3_000 });
  });

  test("rejects submission with invalid email", async ({ page }) => {
    await page.goto("/signup");
    await page.fill("input[type='email']", "bad-email");
    await page.locator("input[type='password']").first().fill("StrongPass1");
    await page.click("button[type='submit']");
    await expect(page.locator("text=valid email")).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Forgot Password Page", () => {
  test("shows email input and submit button", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.locator("input[type='email']")).toBeVisible();
    await expect(page.locator("button[type='submit']")).toBeVisible();
  });

  test("shows success message after submitting valid email", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.fill("input[type='email']", "anyuser@example.com");
    await page.click("button[type='submit']");
    // Generic success (doesn't confirm email existence)
    await expect(page.locator("text=Check your email").or(page.locator("text=sent"))).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe("Reset Password Page", () => {
  test("page loads without crashing", async ({ page }) => {
    await page.goto("/reset-password");
    // Should show a form or a redirect message
    await expect(page.locator("body")).toBeVisible();
  });
});
