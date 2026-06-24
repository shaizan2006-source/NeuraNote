// Quick one-route screenshot: node scripts/shot.mjs <route> <slug> [mobile]
import { chromium } from "@playwright/test";
import path from "path"; import fs from "fs"; import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "..", "__screens__", "stage-7-auth");
fs.mkdirSync(OUT, { recursive: true });
const route = process.argv[2] || "/login";
const slug = process.argv[3] || "login";
const b = await chromium.launch();
for (const [name, w, h] of [["desktop", 1440, 900], ["mobile", 390, 844]]) {
  const pg = await b.newPage({ viewport: { width: w, height: h }, colorScheme: "dark" });
  await pg.goto(`http://localhost:3000${route}`, { waitUntil: "load", timeout: 45000 });
  await pg.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  await pg.waitForTimeout(700);
  await pg.screenshot({ path: path.join(OUT, `${slug}.${name}.png`), fullPage: true });
  await pg.close();
  console.log(`  ✓ ${slug}.${name}.png`);
}
await b.close();
