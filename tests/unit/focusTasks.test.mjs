import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseSynthesizedTasks, ENHANCED_FALLBACK_TASKS, stripFences } from "../../src/lib/focusPlanner.js";

describe("parseSynthesizedTasks", () => {
  test("parses valid GPT JSON array", () => {
    const raw = JSON.stringify([
      { name: "Review definitions", estimatedMinutes: 8, taskType: "memorisation", examWeight: "high" },
      { name: "Solve problems", estimatedMinutes: 12, taskType: "practice", examWeight: "medium" },
    ]);
    const result = parseSynthesizedTasks(raw);
    assert.ok(Array.isArray(result), "should return an array");
    assert.equal(result.length, 2);
    assert.equal(result[0].id, "t1");
    assert.equal(result[0].name, "Review definitions");
    assert.equal(result[0].estimatedMinutes, 8);
    assert.equal(result[0].taskType, "memorisation");
    assert.equal(result[0].examWeight, "high");
    assert.equal(result[1].id, "t2");
  });

  test("returns null on invalid JSON", () => {
    const result = parseSynthesizedTasks("not json at all");
    assert.equal(result, null);
  });

  test("returns null on empty array", () => {
    const result = parseSynthesizedTasks("[]");
    assert.equal(result, null);
  });

  test("clamps estimatedMinutes below 5 up to 5", () => {
    const raw = JSON.stringify([{ name: "Quick task", estimatedMinutes: 1 }]);
    const result = parseSynthesizedTasks(raw);
    assert.equal(result[0].estimatedMinutes, 5);
  });

  test("clamps estimatedMinutes above 60 down to 60", () => {
    const raw = JSON.stringify([{ name: "Long task", estimatedMinutes: 120 }]);
    const result = parseSynthesizedTasks(raw);
    assert.equal(result[0].estimatedMinutes, 60);
  });

  test("defaults missing estimatedMinutes to 15", () => {
    const raw = JSON.stringify([{ name: "Study" }]);
    const result = parseSynthesizedTasks(raw);
    assert.equal(result[0].estimatedMinutes, 15);
  });

  test("defaults missing name to 'Study task'", () => {
    const raw = JSON.stringify([{ estimatedMinutes: 10 }]);
    const result = parseSynthesizedTasks(raw);
    assert.equal(result[0].name, "Study task");
  });

  test("defaults invalid taskType to 'conceptual'", () => {
    const raw = JSON.stringify([{ name: "Task", taskType: "unknown_type" }]);
    const result = parseSynthesizedTasks(raw);
    assert.equal(result[0].taskType, "conceptual");
  });

  test("defaults invalid examWeight to 'standard'", () => {
    const raw = JSON.stringify([{ name: "Task", examWeight: "critical" }]);
    const result = parseSynthesizedTasks(raw);
    assert.equal(result[0].examWeight, "standard");
  });

  test("strips markdown code fences before parsing", () => {
    const raw = "```json\n" + JSON.stringify([{ name: "Fenced task", estimatedMinutes: 10 }]) + "\n```";
    const result = parseSynthesizedTasks(raw);
    assert.ok(Array.isArray(result));
    assert.equal(result[0].name, "Fenced task");
  });
});

describe("ENHANCED_FALLBACK_TASKS", () => {
  test("has at least 4 tasks with required fields", () => {
    assert.ok(Array.isArray(ENHANCED_FALLBACK_TASKS));
    assert.ok(ENHANCED_FALLBACK_TASKS.length >= 4);
    for (const t of ENHANCED_FALLBACK_TASKS) {
      assert.ok(t.id, "task must have id");
      assert.ok(t.name, "task must have name");
      assert.ok(typeof t.estimatedMinutes === "number", "task must have estimatedMinutes");
      assert.ok(t.taskType, "task must have taskType");
      assert.ok(t.examWeight, "task must have examWeight");
    }
  });
});

describe("stripFences", () => {
  test("removes ```json code fences", () => {
    assert.equal(stripFences("```json\n[1,2]\n```"), "[1,2]");
  });

  test("is a no-op on plain JSON", () => {
    assert.equal(stripFences("[1,2]"), "[1,2]");
  });
});
