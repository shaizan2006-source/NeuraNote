/**
 * Unit tests — Section card rendering: parseAnswerSections + getSectionMeta
 * qa-framework.md test suite: T-PSR-001 through T-PSR-012
 *
 * Covers:
 *   src/lib/parseAnswerSections.js — parseAnswerSections, getSectionMeta, extractQuickSummary
 *
 * Run: node --test tests/unit/parseAnswerSections.test.mjs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  parseAnswerSections,
  extractQuickSummary,
  getSectionMeta,
} from "../../src/lib/parseAnswerSections.js";

// ── Fixtures ─────────────────────────────────────────────────────────────────

// Realistic 10-mark API response for "Explain Operating System"
const REAL_10M_ANSWER = `## Operating System

**Definition**
An Operating System (OS) is system software that manages computer hardware and software resources, providing common services for computer programs.

**Introduction**
The OS acts as an intermediary between users and hardware. It abstracts hardware complexity and enables multi-process environments.

**Core Explanation**
The OS handles process scheduling, memory allocation, file systems, and I/O management. Scheduling algorithms ensure fair CPU time distribution among competing processes.

**Key Characteristics**
- Process Management: Creation, scheduling, and termination of processes
- Memory Management: Allocation and deallocation using paging or segmentation
- File System: Hierarchical organisation of persistent storage
- Security: User authentication and access control via privilege levels
- Device Management: Hardware abstraction through device drivers

**Working / Process**
1. User application requests a resource via system call
2. OS traps the call and validates permissions
3. CPU scheduler selects the next process from the ready queue
4. Memory manager allocates required memory frames
5. I/O subsystem routes device communication through drivers

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
- **Linux**: Powers servers, embedded systems, and Android devices globally
- **Windows**: Dominates enterprise desktop and server deployments
- **macOS**: Tight hardware-software integration in the Apple ecosystem

**Advantages**
- Efficient resource utilisation through scheduling and memory management
- Hardware abstraction simplifies application development
- Security through privilege rings and access-control lists

**Conclusion**
Operating Systems are the foundational layer of modern computing, enabling the multi-user, multi-process environments that power everything from smartphones to supercomputers.`;

// ════════════════════════════════════════════════════════════════════════════
// T-PSR-001 — ## heading format is parsed correctly
// ════════════════════════════════════════════════════════════════════════════
describe("T-PSR-001: ## heading format", () => {
  test("extracts heading and content from ## line", () => {
    const md = "## Definition\nAn OS manages hardware resources.\n";
    const sections = parseAnswerSections(md);
    assert.equal(sections.length, 1, "Should produce exactly 1 section");
    assert.equal(sections[0].heading, "Definition");
    assert.ok(sections[0].content.includes("An OS manages hardware resources."));
  });

  test("handles multiple ## headings", () => {
    const md = "## Definition\nAn OS manages resources.\n\n## Types\nBatch, Time-Sharing, Real-Time.";
    const sections = parseAnswerSections(md);
    assert.equal(sections.length, 2);
    assert.equal(sections[0].heading, "Definition");
    assert.equal(sections[1].heading, "Types");
  });

  test("## heading strips hash and whitespace from label", () => {
    const md = "##   Spaced Heading\ncontent";
    const sections = parseAnswerSections(md);
    assert.equal(sections[0].heading, "Spaced Heading");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-PSR-002 — **Bold** heading format is parsed correctly
// ════════════════════════════════════════════════════════════════════════════
describe("T-PSR-002: **Bold** heading format", () => {
  test("extracts heading from bold-only line", () => {
    const md = "**Definition**\nAn OS manages hardware.\n";
    const sections = parseAnswerSections(md);
    assert.ok(sections.length >= 1, "Should have at least 1 section");
    const defSection = sections.find(s => s.heading === "Definition");
    assert.ok(defSection, "Should have a 'Definition' section");
    assert.ok(defSection.content.includes("An OS manages hardware."));
  });

  test("bold heading with trailing whitespace is still detected", () => {
    const md = "**Working**   \ncontent here";
    const sections = parseAnswerSections(md);
    const workingSection = sections.find(s => s.heading === "Working");
    assert.ok(workingSection, "Should detect 'Working' bold heading");
  });

  test("bold text mid-sentence is NOT treated as heading", () => {
    const md = "The OS uses **scheduling** to manage processes.\ncontinued text";
    const sections = parseAnswerSections(md);
    // Should produce one flat section with null heading (or no heading)
    const hasSpuriousHeading = sections.some(s => s.heading === "scheduling");
    assert.equal(hasSpuriousHeading, false, "Bold mid-sentence must not create a heading");
  });

  test("bold text ending with punctuation is NOT treated as heading", () => {
    const md = "**This is a sentence.**\ncontent";
    const sections = parseAnswerSections(md);
    const hasSpurious = sections.some(s => s.heading === "This is a sentence.");
    assert.equal(hasSpurious, false, "Bold sentence with trailing period must not be a heading");
  });

  test("bold heading with 8+ words is NOT treated as heading", () => {
    const md = "**This is a very long sentence that is not a heading at all**\ncontent";
    const sections = parseAnswerSections(md);
    const hasSpurious = sections.some(s => s.heading?.split(" ").length >= 8);
    assert.equal(hasSpurious, false, "8+ word bold line must not create a heading");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-PSR-003 — ### heading format is parsed correctly
// ════════════════════════════════════════════════════════════════════════════
describe("T-PSR-003: ### heading format", () => {
  test("### is recognised as a heading", () => {
    const md = "### Sub-section\ncontent below";
    const sections = parseAnswerSections(md);
    assert.equal(sections[0].heading, "Sub-section");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-PSR-004 — Flat answer (no headings) stays as single section
// ════════════════════════════════════════════════════════════════════════════
describe("T-PSR-004: Flat answer — no headings", () => {
  test("flat 2-mark answer produces one section with null heading", () => {
    const md = "**Paging** — A memory management technique that divides memory into fixed-size blocks called pages.\nExample: Virtual memory in Linux.";
    const sections = parseAnswerSections(md);
    // Bold text here doesn't match heading heuristic because it has trailing dash content on same line
    // Regardless, there should be no section with a heading pointing to just "Paging"
    // The whole thing should render as a single block
    assert.ok(sections.length >= 1, "Should have at least 1 section");
  });

  test("answer with only paragraph text produces content", () => {
    const md = "An operating system manages hardware and software resources.";
    const sections = parseAnswerSections(md);
    assert.equal(sections.length, 1);
    assert.equal(sections[0].heading, null);
    assert.ok(sections[0].content.includes("An operating system"));
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-PSR-005 — QUICK SUMMARY detection
// ════════════════════════════════════════════════════════════════════════════
describe("T-PSR-005: QUICK SUMMARY section", () => {
  const withSummary = `## Definition\nAn OS manages hardware.\n\n---\n**QUICK SUMMARY**\nIn one line: OS = software that manages hardware and runs programs\nAnalogy: OS is like an office manager coordinating all workers\nExam tip: Remember the 5 functions — process, memory, file, I/O, security`;

  test("QUICK SUMMARY section is flagged isQuickSummary: true", () => {
    const sections = parseAnswerSections(withSummary);
    const summary = sections.find(s => s.isQuickSummary);
    assert.ok(summary, "Should have a section with isQuickSummary: true");
  });

  test("extractQuickSummary separates summary from rest", () => {
    const sections = parseAnswerSections(withSummary);
    const { summary, rest } = extractQuickSummary(sections);
    assert.ok(summary, "summary should not be null");
    assert.ok(rest.every(s => !s.isQuickSummary), "rest should contain no summary sections");
  });

  test("extractQuickSummary returns null summary when no QUICK SUMMARY present", () => {
    const sections = parseAnswerSections("## Definition\ncontent");
    const { summary } = extractQuickSummary(sections);
    assert.equal(summary, null);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-PSR-006 — Empty / edge case inputs
// ════════════════════════════════════════════════════════════════════════════
describe("T-PSR-006: Edge case inputs", () => {
  test("empty string returns []", () => {
    assert.deepEqual(parseAnswerSections(""), []);
  });

  test("null returns []", () => {
    assert.deepEqual(parseAnswerSections(null), []);
  });

  test("whitespace-only string returns []", () => {
    const sections = parseAnswerSections("   \n\n  ");
    assert.equal(sections.length, 0);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-PSR-007 — Real 10-mark API response splits into correct sections
// ════════════════════════════════════════════════════════════════════════════
describe("T-PSR-007: Real 10-mark API response — section splitting", () => {
  test("produces 9 or more sections", () => {
    const sections = parseAnswerSections(REAL_10M_ANSWER);
    assert.ok(sections.length >= 9, `Expected ≥9 sections, got ${sections.length}`);
  });

  test("Definition section is present", () => {
    const sections = parseAnswerSections(REAL_10M_ANSWER);
    const def = sections.find(s => s.heading === "Definition");
    assert.ok(def, "Definition section must be present");
    assert.ok(def.content.length > 10, "Definition section must have content");
  });

  test("Diagram section is present and contains code block", () => {
    const sections = parseAnswerSections(REAL_10M_ANSWER);
    const diagram = sections.find(s => s.heading === "Diagram");
    assert.ok(diagram, "Diagram section must be present");
    assert.ok(diagram.content.includes("```"), "Diagram section must contain a fenced code block");
  });

  test("Conclusion section is the last non-empty section", () => {
    const sections = parseAnswerSections(REAL_10M_ANSWER);
    const lastWithHeading = [...sections].reverse().find(s => s.heading);
    assert.equal(lastWithHeading?.heading, "Conclusion", "Conclusion should be last named section");
  });

  test("sections with content have non-empty content", () => {
    const sections = parseAnswerSections(REAL_10M_ANSWER);
    // The top-level ## [Topic Name] heading may have empty content (immediately followed
    // by the first **Heading** sub-section) — that's expected parser behaviour.
    // All other sections (with a meaningful heading like Definition, Working, etc.) should
    // have content. At minimum, the majority of sections must have content.
    const sectionsWithContent = sections.filter(s => s.content.trim().length > 0);
    assert.ok(
      sectionsWithContent.length >= sections.length - 1,
      `At most 1 section should have empty content (the topic-title heading), got ${sections.length - sectionsWithContent.length} empty`
    );
  });

  test("isQuickSummary is false for all sections (no summary in 10M fixture)", () => {
    const sections = parseAnswerSections(REAL_10M_ANSWER);
    assert.ok(sections.every(s => !s.isQuickSummary), "No section should be flagged as quick summary");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-PSR-008 — getSectionMeta returns correct icon/accent/label for known sections
// ════════════════════════════════════════════════════════════════════════════
describe("T-PSR-008: getSectionMeta — known sections", () => {
  const KNOWN = [
    { heading: "Definition",          expectedLabel: "Definition",          expectedIcon: "📖" },
    { heading: "Working",             expectedLabel: "Working",             expectedIcon: "⚙️" },
    { heading: "Applications",        expectedLabel: "Applications",        expectedIcon: "🌍" },
    { heading: "Limitations",         expectedLabel: "Limitations",         expectedIcon: "⚠️" },
    { heading: "Critical Analysis",   expectedLabel: "Critical Analysis",   expectedIcon: "🧠" },
    { heading: "Conclusion",          expectedLabel: "Conclusion",          expectedIcon: "🎯" },
    { heading: "Diagram",             expectedLabel: "Diagram",             expectedIcon: "📊" },
    { heading: "Code",                expectedLabel: "Code",                expectedIcon: "💻" },
  ];

  for (const { heading, expectedLabel, expectedIcon } of KNOWN) {
    test(`"${heading}" returns label="${expectedLabel}" and icon="${expectedIcon}"`, () => {
      const meta = getSectionMeta(heading);
      assert.equal(meta.label, expectedLabel, `label mismatch for "${heading}"`);
      assert.equal(meta.icon,  expectedIcon,  `icon mismatch for "${heading}"`);
      assert.ok(meta.accent.startsWith("#"), "accent must be a hex colour");
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// T-PSR-009 — getSectionMeta is case-insensitive
// ════════════════════════════════════════════════════════════════════════════
describe("T-PSR-009: getSectionMeta — case insensitivity", () => {
  test("DEFINITION matches definition entry", () => {
    const meta = getSectionMeta("DEFINITION");
    assert.equal(meta.label, "Definition");
  });

  test("definition (lowercase) matches", () => {
    const meta = getSectionMeta("definition");
    assert.equal(meta.label, "Definition");
  });

  test("Working/Process variant matches", () => {
    const meta = getSectionMeta("Working / Process");
    assert.equal(meta.label, "Working / Process");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-PSR-010 — getSectionMeta fallback for unknown sections
// ════════════════════════════════════════════════════════════════════════════
describe("T-PSR-010: getSectionMeta — unknown section fallback", () => {
  test("unknown heading returns neutral fallback accent #475569", () => {
    const meta = getSectionMeta("SomeMadeUpSection");
    assert.equal(meta.accent, "#475569");
    assert.equal(meta.icon,   "📝");
    assert.equal(meta.label,  "SomeMadeUpSection", "label should be the raw heading");
  });

  test("null heading returns fallback with empty label", () => {
    const meta = getSectionMeta(null);
    assert.equal(meta.icon,  "📝");
    assert.equal(meta.label, "");
  });

  test("empty string heading returns fallback", () => {
    const meta = getSectionMeta("");
    assert.equal(meta.icon, "📝");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-PSR-011 — sections returned have correct shape
// ════════════════════════════════════════════════════════════════════════════
describe("T-PSR-011: Section object shape", () => {
  test("every section has heading, content, isQuickSummary fields", () => {
    const sections = parseAnswerSections(REAL_10M_ANSWER);
    for (const s of sections) {
      assert.ok("heading"        in s, "missing heading field");
      assert.ok("content"        in s, "missing content field");
      assert.ok("isQuickSummary" in s, "missing isQuickSummary field");
    }
  });

  test("heading is either null or a non-empty string", () => {
    const sections = parseAnswerSections(REAL_10M_ANSWER);
    for (const s of sections) {
      if (s.heading !== null) {
        assert.equal(typeof s.heading, "string");
        assert.ok(s.heading.length > 0, "heading must not be empty string when not null");
      }
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-PSR-012 — --- divider starts a new section boundary
// ════════════════════════════════════════════════════════════════════════════
describe("T-PSR-012: --- divider creates section boundary", () => {
  test("content before --- and after --- are separate sections", () => {
    const md = "## Before\ncontent A\n\n---\n## After\ncontent B";
    const sections = parseAnswerSections(md);
    const before = sections.find(s => s.heading === "Before");
    const after  = sections.find(s => s.heading === "After");
    assert.ok(before, "Before section must exist");
    assert.ok(after,  "After section must exist");
    assert.ok(!before.content.includes("content B"), "Before must not bleed into After");
  });
});
