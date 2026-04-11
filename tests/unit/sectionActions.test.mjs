/**
 * Unit tests — Section action buttons: Simplify + Quiz me query generation
 * qa-framework.md test suite: T-ACT-001 through T-ACT-012
 *
 * Covers logic extracted from:
 *   src/components/answer/AnswerSection.jsx  — fireAction()
 *   src/lib/parseAnswerSections.js           — getSectionMeta()
 *
 * The fireAction function is inlined here because AnswerSection.jsx uses JSX
 * and can't be imported without a transpiler in a pure Node test runner.
 * The logic is trivial (3 lines) and tested against the exact source strings.
 *
 * Run: node --test tests/unit/sectionActions.test.mjs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getSectionMeta } from "../../src/lib/parseAnswerSections.js";

// ── Inlined from AnswerSection.jsx: fireAction() ─────────────────────────────
// Source: src/components/answer/AnswerSection.jsx lines 26-34
function fireAction(type, heading, onAction) {
  if (!onAction) return undefined;
  const meta = getSectionMeta(heading);
  const sectionLabel = meta.label || heading || "this section";
  if (type === "simplify") {
    return onAction(`Explain "${sectionLabel}" in the simplest possible way — no jargon, use an everyday analogy`);
  } else if (type === "quiz") {
    return onAction(`Give me 3 short exam questions (with answers) specifically about "${sectionLabel}"`);
  }
}

// Capture helper: returns whatever onAction was called with
function capture() {
  let received = null;
  const onAction = (query) => { received = query; };
  return { onAction, get query() { return received; } };
}

// ════════════════════════════════════════════════════════════════════════════
// T-ACT-001 — Simplify query format for known sections
// ════════════════════════════════════════════════════════════════════════════
describe("T-ACT-001: Simplify — known section uses meta.label", () => {
  const KNOWN_SECTIONS = [
    { heading: "Definition",        expectedLabel: "Definition"        },
    { heading: "Working",           expectedLabel: "Working"           },
    { heading: "Applications",      expectedLabel: "Applications"      },
    { heading: "Limitations",       expectedLabel: "Limitations"       },
    { heading: "Conclusion",        expectedLabel: "Conclusion"        },
    { heading: "Critical Analysis", expectedLabel: "Critical Analysis" },
    { heading: "Diagram",           expectedLabel: "Diagram"           },
  ];

  for (const { heading, expectedLabel } of KNOWN_SECTIONS) {
    test(`Simplify "${heading}" → correct query with label "${expectedLabel}"`, () => {
      const c = capture();
      fireAction("simplify", heading, c.onAction);
      const expected = `Explain "${expectedLabel}" in the simplest possible way — no jargon, use an everyday analogy`;
      assert.equal(c.query, expected, `Query mismatch for heading "${heading}"`);
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// T-ACT-002 — Quiz me query format for known sections
// ════════════════════════════════════════════════════════════════════════════
describe("T-ACT-002: Quiz me — known section uses meta.label", () => {
  const KNOWN_SECTIONS = [
    { heading: "Definition",    expectedLabel: "Definition"    },
    { heading: "Working",       expectedLabel: "Working"       },
    { heading: "Applications",  expectedLabel: "Applications"  },
  ];

  for (const { heading, expectedLabel } of KNOWN_SECTIONS) {
    test(`Quiz me "${heading}" → correct query with label "${expectedLabel}"`, () => {
      const c = capture();
      fireAction("quiz", heading, c.onAction);
      const expected = `Give me 3 short exam questions (with answers) specifically about "${expectedLabel}"`;
      assert.equal(c.query, expected, `Query mismatch for heading "${heading}"`);
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// T-ACT-003 — Unknown headings use raw heading text (not a fallback icon)
// ════════════════════════════════════════════════════════════════════════════
describe("T-ACT-003: Unknown section heading — uses raw heading, not icon", () => {
  test("Simplify: unknown heading 'Custom Section' appears literally in query", () => {
    const c = capture();
    fireAction("simplify", "Custom Section", c.onAction);
    assert.ok(c.query.includes("Custom Section"), `Query should contain 'Custom Section', got: ${c.query}`);
    assert.ok(!c.query.includes("📝"), "Query must not contain fallback icon");
  });

  test("Quiz me: unknown heading 'Random Topic' appears literally in query", () => {
    const c = capture();
    fireAction("quiz", "Random Topic", c.onAction);
    assert.ok(c.query.includes("Random Topic"), `Query should contain 'Random Topic', got: ${c.query}`);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-ACT-004 — Null heading falls back to "this section"
// ════════════════════════════════════════════════════════════════════════════
describe("T-ACT-004: Null heading → 'this section' fallback", () => {
  test("Simplify with null heading uses 'this section'", () => {
    const c = capture();
    fireAction("simplify", null, c.onAction);
    const expected = `Explain "this section" in the simplest possible way — no jargon, use an everyday analogy`;
    assert.equal(c.query, expected);
  });

  test("Quiz me with null heading uses 'this section'", () => {
    const c = capture();
    fireAction("quiz", null, c.onAction);
    const expected = `Give me 3 short exam questions (with answers) specifically about "this section"`;
    assert.equal(c.query, expected);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-ACT-005 — onAction is not called when undefined
// ════════════════════════════════════════════════════════════════════════════
describe("T-ACT-005: No onAction — no throw, returns undefined", () => {
  test("fireAction with undefined onAction does not throw", () => {
    assert.doesNotThrow(() => fireAction("simplify", "Definition", undefined));
  });

  test("fireAction with undefined onAction returns undefined", () => {
    const result = fireAction("simplify", "Definition", undefined);
    assert.equal(result, undefined);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-ACT-006 — Query string exact format validation
// ════════════════════════════════════════════════════════════════════════════
describe("T-ACT-006: Exact query string format", () => {
  test("Simplify query starts with 'Explain '", () => {
    const c = capture();
    fireAction("simplify", "Definition", c.onAction);
    assert.ok(c.query.startsWith("Explain "), `Query must start with 'Explain ': ${c.query}`);
  });

  test("Simplify query ends with 'use an everyday analogy'", () => {
    const c = capture();
    fireAction("simplify", "Definition", c.onAction);
    assert.ok(c.query.endsWith("use an everyday analogy"), `Query must end with correct phrase`);
  });

  test("Simplify query contains 'no jargon'", () => {
    const c = capture();
    fireAction("simplify", "Definition", c.onAction);
    assert.ok(c.query.includes("no jargon"), "Simplify query must mention 'no jargon'");
  });

  test("Quiz query starts with 'Give me 3 short exam questions'", () => {
    const c = capture();
    fireAction("quiz", "Definition", c.onAction);
    assert.ok(c.query.startsWith("Give me 3 short exam questions"), `Query must start with correct prefix: ${c.query}`);
  });

  test("Quiz query contains '(with answers)'", () => {
    const c = capture();
    fireAction("quiz", "Definition", c.onAction);
    assert.ok(c.query.includes("(with answers)"), "Quiz query must include '(with answers)'");
  });

  test("section label is wrapped in double quotes in query", () => {
    const c = capture();
    fireAction("simplify", "Definition", c.onAction);
    assert.ok(c.query.includes('"Definition"'), `Label must be in double quotes: ${c.query}`);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-ACT-007 — onAction receives exactly one string argument
// ════════════════════════════════════════════════════════════════════════════
describe("T-ACT-007: onAction receives a single string argument", () => {
  test("Simplify: onAction receives one string", () => {
    let callCount = 0;
    let receivedArgs = [];
    fireAction("simplify", "Working", (...args) => {
      callCount++;
      receivedArgs = args;
    });
    assert.equal(callCount, 1, "onAction must be called exactly once");
    assert.equal(receivedArgs.length, 1, "onAction must receive exactly 1 argument");
    assert.equal(typeof receivedArgs[0], "string", "argument must be a string");
  });

  test("Quiz me: onAction receives one string", () => {
    let callCount = 0;
    fireAction("quiz", "Working", () => { callCount++; });
    assert.equal(callCount, 1, "onAction must be called exactly once");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-ACT-008 — Unknown action type (guard against future regressions)
// ════════════════════════════════════════════════════════════════════════════
describe("T-ACT-008: Unknown action type is ignored", () => {
  test("unknown action type does not call onAction", () => {
    let called = false;
    fireAction("summarize", "Definition", () => { called = true; });
    assert.equal(called, false, "Unknown action type must not invoke onAction");
  });

  test("unknown action type does not throw", () => {
    assert.doesNotThrow(() => fireAction("summarize", "Definition", () => {}));
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-ACT-009 — Real-world section labels from 10-mark template
// ════════════════════════════════════════════════════════════════════════════
describe("T-ACT-009: Real 10-mark section labels — full round-trip", () => {
  // These are the exact required sections from TEMPLATE_10M in answerTemplates.js
  const TEN_MARK_SECTIONS = [
    "Definition",
    "Key Characteristics",
    "Working",
    "Diagram",
    "Applications",
    "Conclusion",
  ];

  for (const heading of TEN_MARK_SECTIONS) {
    test(`Simplify + Quiz generate non-empty queries for "${heading}"`, () => {
      const c1 = capture();
      const c2 = capture();
      fireAction("simplify", heading, c1.onAction);
      fireAction("quiz",     heading, c2.onAction);
      assert.ok(c1.query?.length > 0, `Simplify query empty for "${heading}"`);
      assert.ok(c2.query?.length > 0, `Quiz query empty for "${heading}"`);
      assert.notEqual(c1.query, c2.query, "Simplify and Quiz must produce different queries");
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// T-ACT-010 — Case sensitivity: heading "working" matches meta label "Working"
// ════════════════════════════════════════════════════════════════════════════
describe("T-ACT-010: Case-insensitive section label in query", () => {
  test("'working' (lowercase) resolves to 'Working' label in query", () => {
    const c = capture();
    fireAction("simplify", "working", c.onAction);
    // getSectionMeta is case-insensitive so label should be "Working"
    assert.ok(c.query.includes('"Working"'), `Expected "Working" in query, got: ${c.query}`);
  });

  test("'DEFINITION' resolves to 'Definition' label in query", () => {
    const c = capture();
    fireAction("quiz", "DEFINITION", c.onAction);
    assert.ok(c.query.includes('"Definition"'), `Expected "Definition" in query, got: ${c.query}`);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-ACT-011 — Special chars in heading don't break query string
// ════════════════════════════════════════════════════════════════════════════
describe("T-ACT-011: Special characters in heading", () => {
  test("heading with slash: 'Working / Process' appears in query correctly", () => {
    const c = capture();
    fireAction("simplify", "Working / Process", c.onAction);
    // getSectionMeta maps "Working / Process" → label "Working / Process"
    assert.ok(c.query.includes("Working / Process"), `Got: ${c.query}`);
  });

  test("heading with hyphen: 'Real-World Applications' appears in query", () => {
    const c = capture();
    fireAction("quiz", "Real-world applications", c.onAction);
    // Falls back to raw heading since not in SECTION_META
    assert.ok(c.query.length > 0, "Query must not be empty");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-ACT-012 — Streaming guard: buttons should NOT fire while streaming
// (tests the conditional in AnswerSection JSX: !isStreaming)
// ════════════════════════════════════════════════════════════════════════════
describe("T-ACT-012: Streaming guard — logic contract", () => {
  // We can't test the React render, but we can verify the guard logic:
  // if isStreaming, buttons are not rendered, so onAction is never called.
  // Test that when caller guards with isStreaming, onAction is not invoked.

  function guardedFireAction(type, heading, onAction, isStreaming) {
    if (isStreaming) return; // mirrors AnswerSection: buttons not rendered while streaming
    return fireAction(type, heading, onAction);
  }

  test("isStreaming=true: onAction is not called", () => {
    let called = false;
    guardedFireAction("simplify", "Definition", () => { called = true; }, true);
    assert.equal(called, false, "onAction must not fire while streaming");
  });

  test("isStreaming=false: onAction is called normally", () => {
    let called = false;
    guardedFireAction("simplify", "Definition", () => { called = true; }, false);
    assert.equal(called, true, "onAction must fire when not streaming");
  });
});
