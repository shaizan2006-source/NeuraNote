/**
 * Screenshot capture script for Product Hunt gallery.
 * Run AFTER the app is running locally or against production.
 *
 * Usage:
 *   npm install puppeteer   (one-time, not in package.json)
 *   APP_URL=http://localhost:3000 node scripts/capture-screenshots.mjs
 *   APP_URL=https://yourdomain.com node scripts/capture-screenshots.mjs
 *
 * Output: docs/launch/screenshots/01_brain_map.png ... 05_progress_dashboard.png
 *         docs/launch/screenshots/THUMBNAIL.png
 *
 * Requirements:
 *   - App must be running and logged in via TEST_EMAIL/TEST_PASSWORD env vars
 *   - Or: skip auth and capture public pages only (set SKIP_AUTH=true)
 */

import puppeteer from "puppeteer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, "../docs/launch/screenshots");
const APP_URL = process.env.APP_URL || "http://localhost:3000";
const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;
const SKIP_AUTH = process.env.SKIP_AUTH === "true";

const GALLERY_SIZE = { width: 1024, height: 768 };
const THUMBNAIL_SIZE = { width: 500, height: 500 };

const SHOTS = [
  {
    filename: "01_brain_map.png",
    url: "/brain-map",
    description: "Brain Map visualization — concepts connected",
    requiresAuth: true,
    waitFor: ".brain-map-canvas, [data-testid=brain-map], svg",
    waitTimeout: 8000,
  },
  {
    filename: "02_daily_briefing.png",
    url: "/dashboard",
    description: "Daily Briefing player UI",
    requiresAuth: true,
    waitFor: "[data-testid=briefing], .briefing-player, .daily-briefing",
    waitTimeout: 5000,
    scrollY: 400,
  },
  {
    filename: "03_qa_with_sources.png",
    url: "/ask-ai",
    description: "Q&A streaming with source chips",
    requiresAuth: true,
    waitFor: ".ask-input, textarea, [data-testid=ask-input]",
    waitTimeout: 5000,
  },
  {
    filename: "04_pyq_practice.png",
    url: "/pyqs",
    description: "PYQ search and practice",
    requiresAuth: true,
    waitFor: "[data-testid=pyq-list], .pyq-card, .pyq-item",
    waitTimeout: 5000,
  },
  {
    filename: "05_progress_dashboard.png",
    url: "/dashboard",
    description: "Analytics / progress view",
    requiresAuth: true,
    waitFor: ".dashboard-stats, [data-testid=dashboard], .progress-ring",
    waitTimeout: 5000,
  },
];

async function login(page) {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    console.warn("⚠ TEST_EMAIL / TEST_PASSWORD not set — skipping login");
    return false;
  }
  console.log("  Logging in as", TEST_EMAIL);
  await page.goto(`${APP_URL}/login`, { waitUntil: "networkidle2" });
  await page.type('input[type="email"]', TEST_EMAIL);
  await page.type('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 10000 }).catch(() => {});
  console.log("  Logged in ✓");
  return true;
}

async function captureShot(page, shot, size) {
  const url = `${APP_URL}${shot.url}`;
  console.log(`  → ${shot.filename} (${shot.description})`);

  await page.goto(url, { waitUntil: "networkidle2", timeout: 15000 });

  // Wait for key element
  await page.waitForSelector(shot.waitFor, { timeout: shot.waitTimeout }).catch(() => {
    console.warn(`    ⚠ waitFor selector not found: ${shot.waitFor}`);
  });

  // Optional scroll
  if (shot.scrollY) {
    await page.evaluate((y) => window.scrollTo(0, y), shot.scrollY);
    await new Promise(r => setTimeout(r, 500));
  }

  // Remove any cookie banners / overlays that might obscure the screenshot
  await page.evaluate(() => {
    const selectors = [".cookie-banner", "[data-testid=cookie]", ".onboarding-overlay"];
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => el.remove());
    });
  });

  // Wait a beat for animations to settle
  await new Promise(r => setTimeout(r, 1000));

  const outPath = path.join(SCREENSHOTS_DIR, shot.filename);
  await page.screenshot({ path: outPath, clip: { x: 0, y: 0, ...size } });
  console.log(`    ✓ saved ${shot.filename}`);
}

async function captureThumbnail(page) {
  console.log("  → THUMBNAIL.png (500×500 landing page hero)");
  await page.setViewport({ width: 1200, height: 800 });
  await page.goto(APP_URL, { waitUntil: "networkidle2", timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));

  // Crop the hero section (top 500px × centred 500px)
  const outPath = path.join(SCREENSHOTS_DIR, "THUMBNAIL.png");
  await page.screenshot({
    path: outPath,
    clip: { x: 350, y: 0, width: 500, height: 500 },
  });
  console.log("    ✓ saved THUMBNAIL.png");
}

async function main() {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  console.log(`\nCapturing screenshots from: ${APP_URL}`);
  console.log(`Output: ${SCREENSHOTS_DIR}\n`);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport(GALLERY_SIZE);

  // Dark mode to match app theme
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);

  // Auth
  const loggedIn = SKIP_AUTH ? false : await login(page);

  // Capture gallery shots
  let failures = 0;
  for (const shot of SHOTS) {
    if (shot.requiresAuth && !loggedIn && !SKIP_AUTH) {
      console.warn(`  ⚠ Skipped ${shot.filename} (requires auth)`);
      continue;
    }
    try {
      await captureShot(page, shot, GALLERY_SIZE);
    } catch (err) {
      console.error(`  ✗ ${shot.filename}: ${err.message}`);
      failures++;
    }
  }

  // Thumbnail
  try {
    await captureThumbnail(page);
  } catch (err) {
    console.error(`  ✗ THUMBNAIL.png: ${err.message}`);
    failures++;
  }

  await browser.close();

  console.log(`\n${failures === 0 ? "✅ All screenshots captured" : `⚠ ${failures} failures`}`);
  console.log(`Files in: ${SCREENSHOTS_DIR}`);

  if (failures > 0) process.exit(1);
}

main().catch(err => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
