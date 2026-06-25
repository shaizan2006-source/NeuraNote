/**
 * verify-pyqs-mock.mjs — Stage 8a verification WITHOUT touching the remote DB.
 * Intercepts /api/pyqs/search in the browser and fulfils it with sample rows,
 * so the populated list + practice runner re-skin can be screenshot-verified.
 * (Client pages fetch this API; the /pyqs/[slug] server page is not mockable
 * this way and stays verified by code review.)
 * Output: __screens__/stage-8a-pyqs/{pyqs-populated, practice-runner, practice-revealed}.png
 */
import { chromium } from "@playwright/test";
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "..", "__screens__", "stage-8a-pyqs");
const APP = "http://localhost:3000";

const Q = (i, subject, diff, opts) => ({
  id: i, slug: `sample-${i}`, exam_type: "jee_main", exam_year: 2024 - (i % 5),
  subject, chapter: ["Kinematics", "Thermodynamics", "Organic Reactions", "Calculus"][i % 4],
  difficulty: diff, mark_weight: 4,
  question_text: `Sample ${subject} question ${i}: A body of mass m moves under a constant force F. Determine the resulting acceleration and the distance covered in time t, assuming it starts from rest.`,
  options: opts ? ["A) F/m", "B) m/F", "C) Ft", "D) F·m"] : null,
  correct_answer: "A",
  solution_text: "By Newton's second law, a = F/m. Distance from rest: s = ½at² = ½(F/m)t².",
  concepts: ["Newton's laws", "Kinematics"],
});
const SAMPLE = [
  Q(1, "Physics", "easy", true), Q(2, "Chemistry", "medium", true), Q(3, "Mathematics", "hard", true),
  Q(4, "Physics", "medium", true), Q(5, "Chemistry", "easy", true), Q(6, "Mathematics", "medium", true),
];

const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: "dark" });
await pg.route("**/api/pyqs/search**", (route) =>
  route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ results: SAMPLE, total: 137, page: 1, has_more: true }) })
);

// 1. Populated list
await pg.goto(`${APP}/pyqs`, { waitUntil: "load", timeout: 45000 });
await pg.waitForTimeout(1200);
await pg.screenshot({ path: path.join(OUT, "pyqs-populated.png"), fullPage: true });
console.log("  ✓ pyqs-populated.png");

// 2. Practice runner (setup → Start Practice → runner)
await pg.goto(`${APP}/pyqs/practice`, { waitUntil: "load", timeout: 45000 });
await pg.waitForTimeout(500);
await pg.click('button:has-text("Start Practice")');
await pg.waitForTimeout(1200);
await pg.screenshot({ path: path.join(OUT, "practice-runner.png"), fullPage: true });
console.log("  ✓ practice-runner.png");

// 3. Practice with an option chosen + revealed (exercise correct/selected styles)
try {
  await pg.click('button:has-text("A) F/m")');
  await pg.waitForTimeout(300);
  await pg.click('button:has-text("Check Answer")');
  await pg.waitForTimeout(600);
  await pg.screenshot({ path: path.join(OUT, "practice-revealed.png"), fullPage: true });
  console.log("  ✓ practice-revealed.png");
} catch (e) { console.warn("  ⚠ reveal step:", e.message.split("\n")[0]); }

await b.close();
console.log("✅ pyqs populated states captured (mocked data, DB untouched)");
