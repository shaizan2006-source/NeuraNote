/**
 * verify-brainmap-mock.mjs — Stage 8d verification without the DB.
 * Mocks /api/brain-map so the reactflow graph + mastery-color nodes + header
 * stats render. Output: __screens__/stage-8d-brainmap/{brain-map, share}.png
 */
import { chromium } from "@playwright/test";
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "..", "__screens__", "stage-8d-brainmap");
fs.mkdirSync(OUT, { recursive: true });
const APP = "http://localhost:3000";

const node = (id, label, subject, m, x, y) => ({ id, label, subject, mastery_score: m, x, y });
const MAP = {
  stats: { total: 9, mastered: 3, strong: 2, shaky: 2, unknown: 2 },
  nodes: [
    node("1", "Newton's Laws", "Physics", 0.92, 80, 60),
    node("2", "Kinematics", "Physics", 0.85, 300, 60),
    node("3", "Thermodynamics", "Physics", 0.7, 520, 60),
    node("4", "Organic Reactions", "Chemistry", 0.65, 80, 220),
    node("5", "Periodic Table", "Chemistry", 0.45, 300, 220),
    node("6", "Calculus", "Mathematics", 0.4, 520, 220),
    node("7", "Probability", "Mathematics", 0.2, 80, 380),
    node("8", "Vectors", "Mathematics", 0.88, 300, 380),
    node("9", "Electrostatics", "Physics", 0.15, 520, 380),
  ],
  edges: [
    { from: "1", to: "2" }, { from: "2", to: "3" }, { from: "1", to: "9" },
    { from: "4", to: "5" }, { from: "6", to: "8" }, { from: "6", to: "7" },
  ],
};

const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: "dark" });
// auth gate: page reads session token before fetching — stub getSession by mocking the brain-map API
// and also short-circuit the token check by injecting a fake session into supabase localStorage is complex;
// instead mock the API AND the supabase auth token endpoint isn't needed since page bails without token.
// So: log in with the dev account first (real session), then mock the data API.
async function login() {
  try {
    await pg.goto(`${APP}/login`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await pg.waitForLoadState("networkidle", { timeout: 20000 }).catch(()=>{});
    await pg.waitForTimeout(500);
    await pg.fill('input[type=email]', process.env.TEST_EMAIL || "test@example.com");
    await pg.fill('input[type=password]', process.env.TEST_PASSWORD || "12345678");
    await pg.click('button[type=submit]');
    await pg.waitForURL(u => !u.pathname.startsWith("/login"), { timeout: 45000 });
    return true;
  } catch (e) { console.warn("login failed:", e.message.split("\n")[0]); return false; }
}
const ok = await login();
console.log("auth:", ok);
await pg.route("**/api/brain-map**", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MAP) }));

await pg.goto(`${APP}/brain-map`, { waitUntil: "load", timeout: 45000 });
await pg.waitForTimeout(2500); // reactflow layout + fitView
await pg.screenshot({ path: path.join(OUT, "brain-map.png"), fullPage: false });
console.log("  ✓ brain-map.png");

// click a node to show the side panel
await pg.locator(".react-flow__node").first().click().catch(()=>{});
await pg.waitForTimeout(600);
await pg.screenshot({ path: path.join(OUT, "brain-map-panel.png"), fullPage: false });
console.log("  ✓ brain-map-panel.png");

await b.close();
console.log("✅ 8d brain-map captured (mocked data)");
