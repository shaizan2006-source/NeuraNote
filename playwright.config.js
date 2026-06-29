import { defineConfig, devices } from "@playwright/test";

// Target a remote staging deployment by setting PLAYWRIGHT_BASE_URL; otherwise run
// against a local dev server. When pointed remote we must NOT auto-spawn `npm run dev`.
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const IS_LOCAL = BASE_URL.includes("localhost") || BASE_URL.includes("127.0.0.1");

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],
  // Auto-start a local dev server only when testing against localhost. Against a
  // remote staging URL (PLAYWRIGHT_BASE_URL) we hit the deployed app directly.
  webServer: IS_LOCAL
    ? {
        command: "npm run dev",
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
});
