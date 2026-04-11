/**
 * Unit tests — ConfidenceBadge: validateAnswer + scoreAnswer
 * qa-framework.md test suite: T-CBG-001 through T-CBG-018
 *
 * Covers:
 *   src/lib/postProcessor.js — validateAnswer, scoreAnswer, extractVerifyMarkers
 *
 * Run: node --test tests/unit/confidenceBadge.test.mjs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  validateAnswer,
  scoreAnswer,
  extractVerifyMarkers,
} from "../../src/lib/postProcessor.js";

// ── Fixtures ─────────────────────────────────────────────────────────────────

// Template metas matching src/lib/answerTemplates.js entries
const TEMPLATE_10M = {
  requiredSections: ["Definition", "Key Characteristics", "Working", "Diagram", "Applications", "Conclusion"],
  diagramRequired:  true,
  wordRange:        [350, 550],
};

const TEMPLATE_5M = {
  requiredSections: ["Key Points", "Applications", "Conclusion"],
  diagramRequired:  false,
  wordRange:        [120, 250],
};

const TEMPLATE_2M = {
  requiredSections: [],
  diagramRequired:  false,
  wordRange:        [30, 80],
};

// Realistic complete 10-mark answer (~400 words, all sections, diagram, no [Verify])
const COMPLETE_10M = `## Operating System

**Definition**
An Operating System (OS) is system software that manages computer hardware and software resources, providing common services for computer programs. It acts as an intermediary between users and the underlying hardware, abstracting low-level complexity from application developers.

**Introduction**
The OS abstracts hardware complexity and enables efficient resource sharing among multiple processes running concurrently on a single machine. Without an OS, each application would need to directly interface with hardware, making development impractical and systems insecure.

**Core Explanation**
The OS handles process scheduling using algorithms like Round Robin, Priority Scheduling, and Shortest Job First. Memory management uses paging and segmentation to isolate process address spaces and prevent unauthorised access between processes.

**Key Characteristics**
- Process Management: Controls the full process lifecycle from creation through scheduling to termination
- Memory Management: Allocates and deallocates memory using paging or segmentation with virtual address translation
- File System: Organises persistent data in hierarchical directory structures with access permissions
- Security: Enforces access control through privilege levels, user authentication, and sandboxing
- Device Management: Abstracts hardware diversity through standardised device driver interfaces

**Working**
1. User application issues a system call requesting a resource from the OS
2. CPU transitions from user mode to kernel mode via a software interrupt or trap instruction
3. OS kernel validates the request and checks permissions against the access-control list
4. Scheduler selects the next process from the ready queue using the configured scheduling algorithm
5. Memory manager allocates required physical frames and updates the page table for the requesting process

**Diagram**
\`\`\`
┌──────────────────────────────┐
│      User Applications        │
├──────────────────────────────┤
│    Operating System Kernel    │
│ ┌────────────┐ ┌───────────┐ │
│ │  Process   │ │  Memory   │ │
│ │  Manager   │ │  Manager  │ │
│ └────────────┘ └───────────┘ │
├──────────────────────────────┤
│           Hardware            │
└──────────────────────────────┘
\`\`\`

**Applications**
- **Linux**: Powers servers, embedded systems, cloud infrastructure, and all Android devices worldwide
- **Windows**: Dominates enterprise desktop and server deployments, used by over a billion devices
- **macOS**: Provides tight hardware-software integration optimised for the Apple ecosystem

**Advantages**
- Efficient resource utilisation through CPU scheduling and memory management algorithms
- Hardware abstraction simplifies cross-platform application development and device porting
- Security enforced through privilege separation, access-control lists, and process isolation

**Conclusion**
Operating Systems are the foundational layer of modern computing, enabling multi-user and multi-process environments that power everything from embedded IoT devices to large-scale distributed cloud servers. Their continued evolution drives advances in security, performance, and virtualisation across all computing domains.`;

// ════════════════════════════════════════════════════════════════════════════
// T-CBG-001 — Complete answer scores "high" confidence
// ════════════════════════════════════════════════════════════════════════════
describe("T-CBG-001: Complete 10-mark answer → high confidence", () => {
  test("confidence is 'high' for complete answer", () => {
    const result = validateAnswer(COMPLETE_10M, TEMPLATE_10M);
    assert.equal(result.confidence, "high", `Expected high, got ${result.confidence}`);
  });

  test("isComplete is true", () => {
    const result = validateAnswer(COMPLETE_10M, TEMPLATE_10M);
    assert.equal(result.isComplete, true);
  });

  test("no missing sections", () => {
    const result = validateAnswer(COMPLETE_10M, TEMPLATE_10M);
    assert.equal(result.missingSections.length, 0, `Unexpected missing: ${result.missingSections}`);
  });

  test("verifyCount is 0", () => {
    const result = validateAnswer(COMPLETE_10M, TEMPLATE_10M);
    assert.equal(result.verifyCount, 0);
  });

  test("diagramMissing is false", () => {
    const result = validateAnswer(COMPLETE_10M, TEMPLATE_10M);
    assert.equal(result.diagramMissing, false);
  });

  test("wordCount is within [350, 550]", () => {
    const result = validateAnswer(COMPLETE_10M, TEMPLATE_10M);
    assert.ok(result.wordInRange, `wordCount=${result.wordCount} should be in [350,550]`);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-CBG-002 — Missing 1 required section → medium confidence
// ════════════════════════════════════════════════════════════════════════════
describe("T-CBG-002: Missing 1 required section → medium confidence", () => {
  // Remove Conclusion section from the complete answer
  const withoutConclusion = COMPLETE_10M.replace(/\*\*Conclusion\*\*[\s\S]*$/, "");

  test("confidence is 'medium' when one section is missing", () => {
    const result = validateAnswer(withoutConclusion, TEMPLATE_10M);
    assert.equal(result.confidence, "medium");
  });

  test("missingSections contains 'Conclusion'", () => {
    const result = validateAnswer(withoutConclusion, TEMPLATE_10M);
    assert.ok(result.missingSections.includes("Conclusion"), `missingSections: ${result.missingSections}`);
  });

  test("isComplete is false when sections are missing", () => {
    const result = validateAnswer(withoutConclusion, TEMPLATE_10M);
    assert.equal(result.isComplete, false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-CBG-003 — Missing 2+ required sections → low confidence
// ════════════════════════════════════════════════════════════════════════════
describe("T-CBG-003: Missing 2+ required sections → low confidence", () => {
  const stub = `**Definition**\nAn OS manages hardware.\n\n**Introduction**\nThe OS is an intermediary between users and hardware.`;

  test("confidence is 'low' when 2+ sections missing", () => {
    const result = validateAnswer(stub, TEMPLATE_10M);
    assert.equal(result.confidence, "low");
  });

  test("missingSections.length >= 2", () => {
    const result = validateAnswer(stub, TEMPLATE_10M);
    assert.ok(result.missingSections.length >= 2, `Expected ≥2 missing, got ${result.missingSections.length}`);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-CBG-004 — [Verify] markers affect confidence
// ════════════════════════════════════════════════════════════════════════════
describe("T-CBG-004: [Verify] markers affect confidence level", () => {
  test("1 [Verify] marker → medium confidence", () => {
    const answer = COMPLETE_10M + "\n[Verify: OS was invented in 1950]";
    const result = validateAnswer(answer, TEMPLATE_10M);
    assert.equal(result.confidence, "medium");
    assert.equal(result.verifyCount, 1);
  });

  test("2 [Verify] markers → medium confidence", () => {
    const answer = COMPLETE_10M + "\n[Verify: claim 1] [Verify: claim 2]";
    const result = validateAnswer(answer, TEMPLATE_10M);
    assert.equal(result.confidence, "medium");
    assert.equal(result.verifyCount, 2);
  });

  test("3 [Verify] markers → low confidence", () => {
    const answer = COMPLETE_10M + "\n[Verify: c1] [Verify: c2] [Verify: c3]";
    const result = validateAnswer(answer, TEMPLATE_10M);
    assert.equal(result.confidence, "low");
    assert.equal(result.verifyCount, 3);
  });

  test("[Verify] count is accurate for 4 markers", () => {
    const answer = COMPLETE_10M + "\n[Verify: c1] [Verify: c2] [Verify: c3] [Verify: c4]";
    const result = validateAnswer(answer, TEMPLATE_10M);
    assert.equal(result.verifyCount, 4);
    assert.equal(result.confidence, "low");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-CBG-005 — Diagram detection
// ════════════════════════════════════════════════════════════════════════════
describe("T-CBG-005: Diagram presence detection", () => {
  test("answer with ``` block: diagramMissing=false", () => {
    const result = validateAnswer(COMPLETE_10M, TEMPLATE_10M);
    assert.equal(result.diagramMissing, false);
  });

  test("answer without ``` block + diagramRequired=true: diagramMissing=true", () => {
    const noDiagram = COMPLETE_10M.replace(/```[\s\S]*?```/g, "");
    const result = validateAnswer(noDiagram, TEMPLATE_10M);
    assert.equal(result.diagramMissing, true);
  });

  test("missing diagram alone pushes confidence to 'low'", () => {
    const noDiagram = COMPLETE_10M.replace(/```[\s\S]*?```/g, "");
    const result = validateAnswer(noDiagram, TEMPLATE_10M);
    assert.equal(result.confidence, "low");
  });

  test("no diagram when diagramRequired=false: diagramMissing=false", () => {
    const shortAnswer = "**Key Points**\n- Point 1\n\n**Applications**\n- App 1\n\n**Conclusion**\nDone.";
    const result = validateAnswer(shortAnswer, TEMPLATE_5M);
    assert.equal(result.diagramMissing, false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-CBG-006 — Word count validation
// ════════════════════════════════════════════════════════════════════════════
describe("T-CBG-006: Word count range", () => {
  const makeWords = (n) => "word ".repeat(n).trim();

  test("word count exactly at min → wordInRange=true", () => {
    const answer = makeWords(350) + " **Definition**\n## End";
    const result = validateAnswer(answer, TEMPLATE_10M);
    assert.equal(result.wordInRange, true);
  });

  test("word count exactly at max → wordInRange=true", () => {
    const answer = makeWords(550); // exactly 550, no extra tokens
    const result = validateAnswer(answer, TEMPLATE_10M);
    assert.equal(result.wordInRange, true);
  });

  test("word count below min → wordInRange=false", () => {
    const result = validateAnswer("Too short.", TEMPLATE_10M);
    assert.equal(result.wordInRange, false);
  });

  test("word count above max → wordInRange=false", () => {
    const answer = makeWords(700);
    const result = validateAnswer(answer, TEMPLATE_10M);
    assert.equal(result.wordInRange, false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-CBG-007 — scoreAnswer: section scoring (0–4)
// ════════════════════════════════════════════════════════════════════════════
describe("T-CBG-007: scoreAnswer — section scoring (0–4)", () => {
  test("all 6 required sections present → sectionScore=4", () => {
    const { breakdown } = scoreAnswer(COMPLETE_10M, TEMPLATE_10M);
    assert.equal(breakdown.sectionScore, 4);
  });

  test("no required sections → sectionScore=4 (default)", () => {
    const { breakdown } = scoreAnswer("Some answer text here.", TEMPLATE_2M);
    assert.equal(breakdown.sectionScore, 4);
  });

  test("0 out of 6 sections present → sectionScore=0", () => {
    const { breakdown } = scoreAnswer("No headings at all here.", TEMPLATE_10M);
    assert.equal(breakdown.sectionScore, 0);
  });

  test("3 out of 6 sections → sectionScore=2", () => {
    const halfAnswer = `**Definition**\nAn OS.\n\n**Applications**\n- Linux.\n\n**Conclusion**\nDone.`;
    const { breakdown } = scoreAnswer(halfAnswer, TEMPLATE_10M);
    assert.equal(breakdown.sectionScore, 2);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-CBG-008 — scoreAnswer: diagram scoring (0–2)
// ════════════════════════════════════════════════════════════════════════════
describe("T-CBG-008: scoreAnswer — diagram scoring (0–2)", () => {
  test("diagram present, not required → diagramScore=2", () => {
    const answer = "Some text.\n```\nbox\n```";
    const { breakdown } = scoreAnswer(answer, TEMPLATE_2M);
    assert.equal(breakdown.diagramScore, 2);
  });

  test("diagram required and present → diagramScore=2", () => {
    const { breakdown } = scoreAnswer(COMPLETE_10M, TEMPLATE_10M);
    assert.equal(breakdown.diagramScore, 2);
  });

  test("diagram required but missing → diagramScore=0", () => {
    const noDiagram = COMPLETE_10M.replace(/```[\s\S]*?```/g, "");
    const { breakdown } = scoreAnswer(noDiagram, TEMPLATE_10M);
    assert.equal(breakdown.diagramScore, 0);
  });

  test("diagram not required, not present → diagramScore=2", () => {
    const { breakdown } = scoreAnswer("**Key Points**\n- point\n\n**Conclusion**\nDone.", TEMPLATE_5M);
    assert.equal(breakdown.diagramScore, 2);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-CBG-009 — scoreAnswer: word count scoring (0–2)
// ════════════════════════════════════════════════════════════════════════════
describe("T-CBG-009: scoreAnswer — word count scoring (0–2)", () => {
  const makeWords = (n) => "word ".repeat(n).trim();

  test("word count in range → wordScore=2", () => {
    const { breakdown } = scoreAnswer(COMPLETE_10M, TEMPLATE_10M);
    assert.equal(breakdown.wordScore, 2);
  });

  test("word count within 20% below min (range [350,550], 280 words) → wordScore=1", () => {
    // 20% below 350 = 280 (350 * 0.8 = 280)
    const { breakdown } = scoreAnswer(makeWords(280), TEMPLATE_10M);
    assert.equal(breakdown.wordScore, 1);
  });

  test("word count below 80% of min → wordScore=0", () => {
    // Below 280 for range [350,550]
    const { breakdown } = scoreAnswer(makeWords(100), TEMPLATE_10M);
    assert.equal(breakdown.wordScore, 0);
  });

  test("word count within 20% above max (range [350,550], 660 words) → wordScore=1", () => {
    // 20% above 550 = 660 (550 * 1.2 = 660)
    const { breakdown } = scoreAnswer(makeWords(660), TEMPLATE_10M);
    assert.equal(breakdown.wordScore, 1);
  });

  test("word count above 120% of max → wordScore=0", () => {
    const { breakdown } = scoreAnswer(makeWords(900), TEMPLATE_10M);
    assert.equal(breakdown.wordScore, 0);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-CBG-010 — scoreAnswer: accuracy scoring (0–2)
// ════════════════════════════════════════════════════════════════════════════
describe("T-CBG-010: scoreAnswer — accuracy scoring (0–2)", () => {
  test("0 [Verify] markers → accuracyScore=2", () => {
    const { breakdown } = scoreAnswer(COMPLETE_10M, TEMPLATE_10M);
    assert.equal(breakdown.accuracyScore, 2);
  });

  test("1 [Verify] marker → accuracyScore=1", () => {
    const answer = COMPLETE_10M + "\n[Verify: some claim]";
    const { breakdown } = scoreAnswer(answer, TEMPLATE_10M);
    assert.equal(breakdown.accuracyScore, 1);
  });

  test("2 [Verify] markers → accuracyScore=0", () => {
    const answer = COMPLETE_10M + "\n[Verify: c1] [Verify: c2]";
    const { breakdown } = scoreAnswer(answer, TEMPLATE_10M);
    assert.equal(breakdown.accuracyScore, 0);
  });

  test("3+ [Verify] markers → accuracyScore=0 (clamped, not negative)", () => {
    const answer = COMPLETE_10M + "\n[Verify: c1] [Verify: c2] [Verify: c3] [Verify: c4]";
    const { breakdown } = scoreAnswer(answer, TEMPLATE_10M);
    assert.equal(breakdown.accuracyScore, 0);
    assert.ok(breakdown.accuracyScore >= 0, "accuracyScore must not be negative");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-CBG-011 — scoreAnswer: total score clamped 0–10
// ════════════════════════════════════════════════════════════════════════════
describe("T-CBG-011: scoreAnswer — total score bounds", () => {
  test("complete 10-mark answer scores ≥ 8/10", () => {
    const { score } = scoreAnswer(COMPLETE_10M, TEMPLATE_10M);
    assert.ok(score >= 8, `Expected ≥8, got ${score}`);
  });

  test("score never exceeds 10", () => {
    const { score } = scoreAnswer(COMPLETE_10M, TEMPLATE_10M);
    assert.ok(score <= 10, `Score ${score} exceeds maximum of 10`);
  });

  test("score never goes below 0", () => {
    const { score } = scoreAnswer("", TEMPLATE_10M);
    assert.ok(score >= 0, `Score ${score} is negative`);
  });

  test("empty answer scores 0 — no content means no score", () => {
    const { score, breakdown } = scoreAnswer("", TEMPLATE_10M);
    assert.equal(score, 0, "empty answer must score exactly 0");
    assert.equal(breakdown.sectionScore,  0);
    assert.equal(breakdown.diagramScore,  0);
    assert.equal(breakdown.wordScore,     0);
    assert.equal(breakdown.accuracyScore, 0);
  });

  test("score is an integer", () => {
    const { score } = scoreAnswer(COMPLETE_10M, TEMPLATE_10M);
    assert.equal(score, Math.round(score), "score should be an integer (rounded)");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-CBG-012 — extractVerifyMarkers returns correct claim objects
// ════════════════════════════════════════════════════════════════════════════
describe("T-CBG-012: extractVerifyMarkers", () => {
  test("extracts single marker with claim", () => {
    const answer = "Some text. [Verify: OS was invented in 1940] More text.";
    const markers = extractVerifyMarkers(answer);
    assert.equal(markers.length, 1);
    assert.equal(markers[0].claim, "OS was invented in 1940");
  });

  test("extracts multiple markers", () => {
    const answer = "[Verify: claim one] text [Verify: claim two]";
    const markers = extractVerifyMarkers(answer);
    assert.equal(markers.length, 2);
    assert.equal(markers[0].claim, "claim one");
    assert.equal(markers[1].claim, "claim two");
  });

  test("returns empty array when no markers", () => {
    const markers = extractVerifyMarkers("Clean answer with no verify markers.");
    assert.deepEqual(markers, []);
  });

  test("marker object has both marker and claim fields", () => {
    const markers = extractVerifyMarkers("[Verify: test claim]");
    assert.ok("marker" in markers[0], "missing 'marker' field");
    assert.ok("claim"  in markers[0], "missing 'claim' field");
    assert.equal(markers[0].marker, "[Verify: test claim]");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-CBG-013 — validateAnswer with no templateMeta (bare call)
// ════════════════════════════════════════════════════════════════════════════
describe("T-CBG-013: validateAnswer — defaults when templateMeta omitted", () => {
  test("does not throw with no templateMeta argument", () => {
    assert.doesNotThrow(() => validateAnswer("Some answer text here."));
  });

  test("defaults: missingSections=[], diagramMissing=false", () => {
    const result = validateAnswer("Some answer text here.");
    assert.deepEqual(result.missingSections, []);
    assert.equal(result.diagramMissing, false);
  });

  test("defaults: wordInRange=true (range [0, Infinity])", () => {
    const result = validateAnswer("Any length answer is fine.");
    assert.equal(result.wordInRange, true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-CBG-014 — Section matching: ## heading, **heading**, **heading:**
// ════════════════════════════════════════════════════════════════════════════
describe("T-CBG-014: Required section matching — all heading formats", () => {
  const template = {
    requiredSections: ["Definition"],
    diagramRequired:  false,
    wordRange:        [0, Infinity],
  };

  test("## Definition matches 'Definition' requirement", () => {
    const result = validateAnswer("## Definition\nAn OS is system software.", template);
    assert.equal(result.missingSections.length, 0);
  });

  test("**Definition** matches 'Definition' requirement", () => {
    const result = validateAnswer("**Definition**\nAn OS is system software.", template);
    assert.equal(result.missingSections.length, 0);
  });

  test("**Definition:** matches 'Definition' requirement", () => {
    const result = validateAnswer("**Definition:** An OS is system software.", template);
    assert.equal(result.missingSections.length, 0);
  });

  test("Section matching is case-insensitive", () => {
    const result = validateAnswer("## definition\nAn OS is system software.", template);
    assert.equal(result.missingSections.length, 0, "case-insensitive match must work");
  });
});
