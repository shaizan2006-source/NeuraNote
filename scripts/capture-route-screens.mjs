/**
 * capture-route-screens.mjs — Stage 0 verification harness (REDESIGN_MASTER_PROMPT.md §9).
 *
 * Captures every key route at desktop 1440px + mobile 390px into __screens__/<stage>/.
 * Uses @playwright/test's bundled chromium (already a devDependency — NOT the old
 * puppeteer-based scripts/capture-screenshots.mjs, which needs a manual install).
 *
 * Usage (dev server must already be running — script fails fast if not):
 *   node scripts/capture-route-screens.mjs <stage-name>        # default: stage-0-baseline
 *   APP_URL=http://localhost:3000 node scripts/capture-route-screens.mjs stage-1-tokens
 *
 * Auth: set TEST_EMAIL / TEST_PASSWORD (env or .env.local) to capture auth-gated
 * routes logged-in. Without creds they're still captured (showing the anonymous
 * redirect) and flagged in the output.
 */

import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const STAGE = process.argv[2] || "stage-0-baseline";
const APP_URL = process.env.APP_URL || "http://localhost:3000";
const OUT_DIR = path.join(ROOT, "__screens__", STAGE);

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

// Key routes from REDESIGN_MASTER_PROMPT.md §1.
const ROUTES = [
  { path: "/", auth: false },
  { path: "/login", auth: false },
  { path: "/signup", auth: false },
  { path: "/forgot-password", auth: false },
  { path: "/pricing", auth: false },
  { path: "/styleguide", auth: false },
  { path: "/dashboard", auth: true },
  { path: "/ask-ai", auth: true },
  { path: "/chat", auth: true },
  { path: "/call-tutor", auth: true },
  { path: "/quiz/friday", auth: true },
  { path: "/mock-test", auth: true },
  { path: "/pyqs", auth: true },
  { path: "/brain-map", auth: true },
  { path: "/cohort", auth: true },
  { path: "/onboarding", auth: true },
];

// Pick up TEST_EMAIL / TEST_PASSWORD from .env.local if not already in env.
function loadTestCreds() {
  if (process.env.TEST_EMAIL && process.env.TEST_PASSWORD) return;
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^(TEST_EMAIL|TEST_PASSWORD)\s*=\s*"?([^"\r]+)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

async function serverUp() {
  try {
    const res = await fetch(APP_URL, { signal: AbortSignal.timeout(5000) });
    return res.status < 500;
  } catch {
    return false;
  }
}

async function login(page) {
  const { TEST_EMAIL, TEST_PASSWORD } = process.env;
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    console.warn("⚠ TEST_EMAIL / TEST_PASSWORD not set — auth-gated routes captured as anonymous");
    return false;
  }
  console.log(`  Logging in as ${TEST_EMAIL}…`);
  try {
    await page.goto(`${APP_URL}/login`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15000 });
    console.log("  Logged in ✓");
    return true;
  } catch (err) {
    console.warn(`  ⚠ Login failed (${err.message.split("\n")[0]}) — continuing anonymous`);
    return false;
  }
}

function fileNameFor(route, viewport) {
  const slug = route.path === "/" ? "landing" : route.path.replace(/^\//, "").replace(/\//g, "_");
  return `${slug}.${viewport.name}.png`;
}

async function main() {
  loadTestCreds();

  if (!(await serverUp())) {
    console.error(`✗ No server at ${APP_URL}. Start it first: npm run dev`);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`\nCapturing ${ROUTES.length} routes × ${VIEWPORTS.length} viewports from ${APP_URL}`);
  console.log(`Output: ${OUT_DIR}\n`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORTS[0],
    reducedMotion: "reduce", // freeze animations for stable diffs
    colorScheme: "dark",
  });
  const page = await context.newPage();

  const loggedIn = await login(page);

  let failures = 0;
  const notes = [];

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const route of ROUTES) {
      const file = fileNameFor(route, viewport);
      try {
        await page.goto(`${APP_URL}${route.path}`, { waitUntil: "load", timeout: 30000 });
        await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(800); // settle fonts/late paints

        const finalPath = new URL(page.url()).pathname;
        const redirected = finalPath !== route.path;
        if (route.auth && !loggedIn && redirected) {
          notes.push(`${file}: anonymous — redirected to ${finalPath}`);
        } else if (redirected) {
          notes.push(`${file}: redirected to ${finalPath}`);
        }

        await page.screenshot({ path: path.join(OUT_DIR, file), fullPage: true });
        console.log(`  ✓ ${file}${redirected ? `  (→ ${finalPath})` : ""}`);
      } catch (err) {
        failures++;
        console.error(`  ✗ ${file}: ${err.message.split("\n")[0]}`);
      }
    }
  }

  await browser.close();

  if (notes.length) {
    console.log("\nRedirect notes:");
    notes.forEach((n) => console.log(`  ⚠ ${n}`));
  }
  console.log(
    failures === 0
      ? `\n✅ All ${ROUTES.length * VIEWPORTS.length} screenshots captured → ${OUT_DIR}`
      : `\n⚠ ${failures} capture(s) failed`
  );
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
