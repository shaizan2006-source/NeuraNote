/**
 * verify-mocktest-mock.mjs — Stage 8b verification without the remote DB.
 * Mocks /api/mock-test/create + /submit and /api/quiz/friday/generate so the
 * running/result views and friday quiz re-skin can be screenshot-verified.
 * Output: __screens__/stage-8b-quiz/{mock-setup, mock-running, mock-result, friday}.png
 */
import { chromium } from "@playwright/test";
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "..", "__screens__", "stage-8b-quiz");
fs.mkdirSync(OUT, { recursive: true });
const APP = "http://localhost:3000";

const mkQ = (i, subject) => ({
  id: `q${i}`, subject, chapter: ["Kinematics", "Thermodynamics", "Organic"][i % 3],
  question_text: `Q${i + 1}. A body of mass m under constant force F — find its acceleration and distance from rest in time t.`,
  options: ["A) F/m", "B) m/F", "C) Ft", "D) F·m"], correct_answer: "A",
});
const MOCK_TEST = {
  test_id: "demo-test", duration_seconds: 1080,
  questions: [
    mkQ(0, "Physics"), mkQ(1, "Physics"), mkQ(2, "Chemistry"), mkQ(3, "Chemistry"), mkQ(4, "Mathematics"), mkQ(5, "Mathematics"),
  ],
};
const MOCK_RESULT = {
  percentage: 72, marks_obtained: 216, total_marks: 300, correct: 54, incorrect: 18, unanswered: 18,
  predicted_rank_range: [8200, 12500],
  topic_breakdown: { Physics: { correct: 22, total: 30, marks: 80 }, Chemistry: { correct: 18, total: 30, marks: 64 }, Mathematics: { correct: 14, total: 30, marks: 72 } },
};
const FRIDAY = {
  questions: Array.from({ length: 4 }, (_, i) => ({
    question: `Q${i + 1}. Which law relates force, mass and acceleration?`,
    options: ["A) Newton's first law", "B) Newton's second law", "C) Ohm's law", "D) Hooke's law"],
    correct: "B", explanation: "Newton's second law: F = ma.",
  })),
};

const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: "dark" });
await pg.route("**/api/mock-test/create", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_TEST) }));
await pg.route("**/api/mock-test/submit", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_RESULT) }));
await pg.route("**/api/quiz/friday/generate", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FRIDAY) }));

// mock-test setup
await pg.goto(`${APP}/mock-test`, { waitUntil: "load", timeout: 45000 });
await pg.waitForTimeout(800);
await pg.screenshot({ path: path.join(OUT, "mock-setup.png"), fullPage: true });
console.log("  ✓ mock-setup.png");

// → running
await pg.click('button:has-text("Begin Mock Test")');
await pg.waitForTimeout(1000);
await pg.click('button:has-text("A) F/m")').catch(() => {});
await pg.waitForTimeout(300);
await pg.screenshot({ path: path.join(OUT, "mock-running.png"), fullPage: true });
console.log("  ✓ mock-running.png");

// → result (Submit)
await pg.click('button:has-text("Submit")');
await pg.waitForTimeout(1000);
await pg.screenshot({ path: path.join(OUT, "mock-result.png"), fullPage: true });
console.log("  ✓ mock-result.png");

// friday quiz
const p2 = await b.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: "dark" });
await p2.route("**/api/quiz/friday/generate", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FRIDAY) }));
await p2.goto(`${APP}/quiz/friday`, { waitUntil: "load", timeout: 45000 });
await p2.waitForTimeout(1200);
// answer one (option B) to exercise selected state, then capture
await p2.locator('button:has-text("second law")').first().click().catch(()=>{});
await p2.waitForTimeout(300);
await p2.screenshot({ path: path.join(OUT, "friday.png"), fullPage: true });
console.log("  ✓ friday.png");

await b.close();
console.log("✅ 8b states captured (mocked, DB untouched)");
