import { test, expect } from "@playwright/test";

// ── Phase 1: AUTH + URL/ROUTING behavior on staging ──────────────────────────
// App facts discovered during authoring (see findings):
//  • There is NO root src/app/not-found.js → Next.js serves its built-in 404.
//  • Auth gating is CLIENT-side. /dashboard and /sage push("/login") via
//    DashboardContext when there is no Supabase session. /study renders an
//    in-place error state (no redirect). /mock-test does NOT gate at all.
//  • next.config.mjs redirects /ask-ai → /sage and /chat → /sage (permanent:true,
//    which Next emits as HTTP 308).
//  • /pyqs/[slug] is a server component: valid slug → 200, missing → notFound() (404).

const CREDS = { email: "free@staging.askmynotes.test", password: "StagingPass!23" };

const CRASH_MARKERS = [
  "Application error",
  "Unhandled Runtime Error",
  "Internal Server Error",
  "client-side exception",
  "TypeError:",
  "ReferenceError:",
];

// Text that would mean authed content leaked to a logged-out visitor.
const AUTHED_LEAK_MARKERS = ["Log out", "Sign out", "Logout"];

async function bodyText(page) {
  return (await page.locator("body").innerText().catch(() => "")) || "";
}

function assertNoCrash(text, where) {
  for (const m of CRASH_MARKERS) {
    expect(text, `${where}: page shows crash marker "${m}"`).not.toContain(m);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
test.describe("Phase 1 — unknown URL", () => {
  test("/no-such-page-zzz renders a real 404, not a white screen", async ({ page }) => {
    const resp = await page.goto("/no-such-page-zzz", { waitUntil: "domcontentloaded" });
    expect(resp?.status(), "HTTP status for unknown URL").toBe(404);

    const text = await bodyText(page);
    expect(text.trim().length, "body must be non-empty").toBeGreaterThan(0);
    assertNoCrash(text, "unknown URL");

    // Next.js default not-found says "This page could not be found" / "404".
    const lc = text.toLowerCase();
    const looksLikeNotFound =
      lc.includes("not found") ||
      lc.includes("could not be found") ||
      lc.includes("404") ||
      lc.includes("doesn't exist") ||
      lc.includes("does not exist");
    expect(looksLikeNotFound, `404 page should show not-found-ish text. Got: ${text.slice(0, 200)}`).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe("Phase 1 — protected routes while logged out", () => {
  // Ensure a clean, logged-out context for these tests.
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.clear(); sessionStorage.clear(); } catch {}
    });
  });

  // /dashboard and /sage actively redirect to /login (client-side).
  for (const route of ["/dashboard", "/sage"]) {
    test(`${route} (logged out) redirects to /login`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      // Client redirect happens after Supabase getSession() resolves.
      await page.waitForURL(/\/login/, { timeout: 12_000 });
      expect(page.url(), `${route} should land on /login`).toContain("/login");

      const text = await bodyText(page);
      assertNoCrash(text, route);
      for (const leak of AUTHED_LEAK_MARKERS) {
        expect(text, `${route}: authed control "${leak}" leaked while logged out`).not.toContain(leak);
      }
    });
  }

  // /study and /mock-test gate differently — accept redirect OR an auth/empty
  // gate, but they must NOT expose authed user content or crash.
  for (const route of ["/study", "/mock-test"]) {
    test(`${route} (logged out) does not expose authed content`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      // Give any client-side redirect a chance to fire.
      await page.waitForTimeout(3_500);

      const url = page.url();
      const text = await bodyText(page);
      assertNoCrash(text, route);
      expect(text.trim().length, `${route}: body must be non-empty`).toBeGreaterThan(0);

      const redirected = /\/login/.test(url);
      if (!redirected) {
        // Stayed on the route: must not have leaked an authed-only control.
        for (const leak of AUTHED_LEAK_MARKERS) {
          expect(text, `${route}: authed control "${leak}" leaked while logged out`).not.toContain(leak);
        }
      }
      // Record where it ended up for the report.
      test.info().annotations.push({ type: "behavior", description: `${route} logged-out → ${redirected ? "redirect /login" : `stayed at ${url}`}` });
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe("Phase 1 — dynamic /pyqs/[slug]", () => {
  test("valid slug seed-jee-1 loads", async ({ page }) => {
    const resp = await page.goto("/pyqs/seed-jee-1", { waitUntil: "domcontentloaded" });
    expect(resp?.status(), "valid PYQ slug HTTP status").toBe(200);
    const text = await bodyText(page);
    assertNoCrash(text, "/pyqs/seed-jee-1");
    expect(text.trim().length, "valid PYQ body must be non-empty").toBeGreaterThan(0);
    // The seeded question is Physics/JEE — page renders a "Question" block.
    expect(text.toLowerCase(), "valid PYQ should render question content").toContain("question");
  });

  test("invalid slug → graceful 404, not a crash", async ({ page }) => {
    // notFound() inside the nested /pyqs/[slug] route hydrates its not-found
    // boundary client-side, so the visible text appears after hydration (the
    // initial domcontentloaded body is empty). Wait for networkidle + the text.
    const resp = await page.goto("/pyqs/invalid-slug-zzz-99", { waitUntil: "networkidle" });
    expect(resp?.status(), "invalid PYQ slug HTTP status").toBe(404);

    // Poll until the not-found boundary has rendered (or time out → real bug).
    await expect.poll(async () => (await bodyText(page)).trim().length, { timeout: 8_000 })
      .toBeGreaterThan(0);

    const text = await bodyText(page);
    assertNoCrash(text, "/pyqs/invalid-slug");
    const lc = text.toLowerCase();
    expect(lc.includes("not found") || lc.includes("could not be found") || lc.includes("404"),
      `invalid slug should show not-found-ish text. Got: ${text.slice(0, 200)}`).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe("Phase 1 — configured redirects", () => {
  for (const [from, to] of [["/ask-ai", "/sage"], ["/chat", "/sage"]]) {
    test(`${from} permanently redirects to ${to}`, async ({ page }) => {
      // Inspect the raw redirect response without following it.
      const resp = await page.request.get(from, { maxRedirects: 0 });
      const status = resp.status();
      expect([301, 308], `${from} should be a permanent redirect (301/308)`).toContain(status);
      const location = resp.headers()["location"] || "";
      expect(location, `${from} Location header → ${to}`).toContain(to);
    });
  }

  test("/ask-ai followed through lands on /sage", async ({ page }) => {
    await page.goto("/ask-ai", { waitUntil: "domcontentloaded" });
    expect(page.url(), "after following /ask-ai redirect").toContain("/sage");
    const text = await bodyText(page);
    assertNoCrash(text, "/ask-ai → /sage");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe("Phase 1 — auth flow (login as free@)", () => {
  test("login via form lands authenticated and a protected route is reachable", async ({ page }) => {
    // networkidle so the Supabase client + form handler are fully hydrated before
    // we submit — submitting too early can no-op the click (no token request fires).
    await page.goto("/login", { waitUntil: "networkidle" });
    await expect(page.locator("input[type='email']")).toBeVisible();

    await page.fill("input[type='email']", CREDS.email);
    await page.fill("input[type='password']", CREDS.password);

    // Wait for the Supabase token call to confirm the submit actually fired.
    const tokenResp = page
      .waitForResponse((r) => r.url().includes("/auth/v1/token") && r.request().method() === "POST", { timeout: 20_000 })
      .catch(() => null);
    await page.locator("button[type='submit']").click();
    const tr = await tokenResp;
    if (tr) {
      expect(tr.status(), "Supabase password-grant should return 200").toBe(200);
    }

    // On success the login page sets window.location.href = "/dashboard".
    // DashboardContext then pushes to /onboarding if onboarding is incomplete
    // (free@ has onboarding_completed = null → lands on /onboarding). Accept any
    // authenticated landing that is NOT /login.
    await page.waitForURL((url) => !/\/login(\b|\/|$)/.test(url.pathname), { timeout: 20_000 });
    const landedUrl = page.url();
    expect(landedUrl, "after login should leave /login").not.toContain("/login");

    const text = await bodyText(page);
    assertNoCrash(text, "post-login landing");
    test.info().annotations.push({ type: "behavior", description: `post-login landed at ${landedUrl}` });

    // Now a protected route should be reachable while authenticated: it must NOT
    // bounce back to /login. (For an onboarding-incomplete user it may route to
    // /onboarding instead — that is still authenticated, just not /login.)
    await page.goto("/sage", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(4_000);
    expect(page.url(), "/sage while authenticated should not redirect to /login").not.toContain("/login");
    const sageText = await bodyText(page);
    assertNoCrash(sageText, "/sage authenticated");

    // Logout control discovery (best-effort): note whether one exists.
    const logout = page.getByText(/log\s?out|sign\s?out/i);
    const hasLogout = (await logout.count()) > 0;
    test.info().annotations.push({ type: "logout", description: hasLogout ? "logout control present" : "no obvious logout control on /sage" });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe("Phase 1 — deep link + back/forward", () => {
  test("deep link then back/forward never lands on a broken state", async ({ page }) => {
    // Two public routes to navigate between.
    await page.goto("/pyqs/seed-jee-1", { waitUntil: "domcontentloaded" });
    expect((await bodyText(page)).trim().length).toBeGreaterThan(0);

    await page.goto("/pricing", { waitUntil: "domcontentloaded" });
    expect((await bodyText(page)).trim().length).toBeGreaterThan(0);

    await page.goBack({ waitUntil: "domcontentloaded" });
    let text = await bodyText(page);
    assertNoCrash(text, "after goBack");
    expect(page.url(), "back should return to the PYQ deep link").toContain("/pyqs/seed-jee-1");
    expect(text.trim().length, "back target body non-empty").toBeGreaterThan(0);

    await page.goForward({ waitUntil: "domcontentloaded" });
    text = await bodyText(page);
    assertNoCrash(text, "after goForward");
    expect(text.trim().length, "forward target body non-empty").toBeGreaterThan(0);
  });
});
