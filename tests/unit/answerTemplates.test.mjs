/**
 * Unit tests — getTemplate: mark snapping, template structure, questionType fallback
 * qa-framework.md test suite: T-TPL-001 through T-TPL-010
 *
 * Covers:
 *   src/lib/answerTemplates.js — getTemplate(), TEMPLATES
 *
 * Why this matters: getTemplate() is the bridge between the API's classification
 * event (marks, questionType) and the ConfidenceBadge's validateAnswer/scoreAnswer
 * calls. Incorrect snapping or wrong requiredSections silently skews every score.
 *
 * Run: node --test tests/unit/answerTemplates.test.mjs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getTemplate } from "../../src/lib/answerTemplates.js";
import { validateAnswer } from "../../src/lib/postProcessor.js";

// ════════════════════════════════════════════════════════════════════════════
// T-TPL-001 — Mark snapping: input maps to nearest valid mark level
// Valid levels: [2, 5, 10, 15, 20]
// ════════════════════════════════════════════════════════════════════════════
describe("T-TPL-001: Mark snapping — nearest valid level", () => {
  const CASES = [
    // [input, expected_snap]
    [1,  2],   // nearest to 2
    [2,  2],   // exact
    [3,  2],   // |3-2|=1 < |3-5|=2
    [4,  5],   // |4-5|=1 < |4-2|=2
    [5,  5],   // exact
    [7,  5],   // |7-5|=2 < |7-10|=3
    [8,  10],  // |8-10|=2 < |8-5|=3
    [10, 10],  // exact
    [12, 10],  // |12-10|=2 < |12-15|=3
    [13, 15],  // |13-15|=2 < |13-10|=3
    [15, 15],  // exact
    [17, 15],  // |17-15|=2 < |17-20|=3
    [18, 20],  // |18-20|=2 < |18-15|=3
    [20, 20],  // exact
    [25, 20],  // nearest to 20
  ];

  for (const [input, expected] of CASES) {
    test(`getTemplate(${input}) snaps to ${expected}`, () => {
      const tmpl = getTemplate(input, "theory");
      assert.equal(tmpl.marks, expected, `Input ${input}: expected snap to ${expected}, got ${tmpl.marks}`);
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// T-TPL-002 — Return shape: all required fields present
// ════════════════════════════════════════════════════════════════════════════
describe("T-TPL-002: Return shape — all required fields", () => {
  const MARK_LEVELS = [2, 5, 10, 15, 20];

  for (const marks of MARK_LEVELS) {
    test(`getTemplate(${marks}, "theory") returns complete shape`, () => {
      const tmpl = getTemplate(marks, "theory");
      assert.ok("prompt"           in tmpl, "missing prompt");
      assert.ok("wordRange"        in tmpl, "missing wordRange");
      assert.ok("maxTokens"        in tmpl, "missing maxTokens");
      assert.ok("requiredSections" in tmpl, "missing requiredSections");
      assert.ok("diagramRequired"  in tmpl, "missing diagramRequired");
      assert.ok("marks"            in tmpl, "missing marks");
    });

    test(`getTemplate(${marks}) wordRange is a [min, max] tuple`, () => {
      const { wordRange } = getTemplate(marks, "theory");
      assert.ok(Array.isArray(wordRange), "wordRange must be an array");
      assert.equal(wordRange.length, 2, "wordRange must have exactly 2 elements");
      assert.ok(wordRange[0] < wordRange[1], "wordRange[0] must be less than wordRange[1]");
    });

    test(`getTemplate(${marks}) requiredSections is an array`, () => {
      const { requiredSections } = getTemplate(marks, "theory");
      assert.ok(Array.isArray(requiredSections), "requiredSections must be an array");
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// T-TPL-003 — Diagram requirement by mark level
// ════════════════════════════════════════════════════════════════════════════
describe("T-TPL-003: diagramRequired by mark level", () => {
  test("2-mark: diagramRequired=false", () => {
    assert.equal(getTemplate(2, "theory").diagramRequired, false);
  });

  test("5-mark: diagramRequired=false", () => {
    assert.equal(getTemplate(5, "theory").diagramRequired, false);
  });

  test("10-mark: diagramRequired=true", () => {
    assert.equal(getTemplate(10, "theory").diagramRequired, true);
  });

  test("15-mark: diagramRequired=true", () => {
    assert.equal(getTemplate(15, "theory").diagramRequired, true);
  });

  test("20-mark: diagramRequired=true", () => {
    assert.equal(getTemplate(20, "theory").diagramRequired, true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-TPL-004 — requiredSections count and content by mark level
// ════════════════════════════════════════════════════════════════════════════
describe("T-TPL-004: requiredSections by mark level", () => {
  test("2-mark: requiredSections is empty []", () => {
    const { requiredSections } = getTemplate(2, "theory");
    assert.deepEqual(requiredSections, []);
  });

  test("5-mark: requires Key Points, Applications, Conclusion", () => {
    const { requiredSections } = getTemplate(5, "theory");
    assert.ok(requiredSections.includes("Key Points"),    "missing Key Points");
    assert.ok(requiredSections.includes("Applications"),  "missing Applications");
    assert.ok(requiredSections.includes("Conclusion"),    "missing Conclusion");
  });

  test("10-mark: requires Definition, Key Characteristics, Working, Diagram, Applications, Conclusion", () => {
    const { requiredSections } = getTemplate(10, "theory");
    const expected = ["Definition", "Key Characteristics", "Working", "Diagram", "Applications", "Conclusion"];
    for (const s of expected) {
      assert.ok(requiredSections.includes(s), `10M missing required section: "${s}"`);
    }
    assert.equal(requiredSections.length, 6);
  });

  test("15-mark: requires more sections than 10-mark", () => {
    const t10 = getTemplate(10, "theory").requiredSections;
    const t15 = getTemplate(15, "theory").requiredSections;
    assert.ok(t15.length > t10.length, `15M should require more sections than 10M`);
  });

  test("20-mark: requires most sections (≥ 10)", () => {
    const { requiredSections } = getTemplate(20, "theory");
    assert.ok(requiredSections.length >= 10, `Expected ≥10 required sections for 20M, got ${requiredSections.length}`);
  });

  test("20-mark: requires Current Trends, Case Study, and Theoretical Foundation", () => {
    const { requiredSections } = getTemplate(20, "theory");
    assert.ok(requiredSections.includes("Current Trends"),          "missing Current Trends");
    assert.ok(requiredSections.includes("Case Study"),              "missing Case Study");
    assert.ok(requiredSections.includes("Theoretical Foundation"),  "missing Theoretical Foundation");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-TPL-005 — Word range grows with mark level
// ════════════════════════════════════════════════════════════════════════════
describe("T-TPL-005: wordRange grows with mark level", () => {
  const levels = [2, 5, 10, 15, 20];

  test("wordRange[0] (min) increases at each mark level", () => {
    const mins = levels.map(m => getTemplate(m, "theory").wordRange[0]);
    for (let i = 1; i < mins.length; i++) {
      assert.ok(
        mins[i] > mins[i - 1],
        `Min words should increase: ${levels[i - 1]}M(${mins[i - 1]}) → ${levels[i]}M(${mins[i]})`
      );
    }
  });

  test("wordRange[1] (max) increases at each mark level", () => {
    const maxs = levels.map(m => getTemplate(m, "theory").wordRange[1]);
    for (let i = 1; i < maxs.length; i++) {
      assert.ok(
        maxs[i] > maxs[i - 1],
        `Max words should increase: ${levels[i - 1]}M(${maxs[i - 1]}) → ${levels[i]}M(${maxs[i]})`
      );
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-TPL-006 — questionType fallback
// ════════════════════════════════════════════════════════════════════════════
describe("T-TPL-006: questionType fallback to theory", () => {
  test("unknown questionType falls back to theory prompt", () => {
    const theoryTmpl  = getTemplate(10, "theory");
    const unknownTmpl = getTemplate(10, "unknowntype");
    assert.equal(unknownTmpl.prompt, theoryTmpl.prompt, "unknown type must use theory prompt");
  });

  test("null questionType falls back to theory", () => {
    const theoryTmpl = getTemplate(10, "theory");
    const nullTmpl   = getTemplate(10, null);
    assert.equal(nullTmpl.prompt, theoryTmpl.prompt);
  });

  test("'problem' questionType returns the PROBLEM_TEMPLATE (not theory)", () => {
    const theoryTmpl  = getTemplate(10, "theory");
    const problemTmpl = getTemplate(10, "problem");
    assert.notEqual(problemTmpl.prompt, theoryTmpl.prompt, "problem must have its own prompt");
    assert.ok(problemTmpl.prompt.includes("Given:"), "problem prompt must include 'Given:' section");
  });

  test("'code' questionType returns code template", () => {
    const codeTmpl = getTemplate(10, "code");
    assert.ok(codeTmpl.prompt.includes("Approach:"), "code prompt must include 'Approach:'");
    assert.ok(codeTmpl.prompt.includes("Complexity Analysis:"), "code prompt must include 'Complexity Analysis:'");
  });

  test("'comparison' questionType returns comparison template", () => {
    const cmpTmpl = getTemplate(10, "comparison");
    assert.ok(cmpTmpl.prompt.includes("Key Differences"), "comparison prompt must include 'Key Differences'");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-TPL-007 — problem/code/comparison/diagram templates share same prompt
//             regardless of mark level (they're question-type specific, not mark-specific)
// ════════════════════════════════════════════════════════════════════════════
describe("T-TPL-007: Non-theory templates are mark-level invariant", () => {
  const TYPES = ["problem", "code", "comparison", "derivation", "diagram"];

  for (const qtype of TYPES) {
    test(`"${qtype}" prompt is identical across all mark levels`, () => {
      const prompts = [2, 5, 10, 15, 20].map(m => getTemplate(m, qtype).prompt);
      const allSame = prompts.every(p => p === prompts[0]);
      assert.ok(allSame, `"${qtype}" prompt differs across mark levels — unexpected`);
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// T-TPL-008 — maxTokens grows with mark level
// ════════════════════════════════════════════════════════════════════════════
describe("T-TPL-008: maxTokens increases with mark level", () => {
  test("2-mark maxTokens < 5-mark maxTokens", () => {
    assert.ok(getTemplate(2, "theory").maxTokens < getTemplate(5, "theory").maxTokens);
  });

  test("10-mark maxTokens < 15-mark maxTokens", () => {
    assert.ok(getTemplate(10, "theory").maxTokens < getTemplate(15, "theory").maxTokens);
  });

  test("15-mark maxTokens < 20-mark maxTokens", () => {
    assert.ok(getTemplate(15, "theory").maxTokens < getTemplate(20, "theory").maxTokens);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-TPL-009 — Integration: classification event → getTemplate → validateAnswer
//             (mirrors exactly what ConfidenceBadge does on every render)
// ════════════════════════════════════════════════════════════════════════════
describe("T-TPL-009: Integration — classification → template → validateAnswer", () => {
  const COMPLETE_ANSWER_BY_MARKS = {
    10: `**Definition**\nAn OS manages hardware.\n**Key Characteristics**\n- Scheduling\n**Working**\n1. Step 1\n**Diagram**\n\`\`\`\nbox\n\`\`\`\n**Applications**\n- Linux\n**Conclusion**\nOS is essential.`,
    5:  `**Key Points**\n- Point A\n**Applications**\n- App A\n**Conclusion**\nDone.`,
    2:  `**Paging** — A memory management technique dividing memory into fixed-size pages.`,
  };

  for (const [marks, answer] of Object.entries(COMPLETE_ANSWER_BY_MARKS)) {
    const m = Number(marks);
    test(`${m}-mark: classification → template → no missing required sections`, () => {
      const tmpl = getTemplate(m, "theory");
      const result = validateAnswer(answer, tmpl);
      assert.deepEqual(
        result.missingSections, [],
        `${m}M: unexpected missing sections: ${result.missingSections}`
      );
    });
  }

  test("wrong mark level (10M answer validated against 20M template) → many missing sections", () => {
    const tmpl10Answer = COMPLETE_ANSWER_BY_MARKS[10];
    const tmpl20       = getTemplate(20, "theory");
    const result       = validateAnswer(tmpl10Answer, tmpl20);
    // 20M requires 12 sections; 10M answer only has 6 → many will be missing
    assert.ok(result.missingSections.length >= 5, `Expected many missing sections, got ${result.missingSections.length}`);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-TPL-010 — Theory prompts contain the mark-level section headings
//             (ensures prompt instructs the model correctly)
// ════════════════════════════════════════════════════════════════════════════
describe("T-TPL-010: Theory prompt content matches requiredSections", () => {
  const MARK_LEVELS = [5, 10, 15, 20];

  for (const marks of MARK_LEVELS) {
    test(`${marks}M: each requiredSection appears in the theory prompt`, () => {
      const { prompt, requiredSections } = getTemplate(marks, "theory");
      for (const section of requiredSections) {
        assert.ok(
          prompt.includes(section),
          `${marks}M prompt missing section instruction: "${section}"`
        );
      }
    });
  }
});
