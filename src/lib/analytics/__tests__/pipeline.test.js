import { test } from "node:test";
import assert from "node:assert";

import { computeTrends }    from "../computeTrends.js";
import { generateInsights } from "../generateInsights.js";
import { computeFocusScore } from "../computeFocusScore.js";
import { computeAccuracy }  from "../computeAccuracy.js";
import { computeStudyDepth } from "../computeStudyDepth.js";
import { computeStreak }    from "../computeStreak.js";
import { computeProgress }  from "../computeProgress.js";

// Simulates useStudyInsights: computeTrends(data) then generateInsights(data, { trends })
function pipeline_insights(data) {
  const trends = computeTrends(data);
  return generateInsights(data, { trends });
}

// Representative real-world data shape (matches progressSummary API response)
const ACTIVE_USER = {
  sessionsCompleted:   12,
  streak:              5,
  totalStudyTimeMins:  480,
  topicsMastered:      8,
  totalTopics:         20,
  avgSessionDepthMins: 28,
  avgAccuracy:         72,
  retentionScore:      65,
  peerPercentile:      60,
  focusScore:          74,
  focusTrend:          "up",
  weeklyChange:        15,
  thisWeekMins:        200,
  peakStudyHour:       9,
  strongestSubject:    "Physics",
  examName:            "JEE",
  examDaysLeft:        30,
  examReadiness:       55,
  difficultyBreakdown: { easy: 3, medium: 5, hard: 4 },
  topicAccuracy:       [
    { topic: "Mechanics",      accuracy: 82 },
    { topic: "Thermodynamics", accuracy: 68 },
    { topic: "Algebra",        accuracy: 75 },
  ],
  dailyStudyTime: Array(14).fill(null).map((_, i) => ({
    date:    new Date(Date.now() - (13 - i) * 86400000).toISOString().split("T")[0],
    minutes: i % 3 === 0 ? 10 : 30,
  })),
  lastActiveDate: new Date().toISOString().split("T")[0],
};

test("Analytics pipeline integration", async (t) => {

  // ── useStudyInsights pattern ─────────────────────────────────────────────────

  await t.test("pipeline_insights produces insights with trends context", () => {
    const insights = pipeline_insights(ACTIVE_USER);
    assert(Array.isArray(insights));
    assert(insights.length > 0);
    assert(insights.length <= 5);
  });

  await t.test("trends context enables consistency-gap insight when activeDays low", () => {
    const data = {
      ...ACTIVE_USER,
      dailyStudyTime: Array(7).fill(null).map((_, i) => ({
        date:    new Date(Date.now() - (6 - i) * 86400000).toISOString().split("T")[0],
        minutes: i < 1 ? 30 : 5, // only 1 valid day out of 7 → consistencyPct = 14
      })),
    };
    const insights = pipeline_insights(data);
    // consistencyPct ~14 (<= 28) → consistency-gap nudge should appear
    assert(insights.some(i => i.message.includes("days studied") || i.message.includes("of 7")));
  });

  await t.test("trends context suppresses consistency-gap nudge and emits perfect-week insight when consistencyPct=100", () => {
    // Minimal data set: no exam, no peakHour, no strongestSubject → fewer priority-4/5 competitors
    // so the priority-5 "every day" insight fits within the 5-insight cap
    const data = {
      sessionsCompleted:   6,
      streak:              3,
      totalStudyTimeMins:  300,
      topicsMastered:      2,
      totalTopics:         8,
      avgSessionDepthMins: 22,     // priority-5 "optimal zone"
      avgAccuracy:         60,     // not >= 75 → no high-accuracy insight
      retentionScore:      55,
      peerPercentile:      0,
      weeklyChange:        5,      // not >= 25 → no big-improvement insight
      difficultyBreakdown: { easy: 2, medium: 2, hard: 2 }, // hard ratio = 0.33, not > 0.35
      topicAccuracy:       [],
      examName:            null,   // no exam insight
      peakStudyHour:       null,   // no peak-hour insight
      strongestSubject:    null,   // no subject insight
      dailyStudyTime: Array(7).fill(null).map((_, i) => ({
        date:    new Date(Date.now() - (6 - i) * 86400000).toISOString().split("T")[0],
        minutes: 35, // all 7 days valid → consistencyPct = 100
      })),
      lastActiveDate: new Date().toISOString().split("T")[0],
    };
    const insights = pipeline_insights(data);
    // Consistency-gap nudge must NOT appear when user has perfect week
    assert(!insights.some(i => i.message.includes("days studied")));
    // Perfect-week celebratory insight MUST appear (priority 5 fits because <5 higher-priority items)
    assert(insights.some(i => i.message.includes("every day")));
  });

  await t.test("priority ordering: warnings before positives in pipeline output", () => {
    const data = {
      ...ACTIVE_USER,
      streak:              0,
      avgSessionDepthMins: 8,
      avgAccuracy:         35,
      totalTopics:         5,
    };
    const insights = pipeline_insights(data);
    const warnIdx = insights.findIndex(i => i.type === "warning");
    const posIdx  = insights.findIndex(i => i.type === "positive");
    if (warnIdx !== -1 && posIdx !== -1) {
      assert(warnIdx < posIdx, "warnings must come before positives");
    }
  });

  await t.test("pipeline returns empty array for new user (< 2 sessions)", () => {
    const insights = pipeline_insights({ ...ACTIVE_USER, sessionsCompleted: 1 });
    assert.deepStrictEqual(insights, []);
  });

  // ── Full data pipeline: raw → all analytics functions ───────────────────────

  await t.test("computeFocusScore with real user data returns score in [0,100]", () => {
    const result = computeFocusScore(ACTIVE_USER);
    assert(result.score >= 0 && result.score <= 100);
    assert.strictEqual(typeof result.score, "number");
  });

  await t.test("computeFocusScore uses API focusScore when present", () => {
    const result = computeFocusScore(ACTIVE_USER); // has focusScore: 74
    assert.strictEqual(result.score, 74);
  });

  await t.test("computeAccuracy returns overall, recent, byTopic, trend, retentionScore", () => {
    const result = computeAccuracy(ACTIVE_USER);
    assert.strictEqual(result.overall, 72);
    assert(Array.isArray(result.byTopic));
    assert(["up", "down", "stable"].includes(result.trend));
    assert.strictEqual(result.retentionScore, 65);
  });

  await t.test("computeAccuracy byTopic matches topicAccuracy from API", () => {
    const result = computeAccuracy(ACTIVE_USER);
    assert.strictEqual(result.byTopic.length, 3);
    assert.strictEqual(result.byTopic[0].topic, "Mechanics");
  });

  await t.test("computeStudyDepth classifies sessions correctly for ACTIVE_USER", () => {
    const result = computeStudyDepth(ACTIVE_USER);
    // avgDuration = 28 → deep work threshold
    assert.strictEqual(result.avgDuration, 28);
    assert(result.depthScore > 0);
    // 3 easy + 5 medium + 4 hard = 12 total; hard ratio = 4/12 ≈ 0.33 → some deep sessions
    assert(result.distribution.deep >= 0);
  });

  await t.test("computeStreak returns currentStreak matching ACTIVE_USER.streak", () => {
    const result = computeStreak(ACTIVE_USER);
    assert.strictEqual(result.currentStreak, 5);
  });

  await t.test("computeStreak detects studied-today correctly", () => {
    const result = computeStreak(ACTIVE_USER); // lastActiveDate = today
    assert.strictEqual(result.studiedToday, true);
  });

  await t.test("computeProgress blends cognitiveScore from accuracy+retention+mastery", () => {
    const result = computeProgress(ACTIVE_USER);
    // masteryPct = 8/20 * 100 = 40
    assert.strictEqual(result.masteryPct, 40);
    // cognitiveScore = accuracy*0.4 + retention*0.4 + mastery*0.2
    // = 72*0.4 + 65*0.4 + 40*0.2 = 28.8 + 26 + 8 = 62.8 → 63
    assert.strictEqual(result.cognitiveScore, 63);
  });

  await t.test("computeTrends streakMomentum is 'building' for 5-day streak", () => {
    const result = computeTrends(ACTIVE_USER);
    assert.strictEqual(result.streakMomentum, "building");
  });

  await t.test("all functions handle the same data object without throwing", () => {
    assert.doesNotThrow(() => computeFocusScore(ACTIVE_USER));
    assert.doesNotThrow(() => computeAccuracy(ACTIVE_USER));
    assert.doesNotThrow(() => computeStudyDepth(ACTIVE_USER));
    assert.doesNotThrow(() => computeStreak(ACTIVE_USER));
    assert.doesNotThrow(() => computeProgress(ACTIVE_USER));
    assert.doesNotThrow(() => computeTrends(ACTIVE_USER));
    assert.doesNotThrow(() => generateInsights(ACTIVE_USER, { trends: computeTrends(ACTIVE_USER) }));
  });

  await t.test("all functions handle null gracefully (no throws)", () => {
    assert.doesNotThrow(() => computeFocusScore(null));
    assert.doesNotThrow(() => computeAccuracy(null));
    assert.doesNotThrow(() => computeStudyDepth(null));
    assert.doesNotThrow(() => computeStreak(null));
    assert.doesNotThrow(() => computeProgress(null));
    assert.doesNotThrow(() => computeTrends(null));
    assert.doesNotThrow(() => generateInsights(null));
  });
});
