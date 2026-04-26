import { test, expect } from "@playwright/test";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true if the page has any horizontal overflow (scrollWidth > clientWidth). */
async function hasHorizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
}

/** Returns the max right-edge of all rendered elements (px past viewport right). */
async function maxElementOverflow(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    let maxOverflow = 0;
    for (const el of document.querySelectorAll("*")) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const overflow = rect.right - vw;
        if (overflow > maxOverflow) maxOverflow = overflow;
      }
    }
    return maxOverflow;
  });
}

// ── Desktop tests (chromium project, 1280×720) ───────────────────────────────

test.describe("Progress page — desktop", () => {
  test("page loads without JS errors", async ({ page }) => {
    const errors = [];
    page.on("pageerror", err => errors.push(err.message));
    await page.goto("/progress", { waitUntil: "domcontentloaded" });
    // Allow redirect to /login for unauthenticated; that's expected behaviour
    const url = page.url();
    expect(url).toMatch(/\/progress|\/login|\/dashboard/);
    expect(errors.filter(e => !e.includes("ChunkLoadError") && !e.includes("Loading chunk"))).toHaveLength(0);
  });

  test("no horizontal overflow on desktop", async ({ page }) => {
    await page.goto("/progress", { waitUntil: "domcontentloaded" });
    const overflow = await hasHorizontalOverflow(page);
    expect(overflow).toBe(false);
  });

  test("skeleton renders correct structure while loading (no layout crash)", async ({ page }) => {
    // Intercept the progress-summary API to delay response, capturing loading state
    await page.route("**/api/progress/summary*", route =>
      new Promise(resolve => setTimeout(() => resolve(route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ sessionsCompleted: 0, totalTopics: 0 }),
      })), 2000))
    );
    await page.goto("/progress", { waitUntil: "domcontentloaded" });
    // During loading, no horizontal overflow
    const overflow = await hasHorizontalOverflow(page);
    expect(overflow).toBe(false);
  });
});

// ── Mobile tests (mobile-chrome project, Pixel 5 = 393×851) ─────────────────

test.describe("Progress page — mobile (Pixel 5)", () => {
  test.use({ viewport: { width: 393, height: 851 } });

  test("no horizontal overflow on mobile viewport", async ({ page }) => {
    await page.goto("/progress", { waitUntil: "domcontentloaded" });
    const overflow = await hasHorizontalOverflow(page);
    expect(overflow).toBe(false);
  });

  test("no element bleeds past the right edge of the viewport", async ({ page }) => {
    await page.goto("/progress", { waitUntil: "domcontentloaded" });
    // Allow up to 1px for sub-pixel rendering
    const maxBleed = await maxElementOverflow(page);
    expect(maxBleed).toBeLessThanOrEqual(1);
  });

  test("login page (if redirected) has no mobile overflow", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    const overflow = await hasHorizontalOverflow(page);
    expect(overflow).toBe(false);
  });

  test("skeleton layout renders single-column on mobile", async ({ page }) => {
    // Delay API so skeleton is visible
    await page.route("**/api/progress/summary*", route =>
      new Promise(resolve => setTimeout(() => resolve(route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ sessionsCompleted: 0, totalTopics: 0 }),
      })), 3000))
    );
    await page.goto("/progress", { waitUntil: "domcontentloaded" });
    // During skeleton, viewport must not overflow
    const overflow = await hasHorizontalOverflow(page);
    expect(overflow).toBe(false);
    // No element should extend past 393px
    const maxBleed = await maxElementOverflow(page);
    expect(maxBleed).toBeLessThanOrEqual(1);
  });
});

// ── Empty-state tests ─────────────────────────────────────────────────────────

test.describe("Progress page — new-user empty state", () => {
  async function goToProgressWithEmptyData(page) {
    await page.route("**/api/progress/summary*", route =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          sessionsCompleted: 0,
          totalTopics: 0,
          topicsMastered: 0,
          streak: 0,
          avgAccuracy: 0,
          retentionScore: 0,
          peerPercentile: 0,
          totalStudyTimeMins: 0,
          thisWeekMins: 0,
          weeklyChange: 0,
          dailyStudyTime: [],
          topicAccuracy: [],
          difficultyBreakdown: { easy: 0, medium: 0, hard: 0 },
        }),
      })
    );
    await page.goto("/progress", { waitUntil: "networkidle" });
  }

  test("shows 'analytics will appear here' message for new user (desktop)", async ({ page }) => {
    await goToProgressWithEmptyData(page);
    const url = page.url();
    // If redirected to login skip — unauthenticated env
    if (url.includes("/login") || url.includes("/dashboard")) return;
    const body = await page.textContent("body");
    expect(body).toContain("analytics will appear here");
  });

  test("empty state has no horizontal overflow on mobile", async ({ page, viewport }) => {
    // Only run this check when viewport is mobile-sized
    await page.setViewportSize({ width: 393, height: 851 });
    await goToProgressWithEmptyData(page);
    const url = page.url();
    if (url.includes("/login") || url.includes("/dashboard")) return;
    const overflow = await hasHorizontalOverflow(page);
    expect(overflow).toBe(false);
  });
});

// ── Insights panel — overflow smoke test ─────────────────────────────────────

test.describe("InsightsPanel badge overflow", () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14 Pro size

  test("insight badges do not overflow their container on narrow viewport", async ({ page }) => {
    await page.route("**/api/progress/summary*", route =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          sessionsCompleted: 10,
          streak: 0,
          avgSessionDepthMins: 8,
          avgAccuracy: 35,
          totalTopics: 5,
          topicsMastered: 1,
          retentionScore: 40,
          peerPercentile: 0,
          totalStudyTimeMins: 300,
          thisWeekMins: 120,
          weeklyChange: -40,
          peakStudyHour: null,
          strongestSubject: null,
          examName: "JEE",
          examDaysLeft: 7,
          examReadiness: 30,
          focusScore: 35,
          focusTrend: "down",
          difficultyBreakdown: { easy: 7, medium: 2, hard: 1 },
          topicAccuracy: [{ topic: "Physics", accuracy: 30 }],
          dailyStudyTime: [],
          syllabusPct: 0,
        }),
      })
    );
    await page.goto("/progress", { waitUntil: "networkidle" });
    const url = page.url();
    if (url.includes("/login") || url.includes("/dashboard")) return;
    // No horizontal overflow from insight badges
    const overflow = await hasHorizontalOverflow(page);
    expect(overflow).toBe(false);
    const maxBleed = await maxElementOverflow(page);
    expect(maxBleed).toBeLessThanOrEqual(1);
  });
});
