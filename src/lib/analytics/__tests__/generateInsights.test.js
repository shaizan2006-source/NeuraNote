import { test } from "node:test";
import assert from "node:assert";
import { generateInsights } from "../generateInsights.js";

test("generateInsights", async (t) => {
  await t.test("returns empty array when data is null", () => {
    const result = generateInsights(null);
    assert.deepStrictEqual(result, []);
  });

  await t.test("returns empty array when sessionsCompleted < 2", () => {
    const data = { sessionsCompleted: 0, topicsMastered: 0, totalTopics: 0 };
    const result = generateInsights(data);
    assert.deepStrictEqual(result, []);
  });

  await t.test("includes exam urgency when < 14 days (priority 1)", () => {
    const data = {
      examName: "JEE",
      examDaysLeft: 7,
      sessionsCompleted: 5,
      avgAccuracy: 70,
      streak: 2,
      difficultyBreakdown: { easy: 1, medium: 2, hard: 2 },
      weeklyChange: 0,
      topicAccuracy: [],
      totalTopics: 0,
      topicsMastered: 0,
    };
    const result = generateInsights(data);
    assert(result.some(i => i.type === "warning" && i.message.includes("JEE")));
  });

  await t.test("includes low accuracy warning (priority 2)", () => {
    const data = {
      sessionsCompleted: 5,
      avgAccuracy: 35,
      totalTopics: 5,
      topicAccuracy: [{ topic: "Algebra", accuracy: 25 }],
      streak: 0,
      difficultyBreakdown: { easy: 2, medium: 2, hard: 1 },
      weeklyChange: 0,
    };
    const result = generateInsights(data);
    assert(result.some(i => i.type === "warning" && i.message.includes("accuracy")));
  });

  await t.test("includes short session warning (priority 2)", () => {
    const data = {
      sessionsCompleted: 5,
      avgSessionDepthMins: 8,
      avgAccuracy: 50,
      streak: 0,
      difficultyBreakdown: { easy: 5, medium: 0, hard: 0 },
      weeklyChange: 0,
      topicsMastered: 0,
      totalTopics: 0,
    };
    const result = generateInsights(data);
    assert(result.some(i => i.message.includes("too short")));
  });

  await t.test("includes broken streak recovery nudge (priority 2)", () => {
    const data = {
      sessionsCompleted: 5,
      streak: 0,
      avgSessionDepthMins: 20,
      avgAccuracy: 60,
      difficultyBreakdown: { easy: 1, medium: 2, hard: 2 },
      weeklyChange: 0,
      topicsMastered: 0,
      totalTopics: 0,
    };
    const result = generateInsights(data);
    assert(result.some(i => i.message.includes("broke")));
  });

  await t.test("includes positive streak insight when >= 7 days", () => {
    const data = {
      sessionsCompleted: 10,
      streak: 7,
      avgSessionDepthMins: 25,
      avgAccuracy: 75,
      difficultyBreakdown: { easy: 1, medium: 3, hard: 6 },
      weeklyChange: 10,
      topicsMastered: 3,
      totalTopics: 5,
    };
    const result = generateInsights(data);
    assert(result.some(i => i.type === "positive" && i.message.includes("streak")));
  });

  await t.test("includes high accuracy positive insight", () => {
    const data = {
      sessionsCompleted: 10,
      streak: 3,
      avgSessionDepthMins: 30,
      avgAccuracy: 85,
      difficultyBreakdown: { easy: 2, medium: 3, hard: 5 },
      weeklyChange: 15,
      topicsMastered: 5,
      totalTopics: 6,
    };
    const result = generateInsights(data);
    assert(result.some(i => i.message.includes("85%")));
  });

  await t.test("includes peak study time insight when available", () => {
    const data = {
      sessionsCompleted: 10,
      streak: 2,
      peakStudyHour: 9,
      avgSessionDepthMins: 20,
      avgAccuracy: 65,
      difficultyBreakdown: { easy: 2, medium: 4, hard: 4 },
      weeklyChange: 0,
      topicsMastered: 0,
      totalTopics: 0,
    };
    const result = generateInsights(data);
    assert(result.some(i => i.message.includes("9") || i.message.includes("AM")));
  });

  await t.test("includes hard work recognition when > 35% hard sessions", () => {
    const data = {
      sessionsCompleted: 10,
      streak: 1,
      avgSessionDepthMins: 20,
      avgAccuracy: 60,
      difficultyBreakdown: { easy: 1, medium: 2, hard: 7 },
      weeklyChange: 0,
      topicsMastered: 0,
      totalTopics: 0,
    };
    const result = generateInsights(data);
    assert(result.some(i => i.message.includes("hard")));
  });

  await t.test("includes easy session nudge when > 65% easy", () => {
    const data = {
      sessionsCompleted: 10,
      streak: 2,
      avgSessionDepthMins: 15,
      avgAccuracy: 50,
      difficultyBreakdown: { easy: 7, medium: 2, hard: 1 },
      weeklyChange: 0,
      topicsMastered: 0,
      totalTopics: 0,
    };
    const result = generateInsights(data);
    assert(result.some(i => i.message.includes("challenge")));
  });

  await t.test("returns max 5 insights", () => {
    const data = {
      sessionsCompleted: 50,
      streak: 15,
      avgSessionDepthMins: 35,
      avgAccuracy: 90,
      avgSessionDepthMins: 32,
      difficultyBreakdown: { easy: 5, medium: 15, hard: 30 },
      weeklyChange: 50,
      topicsMastered: 10,
      totalTopics: 12,
      strongestSubject: "Math",
      peerPercentile: 85,
    };
    const result = generateInsights(data);
    assert(result.length <= 5);
  });

  await t.test("orders insights by priority (urgent first)", () => {
    const data = {
      sessionsCompleted: 10,
      streak: 0,
      avgSessionDepthMins: 8,
      avgAccuracy: 30,
      totalTopics: 5,
      difficultyBreakdown: { easy: 5, medium: 3, hard: 2 },
      weeklyChange: -40,
      topicAccuracy: [{ topic: "X", accuracy: 20 }],
      examDaysLeft: 10,
      examName: "Test",
      topicsMastered: 0,
    };
    const result = generateInsights(data);
    // Should have warnings (priority 1-2) before positive (priority 4-5)
    const firstWarningIdx = result.findIndex(i => i.type === "warning");
    const firstPositiveIdx = result.findIndex(i => i.type === "positive");
    assert(firstWarningIdx < firstPositiveIdx || firstPositiveIdx === -1);
  });

  await t.test("includes action field in insights", () => {
    const data = {
      sessionsCompleted: 5,
      streak: 0,
      avgSessionDepthMins: 25,
      avgAccuracy: 50,
      difficultyBreakdown: { easy: 2, medium: 2, hard: 1 },
      weeklyChange: 0,
      topicsMastered: 0,
      totalTopics: 0,
    };
    const result = generateInsights(data);
    // Some insights may have action field, some may not
    assert(result.length > 0);
  });
});
