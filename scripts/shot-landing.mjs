// Landing capture that scrolls to trigger useInView sections, then shoots full page + hero.
import { chromium } from "@playwright/test";
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "..", "__screens__", "stage-8h-landing");
fs.mkdirSync(OUT, { recursive: true });
const APP = "http://localhost:3000";
const b = await chromium.launch();
for (const [name, w, h] of [["desktop", 1440, 900], ["mobile", 390, 844]]) {
  const pg = await b.newPage({ viewport: { width: w, height: h }, colorScheme: "dark" });
  await pg.goto(APP, { waitUntil: "load", timeout: 45000 });
  await pg.waitForTimeout(800);
  // hero shot (above the fold)
  await pg.screenshot({ path: path.join(OUT, `landing-hero.${name}.png`) });
  // scroll through to trigger all inView sections (once:true keeps them visible)
  const total = await pg.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < total; y += Math.floor(h * 0.7)) { await pg.evaluate((yy) => window.scrollTo(0, yy), y); await pg.waitForTimeout(250); }
  await pg.evaluate(() => window.scrollTo(0, 0));
  await pg.waitForTimeout(400);
  await pg.screenshot({ path: path.join(OUT, `landing-full.${name}.png`), fullPage: true });
  await pg.close();
  console.log(`  ✓ ${name}`);
}
await b.close();
console.log("✅ landing captured");
