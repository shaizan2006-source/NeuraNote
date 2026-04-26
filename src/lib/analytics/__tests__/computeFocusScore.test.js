import { test } from "node:test";
import assert from "node:assert";
import { computeFocusScore } from "../computeFocusScore.js";

test("computeFocusScore", async (t) => {
  await t.test("returns empty object when data is null", () => {
    const result = computeFocusScore(null);
    assert.strictEqual(result.score, 0);
    assert.deepStrictEqual(result.breakdown, { consistency: 0, volume: 0, mastery: 0 });
  });

  await t.test("computes correct consistency score (streak / 7 * 40)", () => {
    const data = { streak: 7, totalStudyTimeMins: 0, topicsMastered: 0, totalTopics: 0 };
    const result = computeFocusScore(data);
    assert.strictEqual(result.breakdown.consistency, 40); // 7/7 * 40
  });

  await t.test("computes correct volume score (time / 180 * 40)", () => {
    const data = { streak: 0, totalStudyTimeMins: 180, topicsMastered: 0, totalTopics: 0 };
    const result = computeFocusScore(data);
    assert.strictEqual(result.breakdown.volume, 40); // 180/180 * 40
  });

  await t.test("computes correct mastery score (mastered / total * 20)", () => {
    const data = { streak: 0, totalStudyTimeMins: 0, topicsMastered: 5, totalTopics: 10 };
    const result = computeFocusScore(data);
    assert.strictEqual(result.breakdown.mastery, 10); // 5/10 * 20
  });

  await t.test("caps computed score at 100", () => {
    // When no API focusScore provided, computed value is capped
    const data = { streak: 100, totalStudyTimeMins: 10000, topicsMastered: 100, totalTopics: 100 };
    const result = computeFocusScore(data);
    assert(result.score <= 100);
  });

  await t.test("uses API focusScore when available", () => {
    const data = { streak: 0, totalStudyTimeMins: 0, topicsMastered: 0, totalTopics: 0, focusScore: 75 };
    const result = computeFocusScore(data);
    assert.strictEqual(result.score, 75);
  });

  await t.test("handles zero topics (mastery = 0)", () => {
    const data = { streak: 5, totalStudyTimeMins: 100, topicsMastered: 0, totalTopics: 0 };
    const result = computeFocusScore(data);
    assert.strictEqual(result.breakdown.mastery, 0);
  });

  await t.test("returns object with maxPoints structure", () => {
    const result = computeFocusScore({ streak: 1, totalStudyTimeMins: 1, topicsMastered: 0, totalTopics: 1 });
    assert.deepStrictEqual(result.maxPoints, { consistency: 40, volume: 40, mastery: 20 });
  });
});
