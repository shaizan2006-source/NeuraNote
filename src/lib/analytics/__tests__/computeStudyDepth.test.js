import { test } from "node:test";
import assert from "node:assert";
import { computeStudyDepth } from "../computeStudyDepth.js";

test("computeStudyDepth", async (t) => {
  await t.test("returns empty object when data is null", () => {
    const result = computeStudyDepth(null);
    assert.strictEqual(result.avgDuration, 0);
    assert.strictEqual(result.depthScore, 0);
    assert.deepStrictEqual(result.distribution, { shallow: 0, medium: 0, deep: 0 });
  });

  await t.test("passes through avgSessionDepthMins", () => {
    const data = { avgSessionDepthMins: 22, sessionsCompleted: 0, difficultyBreakdown: {} };
    const result = computeStudyDepth(data);
    assert.strictEqual(result.avgDuration, 22);
  });

  await t.test("maps difficulty counts to distribution (easy → shallow)", () => {
    const data = {
      avgSessionDepthMins: 15,
      sessionsCompleted: 10,
      difficultyBreakdown: { easy: 5, medium: 3, hard: 2 },
    };
    const result = computeStudyDepth(data);
    assert.strictEqual(result.distribution.shallow, 5);
    assert.strictEqual(result.distribution.medium, 3);
    assert.strictEqual(result.distribution.deep, 2);
  });

  await t.test("computes depthScore from duration and hard ratio", () => {
    const data = {
      avgSessionDepthMins: 25,
      sessionsCompleted: 10,
      difficultyBreakdown: { easy: 2, medium: 3, hard: 5 },
    };
    const result = computeStudyDepth(data);
    // durationNorm = 1 (>= 25min), hardRatio = 5/10 = 0.5
    // depthScore = (1 * 0.75 + 0.5 * 0.25) * 100 = 87.5 → 87
    assert(result.depthScore >= 85 && result.depthScore <= 90);
  });

  await t.test("caps depthScore at 100", () => {
    const data = {
      avgSessionDepthMins: 100,
      sessionsCompleted: 10,
      difficultyBreakdown: { easy: 0, medium: 0, hard: 10 },
    };
    const result = computeStudyDepth(data);
    assert(result.depthScore <= 100);
  });

  await t.test("estimates distribution from duration when no difficulty breakdown", () => {
    const data = {
      avgSessionDepthMins: 30,
      sessionsCompleted: 10,
      difficultyBreakdown: { easy: 0, medium: 0, hard: 0 },
    };
    const result = computeStudyDepth(data);
    assert.strictEqual(result.distribution.deep, 10); // isDeep = true
    assert.strictEqual(result.distribution.shallow, 0);
  });

  await t.test("assigns shallow sessions for short durations", () => {
    const data = {
      avgSessionDepthMins: 5,
      sessionsCompleted: 8,
      difficultyBreakdown: { easy: 0, medium: 0, hard: 0 },
    };
    const result = computeStudyDepth(data);
    assert.strictEqual(result.distribution.shallow, 8);
    assert.strictEqual(result.distribution.deep, 0);
  });

  await t.test("handles medium-range sessions (10-25 min)", () => {
    const data = {
      avgSessionDepthMins: 18,
      sessionsCompleted: 6,
      difficultyBreakdown: { easy: 0, medium: 0, hard: 0 },
    };
    const result = computeStudyDepth(data);
    assert.strictEqual(result.distribution.medium, 6);
  });
});
