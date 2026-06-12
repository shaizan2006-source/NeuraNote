/**
 * verify-sage-stream.mjs — Stage 5 harness probe.
 *
 * Proves the ask/streaming pipeline survived the re-skin: logs in, opens /sage,
 * sends a real question, and watches the answer stream in. Captures evidence
 * screenshots (mid-stream + settled) to __screens__/stage-5-sage/.
 *
 * Usage (dev server running):
 *   TEST_EMAIL=... TEST_PASSWORD=... node scripts/verify-sage-stream.mjs
 */

import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "__screens__", "stage-5-sage");
const APP_URL = process.env.APP_URL || "http://localhost:3000";
const QUESTION = "In one short paragraph, what is Ohm's law?";

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

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  if (!(await login(page))) {
    console.error("✗ Could not log in — set TEST_EMAIL/TEST_PASSWORD");
    process.exit(1);
  }
  console.log("  Logged in ✓");

  await page.goto(`${APP_URL}/sage`, { waitUntil: "load", timeout: 45000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.screenshot({ path: path.join(OUT, "probe-1-empty-hero.png") });

  const textarea = page.locator("textarea").first();
  await textarea.waitFor({ timeout: 15000 });
  const before = await page.evaluate(() => document.body.innerText.length);

  await textarea.fill(QUESTION);
  await textarea.press("Enter");
  console.log(`  Sent: "${QUESTION}"`);

  // Watch the page text grow as the answer streams (cumulative, beyond the echoed question)
  let grew = false;
  let last = before;
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(2000);
    const now = await page.evaluate(() => document.body.innerText.length);
    if (i === 4) await page.screenshot({ path: path.join(OUT, "probe-2-streaming.png") });
    if (now - before > QUESTION.length + 200) grew = true;
    if (grew && now === last) break; // stream settled
    last = now;
  }

  await page.screenshot({ path: path.join(OUT, "probe-3-answer.png") });
  const bodyText = await page.evaluate(() => document.body.innerText);
  const hasAnswerWords = /ohm|current|voltage|resistance/i.test(bodyText.slice(-2500));
  const hasLimitMsg = /limit|upgrade to pro|quota/i.test(bodyText.slice(-1200));

  console.log(`  Body grew: ${grew}; answer-like content: ${hasAnswerWords}; limit message: ${hasLimitMsg}`);
  if (grew && hasAnswerWords) {
    console.log("\n✅ Streaming pipeline verified — answer streamed in on /sage");
    await browser.close();
    process.exit(0);
  }
  console.error(hasLimitMsg
    ? "\n⚠ Question blocked by plan limit — pipeline reached but not streamed. Try the other dev account."
    : "\n✗ No streamed answer detected — inspect probe screenshots");
  await browser.close();
  process.exit(1);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
