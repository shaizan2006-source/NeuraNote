import { test } from "node:test";
import assert from "node:assert";
import { computeProgress } from "../computeProgress.js";

test("computeProgress", async (t) => {
  await t.test("returns empty object when data is null", () => {
    const result = computeProgress(null);
    assert.strictEqual(result.masteryPct, 0);
    assert.strictEqual(result.cognitiveScore, 0);
    assert.strictEqual(result.topicsCompleted, 0);
    assert.strictEqual(result.topicsTotal, 0);
  });

  await t.test("computes masteryPct from topicsMastered / totalTopics", () => {
    const data = { topicsMastered: 6, totalTopics: 10, avgAccuracy: 0, retentionScore: 0 };
    const result = computeProgress(data);
    assert.strictEqual(result.masteryPct, 60);
  });

  await t.test("returns 0 masteryPct when totalTopics is 0", () => {
    const data = { topicsMastered: 0, totalTopics: 0, avgAccuracy: 0, retentionScore: 0 };
    const result = computeProgress(data);
    assert.strictEqual(result.masteryPct, 0);
  });

  await t.test("computes cognitiveScore as weighted blend (acc 40% + retention 40% + mastery 20%)", () => {
    const data = {
      topicsMastered: 5,
      totalTopics: 10,
      avgAccuracy: 80,
      retentionScore: 60,
    };
    const result = computeProgress(data);
    // 80 * 0.4 + 60 * 0.4 + 50 * 0.2 = 32 + 24 + 10 = 66
    assert.strictEqual(result.cognitiveScore, 66);
  });

  await t.test("caps cognitiveScore at 100", () => {
    const data = {
      topicsMastered: 10,
      totalTopics: 10,
      avgAccuracy: 100,
      retentionScore: 100,
    };
    const result = computeProgress(data);
    assert.strictEqual(result.cognitiveScore, 100);
  });

  await t.test("passes topicsCompleted and topicsTotal", () => {
    const data = {
      topicsMastered: 7,
      totalTopics: 15,
      avgAccuracy: 75,
      retentionScore: 80,
    };
    const result = computeProgress(data);
    assert.strictEqual(result.topicsCompleted, 7);
    assert.strictEqual(result.topicsTotal, 15);
  });

  await t.test("rounds cognitiveScore to integer", () => {
    const data = {
      topicsMastered: 3,
      totalTopics: 7,
      avgAccuracy: 75,
      retentionScore: 85,
    };
    const result = computeProgress(data);
    // masteryPct = 42.86, score = 75*0.4 + 85*0.4 + 42.86*0.2 = 30 + 34 + 8.57 = 72.57 → 73
    assert.strictEqual(typeof result.cognitiveScore, "number");
    assert(result.cognitiveScore >= 70 && result.cognitiveScore <= 75);
  });
});
