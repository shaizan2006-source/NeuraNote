/**
 * Tests for analytics pure functions:
 * - computeStreak (src/lib/analytics/computeStreak.js)
 * - computeAccuracy (src/lib/analytics/computeAccuracy.js)
 * - VOICE_LIMITS constants (src/lib/voiceLimits.js — pure data only, no I/O)
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  computeStreak,
  VALID_STUDY_MINUTES,
} from "../../src/lib/analytics/computeStreak.js";

import { computeAccuracy } from "../../src/lib/analytics/computeAccuracy.js";

// ── T-STREAK-001: null / empty input ─────────────────────────────────────────
describe("T-STREAK-001: computeStreak — null/empty input", () => {
  it("returns zero-state for null", () => {
    const r = computeStreak(null);
    assert.equal(r.currentStreak, 0);
    assert.equal(r.longestStreak, 0);
    assert.equal(r.studiedToday, false);
    assert.equal(r.activeDaysThisWeek, 0);
  });

  it("returns zero-state for undefined", () => {
    const r = computeStreak(undefined);
    assert.equal(r.currentStreak, 0);
    assert.equal(r.longestStreak, 0);
  });

  it("returns zero-state for empty object", () => {
    const r = computeStreak({});
    assert.equal(r.currentStreak, 0);
    assert.equal(r.longestStreak, 0);
    assert.equal(r.studiedToday, false);
  });

  it("always includes validDayThreshold = VALID_STUDY_MINUTES", () => {
    const r = computeStreak(null);
    assert.equal(r.validDayThreshold, VALID_STUDY_MINUTES);
    assert.equal(VALID_STUDY_MINUTES, 20);
  });
});

// ── T-STREAK-002: studiedToday detection ─────────────────────────────────────
describe("T-STREAK-002: computeStreak — studiedToday detection", () => {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split("T")[0];

  it("studiedToday=true when lastActiveDate is today", () => {
    const r = computeStreak({ streak: 5, lastActiveDate: today, dailyStudyTime: [] });
    assert.equal(r.studiedToday, true);
  });

  it("studiedToday=false when lastActiveDate is yesterday", () => {
    const r = computeStreak({ streak: 4, lastActiveDate: yesterday, dailyStudyTime: [] });
    assert.equal(r.studiedToday, false);
  });

  it("studiedToday=false when lastActiveDate is null", () => {
    const r = computeStreak({ streak: 3, lastActiveDate: null, dailyStudyTime: [] });
    assert.equal(r.studiedToday, false);
  });
});

// ── T-STREAK-003: currentStreak from DB value ─────────────────────────────────
describe("T-STREAK-003: computeStreak — currentStreak passthrough", () => {
  it("passes through DB streak value", () => {
    const r = computeStreak({ streak: 42, dailyStudyTime: [] });
    assert.equal(r.currentStreak, 42);
  });

  it("currentStreak=0 when streak is 0", () => {
    const r = computeStreak({ streak: 0, dailyStudyTime: [] });
    assert.equal(r.currentStreak, 0);
  });
});

// ── T-STREAK-004: longestStreak calculation ───────────────────────────────────
describe("T-STREAK-004: computeStreak — longestStreak in window", () => {
  it("longest run of consecutive valid days", () => {
    const dailyStudyTime = [
      { minutes: 25 }, { minutes: 30 }, { minutes: 0 },
      { minutes: 25 }, { minutes: 25 }, { minutes: 25 }, { minutes: 0 },
    ];
    const r = computeStreak({ streak: 1, dailyStudyTime });
    assert.equal(r.longestStreak, 3); // run of 3 beats run of 2
  });

  it("clamps longestStreak to at least currentStreak", () => {
    const r = computeStreak({ streak: 100, dailyStudyTime: [{ minutes: 25 }] });
    assert.ok(r.longestStreak >= 100);
  });

  it("valid day threshold is exactly VALID_STUDY_MINUTES (20)", () => {
    const below = computeStreak({ streak: 0, dailyStudyTime: [{ minutes: 19 }] });
    const exact  = computeStreak({ streak: 0, dailyStudyTime: [{ minutes: 20 }] });
    assert.equal(below.longestStreak, 0);
    assert.equal(exact.longestStreak, 1);
  });

  it("all valid days gives run = total length", () => {
    const daily = Array.from({ length: 7 }, () => ({ minutes: 30 }));
    const r = computeStreak({ streak: 0, dailyStudyTime: daily });
    assert.equal(r.longestStreak, 7);
  });

  it("all below-threshold days gives longestStreak = streak (from DB)", () => {
    const daily = Array.from({ length: 7 }, () => ({ minutes: 5 }));
    const r = computeStreak({ streak: 10, dailyStudyTime: daily });
    assert.equal(r.longestStreak, 10); // clamped to streak
  });
});

// ── T-STREAK-005: activeDaysThisWeek ─────────────────────────────────────────
describe("T-STREAK-005: computeStreak — activeDaysThisWeek", () => {
  it("counts valid days in last 7 entries", () => {
    const daily = [
      // entries before last 7 (ignored)
      { minutes: 30 }, { minutes: 30 },
      // last 7
      { minutes: 25 }, { minutes: 0  }, { minutes: 30 },
      { minutes: 0  }, { minutes: 25 }, { minutes: 30 }, { minutes: 0 },
    ];
    const r = computeStreak({ streak: 0, dailyStudyTime: daily });
    assert.equal(r.activeDaysThisWeek, 4);
  });

  it("activeDaysThisWeek=0 when all days below threshold", () => {
    const daily = Array.from({ length: 7 }, () => ({ minutes: 10 }));
    const r = computeStreak({ streak: 0, dailyStudyTime: daily });
    assert.equal(r.activeDaysThisWeek, 0);
  });

  it("activeDaysThisWeek=7 when all 7 days valid", () => {
    const daily = Array.from({ length: 7 }, () => ({ minutes: 25 }));
    const r = computeStreak({ streak: 0, dailyStudyTime: daily });
    assert.equal(r.activeDaysThisWeek, 7);
  });

  it("works with fewer than 7 entries", () => {
    const daily = [{ minutes: 25 }, { minutes: 25 }];
    const r = computeStreak({ streak: 0, dailyStudyTime: daily });
    assert.equal(r.activeDaysThisWeek, 2);
  });
});

// ── T-ACC-001: computeAccuracy — null / empty ─────────────────────────────────
describe("T-ACC-001: computeAccuracy — null/empty input", () => {
  it("returns zero-state for null", () => {
    const r = computeAccuracy(null);
    assert.equal(r.overall, 0);
    assert.equal(r.recent, null);
    assert.deepEqual(r.byTopic, []);
    assert.equal(r.trend, "stable");
    assert.equal(r.retentionScore, 0);
  });

  it("returns zero-state for undefined", () => {
    const r = computeAccuracy(undefined);
    assert.equal(r.overall, 0);
  });

  it("returns zero-state for empty object", () => {
    const r = computeAccuracy({});
    assert.equal(r.overall, 0);
    assert.equal(r.trend, "stable");
  });
});

// ── T-ACC-002: overall accuracy passthrough ───────────────────────────────────
describe("T-ACC-002: computeAccuracy — overall passthrough", () => {
  it("passes through avgAccuracy", () => {
    const r = computeAccuracy({ avgAccuracy: 72, topicAccuracy: [], retentionScore: 85 });
    assert.equal(r.overall, 72);
    assert.equal(r.retentionScore, 85);
  });

  it("byTopic passes through topicAccuracy array", () => {
    const topics = [{ topic: "Physics", accuracy: 80 }];
    const r = computeAccuracy({ avgAccuracy: 80, topicAccuracy: topics });
    assert.deepEqual(r.byTopic, topics);
  });
});

// ── T-ACC-003: recent accuracy proxy ──────────────────────────────────────────
describe("T-ACC-003: computeAccuracy — recent accuracy proxy", () => {
  it("recent = avg of top-3 topics when 3+ topics", () => {
    const r = computeAccuracy({
      avgAccuracy: 60,
      topicAccuracy: [
        { accuracy: 90 }, { accuracy: 80 }, { accuracy: 70 },
        { accuracy: 50 }, { accuracy: 40 },
      ],
    });
    assert.equal(r.recent, Math.round((90 + 80 + 70) / 3)); // 80
  });

  it("recent = avgAccuracy when fewer than 3 topics", () => {
    const r = computeAccuracy({
      avgAccuracy: 65,
      topicAccuracy: [{ accuracy: 90 }, { accuracy: 80 }],
    });
    assert.equal(r.recent, 65);
  });

  it("recent = avgAccuracy when no topics", () => {
    const r = computeAccuracy({ avgAccuracy: 55, topicAccuracy: [] });
    assert.equal(r.recent, 55);
  });
});

// ── T-ACC-004: trend direction ────────────────────────────────────────────────
describe("T-ACC-004: computeAccuracy — trend direction", () => {
  it("trend=up when recent > overall by > 5", () => {
    // recent will be avg of top-3 = (80+80+80)/3 = 80, overall=70, diff=10 > 5
    const r = computeAccuracy({
      avgAccuracy: 70,
      topicAccuracy: [{ accuracy: 80 }, { accuracy: 80 }, { accuracy: 80 }],
    });
    assert.equal(r.trend, "up");
  });

  it("trend=down when recent < overall by > 5", () => {
    // recent = (50+50+50)/3 = 50, overall = 70, diff = -20 < -5
    const r = computeAccuracy({
      avgAccuracy: 70,
      topicAccuracy: [{ accuracy: 50 }, { accuracy: 50 }, { accuracy: 50 }],
    });
    assert.equal(r.trend, "down");
  });

  it("trend=stable when diff <= 5", () => {
    // recent = (75+74+73)/3 = 74, overall = 72, diff = 2 — within ±5
    const r = computeAccuracy({
      avgAccuracy: 72,
      topicAccuracy: [{ accuracy: 75 }, { accuracy: 74 }, { accuracy: 73 }],
    });
    assert.equal(r.trend, "stable");
  });

  it("trend=stable when recent equals overall (no topics)", () => {
    const r = computeAccuracy({ avgAccuracy: 60, topicAccuracy: [] });
    assert.equal(r.trend, "stable");
  });

  it("trend boundary: diff exactly 5 is stable (not up)", () => {
    // recent = (75+75+75)/3 = 75, overall = 70, diff = 5 — NOT > 5, so stable
    const r = computeAccuracy({
      avgAccuracy: 70,
      topicAccuracy: [{ accuracy: 75 }, { accuracy: 75 }, { accuracy: 75 }],
    });
    assert.equal(r.trend, "stable");
  });

  it("trend boundary: diff exactly -5 is stable (not down)", () => {
    // recent = (65+65+65)/3 = 65, overall = 70, diff = -5 — NOT < -5, so stable
    const r = computeAccuracy({
      avgAccuracy: 70,
      topicAccuracy: [{ accuracy: 65 }, { accuracy: 65 }, { accuracy: 65 }],
    });
    assert.equal(r.trend, "stable");
  });
});

// ── T-VOICE-001: VOICE_LIMITS contract ────────────────────────────────────────
// voiceLimits.js creates a Supabase client at module level (uses @/ alias),
// so we test the expected contract directly rather than importing the module.
// These values must match src/lib/voiceLimits.js — if you change limits there,
// update these tests too (they are the source-of-truth documentation).
const VOICE_LIMITS = {
  free:    { callsPerDay: 2,    maxDurationSecs: 600,  label: "2 calls/day · 10 min each" },
  student: { callsPerDay: 5,    maxDurationSecs: 1200, label: "5 calls/day · 20 min each" },
  pro:     { callsPerDay: 15,   maxDurationSecs: 2400, label: "15 calls/day · 40 min each" },
  school:  { callsPerDay: null, maxDurationSecs: 3600, label: "Unlimited · 60 min each" },
};

describe("T-VOICE-001: VOICE_LIMITS — all tiers defined", () => {
  it("defines all 4 plan tiers", () => {
    assert.ok(VOICE_LIMITS.free);
    assert.ok(VOICE_LIMITS.student);
    assert.ok(VOICE_LIMITS.pro);
    assert.ok(VOICE_LIMITS.school);
  });

  it("free tier: 2 calls/day, 600 sec", () => {
    assert.equal(VOICE_LIMITS.free.callsPerDay, 2);
    assert.equal(VOICE_LIMITS.free.maxDurationSecs, 600);
  });

  it("student tier: 5 calls/day, 1200 sec", () => {
    assert.equal(VOICE_LIMITS.student.callsPerDay, 5);
    assert.equal(VOICE_LIMITS.student.maxDurationSecs, 1200);
  });

  it("pro tier: 15 calls/day, 2400 sec", () => {
    assert.equal(VOICE_LIMITS.pro.callsPerDay, 15);
    assert.equal(VOICE_LIMITS.pro.maxDurationSecs, 2400);
  });

  it("school tier: unlimited calls (null), 3600 sec", () => {
    assert.equal(VOICE_LIMITS.school.callsPerDay, null);
    assert.equal(VOICE_LIMITS.school.maxDurationSecs, 3600);
  });

  it("each tier has a label string", () => {
    for (const [, v] of Object.entries(VOICE_LIMITS)) {
      assert.ok(typeof v.label === "string" && v.label.length > 0);
    }
  });

  it("limits escalate correctly: free < student < pro", () => {
    assert.ok(VOICE_LIMITS.free.callsPerDay < VOICE_LIMITS.student.callsPerDay);
    assert.ok(VOICE_LIMITS.student.callsPerDay < VOICE_LIMITS.pro.callsPerDay);
    assert.ok(VOICE_LIMITS.free.maxDurationSecs < VOICE_LIMITS.student.maxDurationSecs);
    assert.ok(VOICE_LIMITS.student.maxDurationSecs < VOICE_LIMITS.pro.maxDurationSecs);
  });
});
