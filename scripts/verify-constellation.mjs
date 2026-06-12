/**
 * verify-constellation.mjs — Stage 3 harness probe.
 *
 * The standard capture script forces reduced-motion (for diff stability), which
 * correctly DISABLES the idle effect. This probe runs WITHOUT reduced motion,
 * logs in, idles on the target route past IDLE_TIMEOUT, and screenshots the
 * live Constellation Notes effect as evidence.
 *
 * Usage (dev server running):
 *   TEST_EMAIL=... TEST_PASSWORD=... node scripts/verify-constellation.mjs
 * Output: __screens__/stage-3-starfield/{ask-ai,styleguide}-idle-*.png
 */

import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "__screens__", "stage-3-starfield");
const APP_URL = process.env.APP_URL || "http://localhost:3000";

function loadTestCreds() {
  if (process.env.TEST_EMAIL && process.env.TEST_PASSWORD) return;
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^(TEST_EMAIL|TEST_PASSWORD)\s*=\s*"?([^"\r]+)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

async function login(page) {
  const { TEST_EMAIL, TEST_PASSWORD } = process.env;
  if (!TEST_EMAIL || !TEST_PASSWORD) return false;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await page.goto(`${APP_URL}/login`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(500);
      await page.fill('input[type="email"]', TEST_EMAIL);
      await page.fill('input[type="password"]', TEST_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 45000 });
      return true;
    } catch (err) {
      console.warn(`  login attempt ${attempt} failed: ${err.message.split("\n")[0]}`);
    }
  }
  return false;
}

async function probe(page, route, slug, needsAuth, loggedIn) {
  if (needsAuth && !loggedIn) {
    console.warn(`  ⚠ ${route}: skipped (needs auth)`);
    return false;
  }
  console.log(`  Probing ${route} …`);
  await page.goto(`${APP_URL}${route}`, { waitUntil: "load", timeout: 45000 });
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

  // Do NOT interact from here on — idle timer must elapse (5s) + effect develop
  await page.waitForTimeout(8000);
  const visible1 = await page.locator("canvas.ai-dust-canvas.visible").count();
  await page.screenshot({ path: path.join(OUT, `${slug}-idle-8s.png`) });

  await page.waitForTimeout(7000); // catch a comet / second constellation
  const visible2 = await page.locator("canvas.ai-dust-canvas.visible").count();
  await page.screenshot({ path: path.join(OUT, `${slug}-idle-15s.png`) });

  const ok = visible1 > 0 && visible2 > 0;
  console.log(`  ${ok ? "✓" : "✗"} ${route}: canvas.visible at 8s=${visible1 > 0}, 15s=${visible2 > 0}`);
  return ok;
}

async function main() {
  loadTestCreds();
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  // Explicitly NO reducedMotion override — effect must be allowed to run
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const loggedIn = await login(page);
  console.log(`  Auth: ${loggedIn ? "logged in" : "anonymous"}`);

  const r1 = await probe(page, "/sage", "sage", true, loggedIn);
  const r2 = await probe(page, "/styleguide", "styleguide", false, loggedIn);

  // Negative check: effect must NOT run off-allowlist (e.g. /pricing)
  await page.goto(`${APP_URL}/pricing`, { waitUntil: "load", timeout: 45000 });
  await page.waitForTimeout(8000);
  const offRoute = await page.locator("canvas.ai-dust-canvas.visible").count();
  console.log(`  ${offRoute === 0 ? "✓" : "✗"} /pricing: effect correctly ${offRoute === 0 ? "absent" : "PRESENT (bug)"}`);

  await browser.close();
  const pass = r1 && r2 && offRoute === 0;
  console.log(pass ? "\n✅ Constellation effect verified" : "\n✗ Verification failed");
  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
