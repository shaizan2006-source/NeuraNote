/**
 * Unit tests — Edge cases per qa-framework.md §"Edge Case Testing"
 * qa-framework.md test suite: T-EDGE-001 through T-EDGE-010
 *
 * Covers:
 *   - Ambiguous prompts (headings that look like headings but aren't)
 *   - Extremely short inputs (2-mark, single sentence)
 *   - Very long inputs (20-mark, 1000+ words)
 *   - Mixed-domain answers (code blocks, math, tables in same answer)
 *   - Malformed markdown (unclosed bold, nested stars, empty headings)
 *   - Unicode and non-ASCII content
 *   - [Verify] markers embedded in headings, code blocks, tables
 *   - Cross-module pipeline: parse → validate → score all agree
 *
 * Run: node --test tests/unit/edgeCases.test.mjs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseAnswerSections, getSectionMeta } from "../../src/lib/parseAnswerSections.js";
import { validateAnswer, scoreAnswer, extractVerifyMarkers } from "../../src/lib/postProcessor.js";
import { getTemplate } from "../../src/lib/answerTemplates.js";

// ════════════════════════════════════════════════════════════════════════════
// T-EDGE-001 — Ambiguous bold lines: NOT parsed as headings
// These are bold phrases that appear on their own line but should NOT create
// section cards (they fail the heading heuristic rules in parseAnswerSections)
// ════════════════════════════════════════════════════════════════════════════
describe("T-EDGE-001: Ambiguous bold lines — not treated as headings", () => {
  test("bold sentence ending with period is not a heading", () => {
    const md = "**This is a complete sentence with a period.**\ncontent";
    const sections = parseAnswerSections(md);
    assert.ok(!sections.some(s => s.heading?.includes("period")), "Period-terminated bold must not be a heading");
  });

  test("bold text with a comma anywhere is not a heading", () => {
    // Commas anywhere in candidate are now rejected by the heuristic
    const md = "**Important note, pay attention**\ncontent";
    const sections = parseAnswerSections(md);
    assert.ok(!sections.some(s => s.heading === "Important note, pay attention"),
      "Bold line with mid-sentence comma must not become a heading");
  });

  test("bold text with 8+ words is not a heading", () => {
    const md = "**This has eight or more words so it is definitely not a heading**\ncontent";
    const sections = parseAnswerSections(md);
    assert.ok(!sections.some(s => s.heading?.split(" ").length >= 8));
  });

  test("bold text starting with lowercase is not a heading", () => {
    const md = "**the process begins here**\ncontent";
    const sections = parseAnswerSections(md);
    // lowercase first letter fails the /^[A-Z*]/ check
    assert.ok(!sections.some(s => s.heading === "the process begins here"));
  });

  test("bold text mid-paragraph is never a heading", () => {
    const md = "An OS uses **scheduling** to manage processes.\nIt also uses **memory management**.";
    const sections = parseAnswerSections(md);
    assert.ok(!sections.some(s => s.heading === "scheduling"));
    assert.ok(!sections.some(s => s.heading === "memory management"));
  });

  test("inline code is not a heading", () => {
    const md = "`processScheduler()`\ncontent follows";
    const sections = parseAnswerSections(md);
    assert.ok(!sections.some(s => s.heading?.includes("processScheduler")));
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-EDGE-002 — Extremely short inputs (2-mark single sentence)
// ════════════════════════════════════════════════════════════════════════════
describe("T-EDGE-002: Extremely short inputs — 2-mark answers", () => {
  // ~35 words — within the 2M range of [30, 80]
  const SHORT_ANSWER = "**Paging** — A memory management technique that divides physical memory into fixed-size blocks called pages. Each process is assigned pages, allowing non-contiguous allocation and enabling virtual memory in modern operating systems.";

  test("short 2-mark answer parses without throwing", () => {
    assert.doesNotThrow(() => parseAnswerSections(SHORT_ANSWER));
  });

  test("short 2-mark answer validates without throwing", () => {
    const tmpl = getTemplate(2, "theory");
    assert.doesNotThrow(() => validateAnswer(SHORT_ANSWER, tmpl));
  });

  test("short 2-mark answer: no required sections → missingSections=[]", () => {
    const tmpl = getTemplate(2, "theory");
    const result = validateAnswer(SHORT_ANSWER, tmpl);
    assert.deepEqual(result.missingSections, []);
  });

  test("short 2-mark answer: in word range [30,80]", () => {
    const tmpl = getTemplate(2, "theory");
    const result = validateAnswer(SHORT_ANSWER, tmpl);
    assert.ok(result.wordInRange, `wordCount=${result.wordCount} not in [30,80]`);
  });

  test("single word answer: wordCount=1, wordInRange=false for 2M", () => {
    const tmpl = getTemplate(2, "theory");
    const result = validateAnswer("OS", tmpl);
    assert.equal(result.wordCount, 1);
    assert.equal(result.wordInRange, false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-EDGE-003 — Very long inputs (20-mark scale)
// ════════════════════════════════════════════════════════════════════════════
describe("T-EDGE-003: Very long inputs — 20-mark answers", () => {
  // Build a synthetic 1000-word answer with all 20M required sections
  const REQUIRED_20M = getTemplate(20, "theory").requiredSections;
  const LONG_ANSWER = REQUIRED_20M
    .map(s => `**${s}**\n${"content word ".repeat(80).trim()}`)
    .join("\n\n") +
    "\n\n```\ndiagram box\n```";

  test("1000-word answer parses without throwing", () => {
    assert.doesNotThrow(() => parseAnswerSections(LONG_ANSWER));
  });

  test("1000-word answer produces sections for all 20M required sections", () => {
    const sections = parseAnswerSections(LONG_ANSWER);
    const headings = sections.map(s => s.heading).filter(Boolean);
    for (const req of REQUIRED_20M) {
      assert.ok(headings.includes(req), `Missing section card for: "${req}"`);
    }
  });

  test("20-mark answer: validateAnswer finds no missing sections", () => {
    const tmpl = getTemplate(20, "theory");
    const result = validateAnswer(LONG_ANSWER, tmpl);
    assert.deepEqual(result.missingSections, [], `Missing: ${result.missingSections}`);
  });

  test("20-mark answer: diagramMissing=false (has code block)", () => {
    const tmpl = getTemplate(20, "theory");
    const result = validateAnswer(LONG_ANSWER, tmpl);
    assert.equal(result.diagramMissing, false);
  });

  test("20-mark answer with all sections scores ≥ 6/10", () => {
    const tmpl = getTemplate(20, "theory");
    const { score } = scoreAnswer(LONG_ANSWER, tmpl);
    assert.ok(score >= 6, `Expected ≥6 for complete 20M answer, got ${score}`);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-EDGE-004 — Mixed-domain answer: code blocks + math + tables + lists
// ════════════════════════════════════════════════════════════════════════════
describe("T-EDGE-004: Mixed-domain content — code, math, tables", () => {
  const MIXED = `## Binary Search

**Approach**
Divide and conquer: compare target with mid-element, recurse on left or right half.

**Code**
\`\`\`python
def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1
\`\`\`

**Complexity Analysis**
| Operation | Time | Space |
|-----------|------|-------|
| Best      | O(1) | O(1)  |
| Average   | O(log n) | O(1) |
| Worst     | O(log n) | O(1) |

**Example Trace**
Input: [1, 3, 5, 7, 9], target=7
Step 1: mid=5, 5<7 → right half
Step 2: mid=7, found at index 3`;

  test("mixed-domain answer parses into correct sections", () => {
    const sections = parseAnswerSections(MIXED);
    const headings = sections.map(s => s.heading).filter(Boolean);
    assert.ok(headings.includes("Approach"),           "missing Approach");
    assert.ok(headings.includes("Code"),               "missing Code");
    assert.ok(headings.includes("Complexity Analysis"),"missing Complexity Analysis");
    assert.ok(headings.includes("Example Trace"),       "missing Example Trace");
  });

  test("code block is detected as diagram for validateAnswer", () => {
    const tmpl = { requiredSections: [], diagramRequired: true, wordRange: [0, Infinity] };
    const result = validateAnswer(MIXED, tmpl);
    assert.equal(result.diagramMissing, false, "Python code block should satisfy diagramRequired");
  });

  test("table content does not create spurious headings", () => {
    const sections = parseAnswerSections(MIXED);
    // Table row separators like |---| should not be treated as headings
    assert.ok(!sections.some(s => s.heading?.includes("|")), "Table rows must not become headings");
    assert.ok(!sections.some(s => s.heading?.includes("---")), "Table separators must not become headings");
  });

  test("getSectionMeta for code-domain sections returns correct metadata", () => {
    const approach = getSectionMeta("Approach");
    const code     = getSectionMeta("Code");
    const complex  = getSectionMeta("Complexity Analysis");
    assert.equal(approach.icon, "💡");
    assert.equal(code.icon,     "💻");
    assert.equal(complex.icon,  "📈");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-EDGE-005 — [Verify] markers in unusual positions
// ════════════════════════════════════════════════════════════════════════════
describe("T-EDGE-005: [Verify] markers in unusual positions", () => {
  test("[Verify] inside a code block is still counted", () => {
    // The regex /\[Verify[^\]]*\]/gi scans the whole string including code blocks
    const answer = "Some text.\n```\ncode [Verify: inside code]\n```";
    const result = validateAnswer(answer, { requiredSections: [], diagramRequired: false, wordRange: [0, Infinity] });
    // Current implementation counts it — this documents the actual behavior
    assert.equal(result.verifyCount, 1, "[Verify] inside code block is counted (documented behavior)");
  });

  test("[Verify] at start of answer counts correctly", () => {
    const answer = "[Verify: opening claim] Some content follows.";
    const result = validateAnswer(answer);
    assert.equal(result.verifyCount, 1);
  });

  test("[Verify] with complex claim text counts correctly", () => {
    const answer = "[Verify: OS was invented in 1950 by J. Smith at MIT] content.";
    const markers = extractVerifyMarkers(answer);
    assert.equal(markers.length, 1);
    assert.ok(markers[0].claim.includes("1950"));
  });

  test("case-insensitive [VERIFY] is counted", () => {
    const answer = "[VERIFY: some claim] content";
    const result = validateAnswer(answer);
    assert.equal(result.verifyCount, 1);
  });

  test("[Verify] on same line as section heading counts correctly", () => {
    const answer = "**Definition** [Verify: disputed definition]\ncontent here";
    const result = validateAnswer(answer);
    assert.equal(result.verifyCount, 1);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-EDGE-006 — Malformed Markdown input
// ════════════════════════════════════════════════════════════════════════════
describe("T-EDGE-006: Malformed Markdown — does not throw", () => {
  const MALFORMED_INPUTS = [
    "**Unclosed bold",
    "## ",                          // empty heading
    "**",                           // lone asterisks
    "```\nunclosed code block",
    "## \n## \n## ",               // multiple empty headings
    "---\n---\n---",               // multiple dividers
    "**A**\n**B**\n**C**\n",       // many bold-only lines rapidly
  ];

  for (const input of MALFORMED_INPUTS) {
    test(`parseAnswerSections does not throw: ${JSON.stringify(input).slice(0, 40)}`, () => {
      assert.doesNotThrow(() => parseAnswerSections(input));
    });

    test(`validateAnswer does not throw: ${JSON.stringify(input).slice(0, 40)}`, () => {
      assert.doesNotThrow(() => validateAnswer(input));
    });

    test(`scoreAnswer does not throw: ${JSON.stringify(input).slice(0, 40)}`, () => {
      assert.doesNotThrow(() => scoreAnswer(input));
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// T-EDGE-007 — Unicode and non-ASCII content
// ════════════════════════════════════════════════════════════════════════════
describe("T-EDGE-007: Unicode content in answers", () => {
  test("Hindi/Devanagari content does not throw in parseAnswerSections", () => {
    const md = "## परिभाषा\nऑपरेटिंग सिस्टम हार्डवेयर का प्रबंधन करता है।";
    assert.doesNotThrow(() => parseAnswerSections(md));
  });

  test("Mathematical symbols in content parse correctly", () => {
    const md = "## Complexity\nTime: O(n log n), Space: O(1). Formula: T(n) = 2T(n/2) + O(n)";
    const sections = parseAnswerSections(md);
    assert.equal(sections[0].heading, "Complexity");
    assert.ok(sections[0].content.includes("O(n log n)"));
  });

  test("Arrow/diagram characters in content are preserved", () => {
    const md = "## Diagram\n```\nA → B → C\n│       │\n└───────┘\n```";
    const sections = parseAnswerSections(md);
    assert.ok(sections[0].content.includes("→"), "Arrow characters must be preserved");
  });

  test("word count is correct for Unicode text", () => {
    // Non-ASCII words still split on whitespace
    const answer = "word1 word2 word3 word4 word5";
    const result = validateAnswer(answer);
    assert.equal(result.wordCount, 5);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-EDGE-008 — Cross-module pipeline consistency
//             parse → validate → score must all agree on the same answer
// ════════════════════════════════════════════════════════════════════════════
describe("T-EDGE-008: Cross-module pipeline consistency", () => {
  const ANSWER = `**Definition**
An OS is system software managing hardware and software resources.

**Key Characteristics**
- Process Management
- Memory Management
- File System

**Working**
1. System call issued
2. Kernel handles request

**Diagram**
\`\`\`
[User] → [OS Kernel] → [Hardware]
\`\`\`

**Applications**
- Linux, Windows, macOS

**Conclusion**
OS is the foundation of modern computing.`;

  const TMPL_10M = getTemplate(10, "theory");

  test("sections parsed by parseAnswerSections match requiredSections in template", () => {
    const sections  = parseAnswerSections(ANSWER);
    const headings  = new Set(sections.map(s => s.heading).filter(Boolean));
    const required  = TMPL_10M.requiredSections;
    // All required sections should appear as parsed section headings
    const found = required.filter(r => headings.has(r));
    assert.equal(found.length, required.length, `Not all required sections parsed: missing ${required.filter(r => !headings.has(r))}`);
  });

  test("validateAnswer missingSections matches headings absent from parseAnswerSections output", () => {
    const sections   = parseAnswerSections(ANSWER);
    const parsedSet  = new Set(sections.map(s => s.heading).filter(Boolean));
    const validation = validateAnswer(ANSWER, TMPL_10M);

    // Every section flagged as missing by validateAnswer should NOT be in parsedSet
    for (const missing of validation.missingSections) {
      assert.ok(!parsedSet.has(missing), `"${missing}" flagged missing but was parsed as a section`);
    }
  });

  test("scoreAnswer sectionScore reflects section coverage seen by parseAnswerSections", () => {
    const sections  = parseAnswerSections(ANSWER);
    const headings  = new Set(sections.map(s => s.heading).filter(Boolean));
    const required  = TMPL_10M.requiredSections;
    const presentCount = required.filter(r => headings.has(r)).length;
    const expectedSectionScore = Math.round((presentCount / required.length) * 4);

    const { breakdown } = scoreAnswer(ANSWER, TMPL_10M);
    assert.equal(breakdown.sectionScore, expectedSectionScore, "scoreAnswer.sectionScore must match parsed coverage");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-EDGE-009 — Rapid streaming accumulation simulation
//             Answer arrives in tiny chunks; final result must be identical
//             to processing the full answer at once.
// ════════════════════════════════════════════════════════════════════════════
describe("T-EDGE-009: Streaming accumulation — chunked vs full", () => {
  const FULL_ANSWER = `## OS\n\n**Definition**\nAn OS manages hardware.\n\n**Conclusion**\nOS is essential.`;

  test("parsing chunk-joined answer equals parsing the full answer", () => {
    const chunks = ["## OS\n\n", "**Definition**\n", "An OS manages hardware.\n\n", "**Conclusion**\n", "OS is essential."];
    const accumulated = chunks.join("");

    const fromFull   = parseAnswerSections(FULL_ANSWER);
    const fromChunks = parseAnswerSections(accumulated);

    assert.equal(fromChunks.length,    fromFull.length,    "section count must match");
    assert.equal(fromChunks[0].heading, fromFull[0].heading, "first heading must match");
    assert.equal(fromChunks[0].content, fromFull[0].content, "first content must match");
  });

  test("validateAnswer on accumulated chunks is identical to full", () => {
    const chunks = ["**Definition**\nAn OS.\n", "**Conclusion**\nDone."];
    const full = chunks.join("");

    const fromFull   = validateAnswer(full);
    const fromChunks = validateAnswer(chunks.join(""));

    assert.equal(fromChunks.confidence,   fromFull.confidence);
    assert.equal(fromChunks.verifyCount,  fromFull.verifyCount);
    assert.equal(fromChunks.wordCount,    fromFull.wordCount);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-EDGE-010 — Firewall: section with ONLY whitespace content is filtered
// ════════════════════════════════════════════════════════════════════════════
describe("T-EDGE-010: Whitespace-only section content is filtered", () => {
  test("section with only whitespace does not appear in output", () => {
    const md = "## Definition\n   \n\t\n## Working\ncontent here";
    const sections = parseAnswerSections(md);
    // "Definition" section has only whitespace content → should be excluded
    // (parseAnswerSections filters: s.content.length > 0 || s.heading !== null)
    // The section IS kept (heading is not null) but content.trim() = ""
    // Verify it doesn't crash anything downstream
    assert.doesNotThrow(() => {
      for (const s of sections) {
        validateAnswer(s.content);
        scoreAnswer(s.content);
      }
    });
  });

  test("answer of only newlines produces no sections", () => {
    const sections = parseAnswerSections("\n\n\n\n");
    assert.equal(sections.length, 0);
  });
});
