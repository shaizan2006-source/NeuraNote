import { test, describe } from "node:test";
import assert from "node:assert/strict";

// ── Pure function inlined from the route (identical logic) ──────────
const FALLBACK_TASKS = [
  { name: "Read through the material carefully", estimatedMinutes: 15 },
  { name: "Note key concepts and definitions", estimatedMinutes: 10 },
  { name: "Attempt practice problems", estimatedMinutes: 20 },
  { name: "Review and summarise", estimatedMinutes: 10 },
];

function parseFocusTasks(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return FALLBACK_TASKS;
    return parsed.map((t, i) => ({
      id: `t${i + 1}`,
      name: String(t.name || "Study task"),
      estimatedMinutes: Number(t.estimatedMinutes) || 10,
      status: i === 0 ? "current" : "pending",
    }));
  } catch {
    return FALLBACK_TASKS;
  }
}

// ── Tests ───────────────────────────────────────────────────────────
describe("parseFocusTasks", () => {
  test("parses valid GPT JSON array", () => {
    const raw = JSON.stringify([
      { name: "Review definitions", estimatedMinutes: 8 },
      { name: "Solve problems", estimatedMinutes: 12 },
    ]);
    const result = parseFocusTasks(raw);
    assert.equal(result.length, 2);
    assert.equal(result[0].id, "t1");
    assert.equal(result[0].name, "Review definitions");
    assert.equal(result[0].estimatedMinutes, 8);
    assert.equal(result[0].status, "current");
    assert.equal(result[1].status, "pending");
  });

  test("returns fallback tasks on invalid JSON", () => {
    const result = parseFocusTasks("not json at all");
    assert.equal(result, FALLBACK_TASKS);
    assert.equal(result.length, 4);
  });

  test("returns fallback tasks on empty array", () => {
    const result = parseFocusTasks("[]");
    assert.equal(result, FALLBACK_TASKS);
  });

  test("handles missing estimatedMinutes with default 10", () => {
    const raw = JSON.stringify([{ name: "Study" }]);
    const result = parseFocusTasks(raw);
    assert.equal(result[0].estimatedMinutes, 10);
  });

  test("handles missing name with default string", () => {
    const raw = JSON.stringify([{ estimatedMinutes: 5 }]);
    const result = parseFocusTasks(raw);
    assert.equal(result[0].name, "Study task");
  });
});
