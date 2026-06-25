// Stage 8e — mock /api/cohort/leaderboard to verify the populated leaderboard re-skin.
import { chromium } from "@playwright/test";
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "..", "__screens__", "stage-8e-cohort");
fs.mkdirSync(OUT, { recursive: true });
const APP = "http://localhost:3000";

const names = ["arjun_rao","meera88","kiran_p","dev_x","echo","sara_iit","rohan","tanvi","aman","priya_neet","vikram","nisha","kabir","ananya","sid"];
const rankings = Array.from({ length: 15 }, (_, i) => ({ rank: i + 1, handle: names[i], score: 1200 - i * 73 }));
const DATA = { cohort_id: "c1", cohort_name: "JEE 2025 · Cohort Alpha", member_count: 142, my_handle: "echo", rankings };

const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: "dark" });
await pg.route("**/api/cohort/leaderboard", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(DATA) }));
await pg.goto(`${APP}/cohort`, { waitUntil: "load", timeout: 45000 });
await pg.waitForTimeout(1500);
await pg.screenshot({ path: path.join(OUT, "cohort-leaderboard.png"), fullPage: true });
console.log("  ✓ cohort-leaderboard.png");
await b.close();
