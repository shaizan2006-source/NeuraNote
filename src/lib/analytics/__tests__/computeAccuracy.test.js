import { test } from "node:test";
import assert from "node:assert";
import { computeAccuracy } from "../computeAccuracy.js";

test("computeAccuracy", async (t) => {
  await t.test("returns empty object when data is null", () => {
    const result = computeAccuracy(null);
    assert.strictEqual(result.overall, 0);
    assert.strictEqual(result.recent, null);
    assert.deepStrictEqual(result.byTopic, []);
  });

  await t.test("computes overall accuracy from API data", () => {
    const data = { avgAccuracy: 75, topicAccuracy: [], retentionScore: 0 };
    const result = computeAccuracy(data);
    assert.strictEqual(result.overall, 75);
  });

  await t.test("computes recent as average of top-3 topics", () => {
    const data = {
      avgAccuracy: 70,
      topicAccuracy: [
        { topic: "Math", accuracy: 80 },
        { topic: "Science", accuracy: 75 },
        { topic: "History", accuracy: 70 },
        { topic: "English", accuracy: 65 },
      ],
      retentionScore: 0,
    };
    const result = computeAccuracy(data);
    assert.strictEqual(result.recent, 75); // (80 + 75 + 70) / 3 = 75
  });

  await t.test("falls back to overall when < 3 topics", () => {
    const data = { avgAccuracy: 60, topicAccuracy: [{ topic: "Math", accuracy: 80 }], retentionScore: 0 };
    const result = computeAccuracy(data);
    assert.strictEqual(result.recent, 60);
  });

  await t.test("detects upward trend when recent > overall", () => {
    const data = {
      avgAccuracy: 50,
      topicAccuracy: [
        { topic: "A", accuracy: 90 },
        { topic: "B", accuracy: 85 },
        { topic: "C", accuracy: 80 },
      ],
      retentionScore: 0,
    };
    const result = computeAccuracy(data);
    assert.strictEqual(result.trend, "up");
  });

  await t.test("detects downward trend when recent < overall by 5+", () => {
    const data = {
      avgAccuracy: 75,
      topicAccuracy: [
        { topic: "A", accuracy: 60 },
        { topic: "B", accuracy: 65 },
        { topic: "C", accuracy: 70 },
      ],
      retentionScore: 0,
    };
    const result = computeAccuracy(data);
    assert.strictEqual(result.trend, "down");
  });

  await t.test("returns stable trend when difference < 5", () => {
    const data = {
      avgAccuracy: 70,
      topicAccuracy: [
        { topic: "A", accuracy: 72 },
        { topic: "B", accuracy: 70 },
        { topic: "C", accuracy: 68 },
      ],
      retentionScore: 0,
    };
    const result = computeAccuracy(data);
    assert.strictEqual(result.trend, "stable");
  });

  await t.test("includes retentionScore in result", () => {
    const data = { avgAccuracy: 70, topicAccuracy: [], retentionScore: 55 };
    const result = computeAccuracy(data);
    assert.strictEqual(result.retentionScore, 55);
  });

  await t.test("includes full topicAccuracy array in byTopic", () => {
    const topics = [
      { topic: "Math", accuracy: 80 },
      { topic: "Science", accuracy: 75 },
    ];
    const data = { avgAccuracy: 77, topicAccuracy: topics, retentionScore: 0 };
    const result = computeAccuracy(data);
    assert.deepStrictEqual(result.byTopic, topics);
  });
});
