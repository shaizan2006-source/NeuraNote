import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  computeEngagementScore,
  computeModeBalance,
  computeFollowupDepth,
  computeLearningTrend,
  generateInsights,
  computeFocusScore,
  computeWeeklyChange,
} from "../progressUtils.js";

// ── Helpers ───────────────────────────────────────────────────────

function makeEvent(event_type, metadata = {}, daysAgo = 0) {
  const d = new Date(Date.now() - daysAgo * 24 * 3600 * 1000);
  return { event_type, metadata, created_at: d.toISOString(), session_id: "sess-1", topic: metadata.topic || null };
}

// ── computeEngagementScore ────────────────────────────────────────

describe("computeEngagementScore", () => {
  it("returns 0 for empty events", () => {
    assert.equal(computeEngagementScore([], 0, 0), 0);
  });

  it("increases with more questions", () => {
    const few  = Array.from({ length: 5  }, (_, i) => makeEvent("question_asked", { mode: "answer", depth: 0 }, i));
    const many = Array.from({ length: 30 }, (_, i) => makeEvent("question_asked", { mode: "answer", depth: 0 }, i % 14));
    assert.ok(computeEngagementScore(many, 0, 0) > computeEngagementScore(few, 0, 0));
  });

  it("rewards coach-mode usage", () => {
    const answerOnly = Array.from({ length: 10 }, (_, i) => makeEvent("question_asked", { mode: "answer", depth: 1 }, i % 14));
    const withCoach  = [
      ...Array.from({ length: 7 }, (_, i) => makeEvent("question_asked", { mode: "answer", depth: 1 }, i)),
      ...Array.from({ length: 3 }, (_, i) => makeEvent("question_asked", { mode: "coach",  depth: 2 }, i)),
    ];
    assert.ok(computeEngagementScore(withCoach, 0, 0) > computeEngagementScore(answerOnly, 0, 0));
  });

  it("caps at 100", () => {
    const events = Array.from({ length: 200 }, (_, i) =>
      makeEvent("question_asked", { mode: "coach", depth: 10, topic: `topic-${i % 20}` }, i % 14)
    );
    assert.ok(computeEngagementScore(events, 14, 30) <= 100);
  });
});

// ── computeModeBalance ────────────────────────────────────────────

describe("computeModeBalance", () => {
  it("returns zeros for no events", () => {
    const r = computeModeBalance([]);
    assert.equal(r.answeringMins, 0);
    assert.equal(r.coachMins, 0);
    assert.equal(r.ratio, 0);
  });

  it("counts answering and coach separately", () => {
    const events = [
      makeEvent("question_asked", { mode: "answer" }),
      makeEvent("question_asked", { mode: "answer" }),
      makeEvent("question_asked", { mode: "coach"  }),
    ];
    const r = computeModeBalance(events);
    assert.equal(r.answeringMins, 6);   // 2 × 3 min
    assert.equal(r.coachMins, 5);        // 1 × 5 min
    assert.ok(r.ratio > 0);
  });
});

// ── computeFollowupDepth ─────────────────────────────────────────

describe("computeFollowupDepth", () => {
  it("returns 0 for empty events", () => {
    assert.equal(computeFollowupDepth([]), 0);
  });

  it("averages depth values correctly", () => {
    const events = [
      makeEvent("question_asked", { depth: 0 }),
      makeEvent("question_asked", { depth: 2 }),
      makeEvent("question_asked", { depth: 4 }),
    ];
    assert.equal(computeFollowupDepth(events), 2);
  });

  it("ignores non-question events", () => {
    const events = [
      makeEvent("mode_switched", { depth: 99 }),
      makeEvent("question_asked", { depth: 3 }),
    ];
    assert.equal(computeFollowupDepth(events), 3);
  });
});

// ── computeLearningTrend ─────────────────────────────────────────

describe("computeLearningTrend", () => {
  it("returns steady for empty events", () => {
    assert.equal(computeLearningTrend([]), "steady");
  });

  it("returns rising when recent questions > past", () => {
    const old    = Array.from({ length: 2 },  (_, i) => makeEvent("question_asked", {}, 8 + i));
    const recent = Array.from({ length: 10 }, (_, i) => makeEvent("question_asked", {}, i));
    assert.equal(computeLearningTrend([...old, ...recent]), "rising");
  });

  it("returns declining when recent questions < past", () => {
    const old    = Array.from({ length: 10 }, (_, i) => makeEvent("question_asked", {}, 8 + i));
    const recent = Array.from({ length: 1 },  (_, i) => makeEvent("question_asked", {}, i));
    assert.equal(computeLearningTrend([...old, ...recent]), "declining");
  });
});

// ── generateInsights ─────────────────────────────────────────────

describe("generateInsights", () => {
  it("returns array of ≤5 items", () => {
    const ins = generateInsights({
      learningTrend: "rising", followupDepth: 4, modeBalance: { coachMins: 20, answeringMins: 40 },
      streak: 7, strongestSubject: "Physics", avgAccuracy: 75,
      topicAccuracy: [{ topic: "Thermodynamics", accuracy: 45 }], weeklyChange: 30,
    });
    assert.ok(Array.isArray(ins));
    assert.ok(ins.length <= 5);
  });

  it("emits a gap insight for weak topic", () => {
    const ins = generateInsights({
      learningTrend: "steady", followupDepth: 1, modeBalance: { coachMins: 0, answeringMins: 10 },
      streak: 2, strongestSubject: null, avgAccuracy: 50,
      topicAccuracy: [{ topic: "Optics", accuracy: 40 }], weeklyChange: 0,
    });
    assert.ok(ins.some(i => i.kind === "gap" && i.topic === "Optics"));
  });

  it("emits a nudge when streak is 0", () => {
    const ins = generateInsights({
      learningTrend: "steady", followupDepth: 0, modeBalance: { coachMins: 0, answeringMins: 0 },
      streak: 0, strongestSubject: null, avgAccuracy: 0, topicAccuracy: [], weeklyChange: 0,
    });
    assert.ok(ins.some(i => i.kind === "nudge"));
  });
});

// ── Existing functions (regression guard) ────────────────────────

describe("computeFocusScore (regression)", () => {
  it("returns 0 for all zeros", () => {
    assert.equal(computeFocusScore({ streak: 0, totalStudyTimeMins: 0, topicsMastered: 0, totalTopics: 0 }), 0);
  });
  it("caps at 100", () => {
    assert.equal(computeFocusScore({ streak: 100, totalStudyTimeMins: 1000, topicsMastered: 50, totalTopics: 50 }), 100);
  });
});

describe("computeWeeklyChange (regression)", () => {
  it("returns 0 for < 14 days", () => {
    assert.equal(computeWeeklyChange([{ date: "x", minutes: 10 }]), 0);
  });
  it("returns 100 when last week was 0", () => {
    const days = Array.from({ length: 14 }, (_, i) => ({
      date:    `2026-01-${String(i + 1).padStart(2, "0")}`,
      minutes: i < 7 ? 0 : 30,
    }));
    assert.equal(computeWeeklyChange(days), 100);
  });
});
