import { test } from "node:test";
import assert from "node:assert";
import { computeTrends } from "../computeTrends.js";

test("computeTrends", async (t) => {
  await t.test("returns empty object when data is null", () => {
    const result = computeTrends(null);
    assert.strictEqual(result.focusScoreTrend, 0);
    assert.strictEqual(result.studyTimeTrend, 0);
    assert.strictEqual(result.accuracyTrend, null);
    assert.strictEqual(result.streakMomentum, "neutral");
  });

  await t.test("passes through studyTimeTrend from weeklyChange", () => {
    const data = { weeklyChange: 25, focusTrend: "up", streak: 0, dailyStudyTime: [] };
    const result = computeTrends(data);
    assert.strictEqual(result.studyTimeTrend, 25);
  });

  await t.test("computes focusScoreTrend from focusTrend + magnitude", () => {
    const data = { weeklyChange: 20, focusTrend: "up", streak: 0, dailyStudyTime: [] };
    const result = computeTrends(data);
    // magnitude = round(|20| * 0.15) = 3
    // trend = "up" ? 3 : -3
    assert(result.focusScoreTrend > 0);
  });

  await t.test("returns negative focusScoreTrend when down", () => {
    const data = { weeklyChange: -30, focusTrend: "down", streak: 0, dailyStudyTime: [] };
    const result = computeTrends(data);
    assert(result.focusScoreTrend < 0);
  });

  await t.test("returns null for accuracyTrend (not implemented)", () => {
    const data = { weeklyChange: 0, focusTrend: "up", streak: 0, dailyStudyTime: [] };
    const result = computeTrends(data);
    assert.strictEqual(result.accuracyTrend, null);
  });

  await t.test("categorizes streakMomentum: strong >= 7", () => {
    const data = { weeklyChange: 0, focusTrend: "up", streak: 10, dailyStudyTime: [] };
    const result = computeTrends(data);
    assert.strictEqual(result.streakMomentum, "strong");
  });

  await t.test("categorizes streakMomentum: building 3-6", () => {
    const data = { weeklyChange: 0, focusTrend: "up", streak: 4, dailyStudyTime: [] };
    const result = computeTrends(data);
    assert.strictEqual(result.streakMomentum, "building");
  });

  await t.test("categorizes streakMomentum: fragile 1-2", () => {
    const data = { weeklyChange: 0, focusTrend: "up", streak: 1, dailyStudyTime: [] };
    const result = computeTrends(data);
    assert.strictEqual(result.streakMomentum, "fragile");
  });

  await t.test("categorizes streakMomentum: broken = 0", () => {
    const data = { weeklyChange: 0, focusTrend: "up", streak: 0, dailyStudyTime: [] };
    const result = computeTrends(data);
    assert.strictEqual(result.streakMomentum, "broken");
  });

  await t.test("computes consistencyPct from activeDays in last 7", () => {
    const data = {
      weeklyChange: 0,
      focusTrend: "up",
      streak: 0,
      dailyStudyTime: Array(7).fill().map((_, i) => ({
        date: new Date(Date.now() - (7-1-i)*86400000).toISOString().split("T")[0],
        minutes: i < 5 ? 25 : 5, // 5 valid days
      })),
    };
    const result = computeTrends(data);
    assert.strictEqual(result.consistencyPct, 71); // round(5 / 7 * 100) = 71
    assert.strictEqual(result.activeDays, 5);
  });

  await t.test("returns 0 activeDays when all days < 20min", () => {
    const data = {
      weeklyChange: 0,
      focusTrend: "up",
      streak: 0,
      dailyStudyTime: Array(7).fill().map(() => ({ date: "2026-04-20", minutes: 5 })),
    };
    const result = computeTrends(data);
    assert.strictEqual(result.activeDays, 0);
  });
});
