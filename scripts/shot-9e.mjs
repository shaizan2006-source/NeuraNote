/**
 * shot-9e.mjs — authenticated capture of the 5 Stage 9e re-skinned pages.
 * Logs in with the dev account (TEST_EMAIL/TEST_PASSWORD from .env.local),
 * then screenshots /exams /study /focus /progress /quiz at desktop + mobile.
 */
import { chromium } from "@playwright/test";
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "..", "__screens__", "stage-9e");
fs.mkdirSync(OUT, { recursive: true });
const APP = "http://localhost:3000";

function creds(){ if(process.env.TEST_EMAIL)return; const p=path.resolve(__dirname,"..",".env.local"); if(!fs.existsSync(p))return; for(const l of fs.readFileSync(p,"utf8").split("\n")){const m=l.match(/^(TEST_EMAIL|TEST_PASSWORD)\s*=\s*"?([^"\r]+)"?/); if(m)process.env[m[1]]=process.env[m[1]]||m[2];}}
creds();

const ROUTES = ["/exams", "/study", "/focus", "/progress", "/quiz"];
const b = await chromium.launch();

async function login(ctx) {
  const pg = await ctx.newPage();
  await pg.goto(`${APP}/login`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await pg.waitForLoadState("networkidle", { timeout: 20000 }).catch(()=>{});
  await pg.waitForTimeout(500);
  await pg.fill('input[type=email]', process.env.TEST_EMAIL);
  await pg.fill('input[type=password]', process.env.TEST_PASSWORD);
  await pg.click('button[type=submit]');
  await pg.waitForURL(u => u.pathname.startsWith("/dashboard"), { timeout: 45000 });
  await pg.close();
}

for (const [name, w, h] of [["desktop", 1440, 900], ["mobile", 390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: "dark" });
  await login(ctx);
  console.log(`  ✓ logged in (${name})`);
  for (const route of ROUTES) {
    const slug = route.replace(/\//g, "") || "home";
    try {
      const pg = await ctx.newPage();
      await pg.goto(`${APP}${route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await pg.waitForLoadState("networkidle", { timeout: 15000 }).catch(()=>{});
      await pg.waitForTimeout(1200);
      await pg.screenshot({ path: path.join(OUT, `${slug}.${name}.png`), fullPage: true });
      console.log(`    ✓ ${route} (${name})`);
      await pg.close();
    } catch (e) { console.error(`    ✗ ${route} (${name}):`, e.message.split("\n")[0]); }
  }
  await ctx.close();
}
await b.close();
console.log("✅ 9e captured");
