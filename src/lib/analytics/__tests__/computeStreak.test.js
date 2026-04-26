import { test } from "node:test";
import assert from "node:assert";
import { computeStreak, VALID_STUDY_MINUTES } from "../computeStreak.js";

test("computeStreak", async (t) => {
  await t.test("returns empty object when data is null", () => {
    const result = computeStreak(null);
    assert.strictEqual(result.currentStreak, 0);
    assert.strictEqual(result.longestStreak, 0);
    assert.strictEqual(result.activeDaysThisWeek, 0);
  });

  await t.test("passes through currentStreak from DB", () => {
    const data = { streak: 5, lastActiveDate: null, dailyStudyTime: [] };
    const result = computeStreak(data);
    assert.strictEqual(result.currentStreak, 5);
  });

  await t.test("detects studiedToday when lastActiveDate is today", () => {
    const today = new Date().toISOString().split("T")[0];
    const data = { streak: 3, lastActiveDate: today, dailyStudyTime: [] };
    const result = computeStreak(data);
    assert.strictEqual(result.studiedToday, true);
  });

  await t.test("computes longestStreak from dailyStudyTime consecutive valid days", () => {
    const data = {
      streak: 2,
      lastActiveDate: null,
      dailyStudyTime: [
        { date: "2026-04-20", minutes: 25 },
        { date: "2026-04-21", minutes: 30 },
        { date: "2026-04-22", minutes: 5 }, // < 20 min, breaks streak
        { date: "2026-04-23", minutes: 20 },
        { date: "2026-04-24", minutes: 25 },
        { date: "2026-04-25", minutes: 22 },
      ],
    };
    const result = computeStreak(data);
    // First run: 2 days, breaks at day 3, second run: 3 days → longestStreak = 3
    assert.strictEqual(result.longestStreak, 3);
  });

  await t.test("uses DB streak if > window longest", () => {
    const data = {
      streak: 10,
      lastActiveDate: null,
      dailyStudyTime: [
        { date: "2026-04-20", minutes: 25 },
        { date: "2026-04-21", minutes: 25 },
      ],
    };
    const result = computeStreak(data);
    assert.strictEqual(result.longestStreak, 10);
  });

  await t.test("counts activeDaysThisWeek with >= VALID_STUDY_MINUTES", () => {
    const data = {
      streak: 1,
      lastActiveDate: null,
      dailyStudyTime: Array(7).fill().map((_, i) => ({
        date: new Date(Date.now() - (7-1-i)*86400000).toISOString().split("T")[0],
        minutes: i < 4 ? 25 : 5, // 4 days >= 20 min
      })),
    };
    const result = computeStreak(data);
    assert.strictEqual(result.activeDaysThisWeek, 4);
  });

  await t.test("exposes VALID_STUDY_MINUTES constant", () => {
    assert.strictEqual(VALID_STUDY_MINUTES, 20);
  });

  await t.test("returns validDayThreshold in result", () => {
    const result = computeStreak({ streak: 0, lastActiveDate: null, dailyStudyTime: [] });
    assert.strictEqual(result.validDayThreshold, 20);
  });
});
