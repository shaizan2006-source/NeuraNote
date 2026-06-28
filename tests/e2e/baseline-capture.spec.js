/**
 * baseline-capture.spec.js — Phase 0 staging artifact (QA)
 *
 * Captures a clean baseline of the core happy paths for each seeded persona so
 * later-phase regressions are obvious (visual + key API JSON). Builds on the
 * existing playwright.config.js (baseURL, chromium + mobile-chrome projects).
 *
 * Prereqs:
 *   1. Staging Supabase project provisioned + schema applied (docs/qa/STAGING_SETUP.md).
 *   2. node scripts/seed-staging.mjs has run against staging.
 *   3. App running against staging:  next dev  (or a staging preview URL via
 *      BASE_URL=...  PLAYWRIGHT env / playwright config baseURL).
 *
 * Run:
 *   npx playwright test tests/e2e/baseline-capture.spec.js --project=mobile-chrome
 *   (mobile-chrome = Pixel 5; the primary surface for this product)
 *
 * Output:
 *   tests/baseline/<project>/<persona>/<route>.png   — full-page screenshots
 *   tests/baseline/<project>/<persona>/api.json       — captured API responses
 *
 * This is a CAPTURE harness (records the baseline), not an assertion suite.
 * Phase 2 turns the captured artifacts into a regression checklist.
 */
import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PASSWORD = process.env.SEED_PASSWORD || "StagingPass!23";

// Persona → the routes worth capturing for that account state.
const PERSONAS = [
  { key: "free",    email: "free@staging.askmynotes.test" },
  { key: "trial",   email: "trial@staging.askmynotes.test" },
  { key: "student", email: "student@staging.askmynotes.test" },
  { key: "pro",     email: "pro@staging.askmynotes.test" },
  { key: "family",  email: "family@staging.askmynotes.test" },
  { key: "expired", email: "expired@staging.askmynotes.test" },
];

// Core happy-path routes (rendered shell — content may need network).
const ROUTES = [
  ["dashboard", "/dashboard"],
  ["sage", "/sage"],
  ["brain-map", "/brain-map"],
  ["mock-test", "/mock-test"],
  ["study", "/study"],
  ["pyqs", "/pyqs"],
  ["progress", "/progress"],
  ["pricing", "/pricing"],
];

// Authenticated API endpoints to snapshot (token taken from the logged-in session).
const API_ENDPOINTS = [
  "/api/trial/status",
  "/api/cards/due",
  "/api/streak/status",
  "/api/mock-test/history",
  "/api/documents",
];

async function login(page, email) {
  await page.goto("/login");
  await page.fill("input[type='email']", email);
  await page.fill("input[type='password']", PASSWORD);
  await page.click("button[type='submit']");
  // Land somewhere authenticated (dashboard or onboarding).
  await page.waitForURL(/\/(dashboard|onboarding|trial|welcome-back|$)/, { timeout: 20_000 })
    .catch(() => { /* some personas may route differently; capture anyway */ });
}

/** Pull the Supabase access token the app stores in localStorage. */
async function getAccessToken(page) {
  return page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.includes("auth-token")) {
        try { return JSON.parse(localStorage.getItem(k))?.access_token || null; }
        catch { /* ignore */ }
      }
    }
    return null;
  });
}

for (const persona of PERSONAS) {
  test.describe(`baseline · ${persona.key}`, () => {
    test(`capture ${persona.key}`, async ({ page }, testInfo) => {
      // Next dev compiles each route on first hit (seconds each). Run --workers=1
      // so routes compile once and later personas reuse them. Generous per-test
      // budget covers the first persona's cold compile of every route.
      test.setTimeout(300_000);
      const outDir = join("tests", "baseline", testInfo.project.name, persona.key);
      mkdirSync(outDir, { recursive: true });

      await login(page, persona.email);

      // Capture every route; never abort mid-loop. Record problems and assert at the end
      // so all artifacts land regardless.
      const errors = [];
      for (const [name, route] of ROUTES) {
        try {
          await page.goto(route, { waitUntil: "domcontentloaded", timeout: 45_000 });
        } catch (e) {
          errors.push(`${name}: goto ${e.message.split("\n")[0]}`);
        }
        // Brief settle — NOT networkidle (dev streams/polls may never idle).
        await page.waitForTimeout(1200);
        await page.screenshot({ path: join(outDir, `${name}.png`), fullPage: true, timeout: 25_000 })
          .catch((e) => errors.push(`${name}: screenshot ${e.message.split("\n")[0]}`));
        // The non-negotiable bar: no white screen / raw stack trace on a core route.
        const bodyText = (await page.locator("body").innerText().catch(() => "")) || "";
        if (/Application error: a client-side exception|Unhandled Runtime Error|Internal Server Error/i.test(bodyText)) {
          errors.push(`${name}: ERROR PAGE`);
        }
        if (bodyText.trim().length < 5) errors.push(`${name}: BLANK PAGE`);
      }

      // API JSON baseline.
      const token = await getAccessToken(page);
      const api = {};
      for (const ep of API_ENDPOINTS) {
        const res = await page.request.get(ep, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }).catch(() => null);
        api[ep] = res ? { status: res.status(), body: (await res.text().catch(() => null))?.slice(0, 2000) } : { status: "ERR" };
      }
      writeFileSync(join(outDir, "api.json"), JSON.stringify({ token: token ? "present" : "MISSING", api, errors }, null, 2));

      // Soft gate: artifacts are written above; this only flags pages that errored/blanked.
      expect(errors, `baseline issues for ${persona.key}: ${errors.join(" | ")}`).toEqual([]);
    });
  });
}
