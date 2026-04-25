import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeFocusScore,
  computePeerPercentile,
  computeStudyTimeMins,
  computePeakHour,
  computeWeeklyChange,
  computeStrongestSubject,
  computeStudyPlanProgress,
} from "../../src/lib/progressUtils.js";

describe("computeFocusScore", () => {
  it("returns 100 for perfect inputs", () => {
    const score = computeFocusScore({ streak: 7, totalStudyTimeMins: 180, topicsMastered: 16, totalTopics: 16 });
    assert.equal(score, 100);
  });

  it("returns 0 for all-zero inputs", () => {
    const score = computeFocusScore({ streak: 0, totalStudyTimeMins: 0, topicsMastered: 0, totalTopics: 0 });
    assert.equal(score, 0);
  });

  it("caps consistency contribution at 7-day streak", () => {
    const at7  = computeFocusScore({ streak: 7,  totalStudyTimeMins: 0, topicsMastered: 0, totalTopics: 10 });
    const at14 = computeFocusScore({ streak: 14, totalStudyTimeMins: 0, topicsMastered: 0, totalTopics: 10 });
    assert.equal(at7, at14);
  });

  it("handles totalTopics === 0 without NaN", () => {
    const score = computeFocusScore({ streak: 3, totalStudyTimeMins: 90, topicsMastered: 0, totalTopics: 0 });
    assert.ok(!Number.isNaN(score));
    assert.ok(score >= 0 && score <= 100);
  });
});

describe("computePeerPercentile", () => {
  it("clamps minimum to 10", () => {
    const pct = computePeerPercentile({ focusScore: 0, streak: 0, topicsMastered: 0, totalTopics: 10 });
    assert.ok(pct >= 10);
  });

  it("clamps maximum to 95", () => {
    const pct = computePeerPercentile({ focusScore: 100, streak: 7, topicsMastered: 10, totalTopics: 10 });
    assert.ok(pct <= 95);
  });

  it("gives higher percentile for streak > 3", () => {
    const without = computePeerPercentile({ focusScore: 50, streak: 2, topicsMastered: 5, totalTopics: 10 });
    const with_   = computePeerPercentile({ focusScore: 50, streak: 5, topicsMastered: 5, totalTopics: 10 });
    assert.ok(with_ > without);
  });
});

describe("computeStudyTimeMins", () => {
  it("uses active_time_seconds when available", () => {
    const rows = [{ active_time_seconds: 1800 }, { active_time_seconds: 600 }];
    assert.equal(computeStudyTimeMins(rows), 40); // (1800+600)/60
  });

  it("falls back to 20 min per task when active_time_seconds is 0", () => {
    const rows = [{ active_time_seconds: 0 }, { active_time_seconds: 0 }];
    assert.equal(computeStudyTimeMins(rows), 40);
  });

  it("returns 0 for empty array", () => {
    assert.equal(computeStudyTimeMins([]), 0);
  });
});

describe("computePeakHour", () => {
  it("returns UTC hour with most sessions (no offset)", () => {
    const rows = [
      { created_at: "2026-04-25T20:00:00.000Z" },
      { created_at: "2026-04-25T20:30:00.000Z" },
      { created_at: "2026-04-25T14:00:00.000Z" },
    ];
    // Two rows at UTC hour 20, one at UTC hour 14 → peak is UTC 20
    assert.equal(computePeakHour(rows, 0), 20);
  });

  it("converts to IST (+5.5) correctly", () => {
    const rows = [
      { created_at: "2026-04-25T14:30:00.000Z" }, // 20:00 IST
      { created_at: "2026-04-25T15:00:00.000Z" }, // 20:30 IST
      { created_at: "2026-04-25T08:30:00.000Z" }, // 14:00 IST
    ];
    // Two rows at IST hour 20, one at IST hour 14 → peak IST hour is 20
    assert.equal(computePeakHour(rows, 5.5), 20);
  });

  it("returns 20 as default when no rows", () => {
    assert.equal(computePeakHour([]), 20);
  });

  it("ignores rows without created_at", () => {
    assert.equal(computePeakHour([{ created_at: null }, {}]), 20);
  });
});

describe("computeWeeklyChange", () => {
  it("returns 100 when last week was 0 and this week > 0", () => {
    const data = [
      ...Array(7).fill({ minutes: 0 }),
      ...Array(7).fill({ minutes: 60 }),
    ];
    assert.equal(computeWeeklyChange(data), 100);
  });

  it("returns 0 when both weeks are 0", () => {
    assert.equal(computeWeeklyChange(Array(14).fill({ minutes: 0 })), 0);
  });

  it("calculates 50% increase correctly", () => {
    const data = [
      ...Array(7).fill({ minutes: 60 }),
      ...Array(7).fill({ minutes: 90 }),
    ];
    assert.equal(computeWeeklyChange(data), 50);
  });

  it("returns 0 when fewer than 14 days of data", () => {
    // New user — only 7 days available
    assert.equal(computeWeeklyChange(Array(7).fill({ minutes: 60 })), 0);
  });
});

describe("computeStrongestSubject", () => {
  it("returns null for empty input", () => {
    assert.equal(computeStrongestSubject([]), null);
  });

  it("returns subject with highest average mastery", () => {
    const topics = [
      { subject: "Physics",   mastery_score: 90 },
      { subject: "Chemistry", mastery_score: 50 },
      { subject: "Chemistry", mastery_score: 60 },
    ];
    // Physics avg = 90, Chemistry avg = 55
    assert.equal(computeStrongestSubject(topics), "Physics");
  });
});

describe("computeStudyPlanProgress", () => {
  it("counts unique study days", () => {
    const rows = [
      { created_at: "2026-04-25T10:00:00Z" },
      { created_at: "2026-04-25T15:00:00Z" }, // same day
      { created_at: "2026-04-24T10:00:00Z" },
    ];
    assert.equal(computeStudyPlanProgress(rows).currentDay, 2);
  });

  it("caps completionPct at 100", () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({
      created_at: `2026-01-${String(i % 28 + 1).padStart(2, "0")}T10:00:00Z`,
    }));
    assert.ok(computeStudyPlanProgress(rows).completionPct <= 100);
  });
});
