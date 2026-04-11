// ──────────────────────────────────────────────────────────────
// Answer Structure Templates — mark-level × question type
// ──────────────────────────────────────────────────────────────

const PROBLEM_TEMPLATE = `Answer in EXACTLY this format:

**Question:** [Restate the question clearly — fix any typos]

**Given:**
[All known values with SI units, one per line]

**Required:**
[What to find/prove — stated precisely]

**Solution:**

Step 1: [What operation/formula is being applied]
[Formula]
= [Substitution]
= [Result with units]

Step 2: [Next operation]
[Working...]
= [Result with units]

[Continue until fully solved]

**Answer:** **[Final result — bold — with correct units]**

**Verification / Check:**
[Dimensional check OR substitute answer back OR sanity check]`;

const DERIVATION_TEMPLATE = `Answer in EXACTLY this format:

**To Prove / Derive:** [Restate what must be shown]

**Proof Method:** [Direct / By contradiction / Mathematical induction / From first principles]

**Starting Point:** [The axiom, law, or standard result being used]

**Derivation:**

Step 1: [Operation performed — label it]
[Mathematical expression]
⇒ [Result]

Step 2: [Operation performed]
[Expression]
⇒ [Result]

[Continue until result is derived]

∴ **[Final derived result — bold]** — Hence proved.`;

const CODE_TEMPLATE = `Answer in EXACTLY this format:

## [Problem Name]

**Problem Statement:** [Restate clearly]

**Approach:** [2–3 lines explaining the algorithm/strategy chosen and why]

**Code:**
\`\`\`[language]
[Clean, well-indented code with comments only for non-obvious logic]
\`\`\`

**Explanation:**
[Block-by-block or function-by-function explanation of key parts]

**Complexity Analysis:**
- Time Complexity: O(?) — [1-line derivation / justification]
- Space Complexity: O(?) — [1-line justification]

**Example Trace:**
Input: [sample input]
[Step-by-step trace showing intermediate values]
Output: [expected result]`;

const COMPARISON_TEMPLATE = `Answer in EXACTLY this format:

## [Topic A] vs [Topic B]

**Introduction**
[2–3 lines: what is being compared and why the distinction matters academically]

**Comparison Table**

| S.No. | Parameter | [Topic A] | [Topic B] |
|-------|-----------|-----------|-----------|
| 1 | Definition | [concise def, ≤12 words] | [concise def, ≤12 words] |
| 2 | [Criterion] | [...] | [...] |
| 3 | [Criterion] | [...] | [...] |
| 4 | [Criterion] | [...] | [...] |
| 5 | [Criterion] | [...] | [...] |
| 6 | Use Case / Application | [...] | [...] |

TABLE RULES (mandatory):
- The first column MUST be "S.No." numbered 1, 2, 3...
- Header row MUST be followed immediately by the separator row "|---|---|...|" with the SAME number of columns
- Every row MUST have the SAME number of pipe-separated cells as the header — never leave a cell empty (use "—" if no data)
- Keep each cell short and exam-ready — no line breaks or HTML inside cells
- Minimum 5 data rows for any comparison; maximum 10

**Key Differences (Elaborated)**
- [Most important difference — 2 lines explaining it]
- [Second key difference — 2 lines]
- [Third key difference — 2 lines]

**When to Use Each**
[2–3 lines of practical guidance on choosing between them]

**Conclusion**
[1–2 lines synthesis]`;

const DIAGRAM_TEMPLATE = `Answer in EXACTLY this format:

## [Topic] — Diagram

**Overview:** [2–3 lines explaining what the diagram represents]

**Diagram:**
\`\`\`
[ASCII/text-based diagram using: → ← ↑ ↓ │ ─ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼ ═ ║]
[Label every component clearly]
[Show direction of flow / relationships]
\`\`\`

**Component Descriptions:**
- **[Component 1]:** [what it is / what it does]
- **[Component 2]:** [description]
- **[Component 3]:** [description]
[Continue for all labeled components]

**Working Principle:**
[2–3 lines explaining the flow/process shown in the diagram]`;

// ── Mark-level templates ─────────────────────────────────────

const TEMPLATES = {
  2: {
    theory: `Answer in EXACTLY this format (NO headings, NO bullets):
Line 1: **[Term]** — [1-sentence precise definition including the key technical term].
Line 2: [1 concrete example or application — name a real system or use case, 1 sentence].

Maximum: 70 words total. Do NOT add any heading, introduction, or conclusion.`,

    definition: `Answer in EXACTLY this format:
**[Term]** — [precise definition in 1–2 sentences. Include: what it is, its key property, domain].

Maximum: 50 words. No headings. No bullets.`,

    problem:    PROBLEM_TEMPLATE,
    derivation: DERIVATION_TEMPLATE,
    code:       CODE_TEMPLATE,
    comparison: COMPARISON_TEMPLATE,
    diagram:    DIAGRAM_TEMPLATE,

    wordRange:        [30, 80],
    maxTokens:        350,
    requiredSections: [],
    diagramRequired:  false,
  },

  5: {
    theory: `Answer with EXACTLY these sections in this order:

**[Topic Name]**

[1–2 line definition — precise, includes key technical terms]

**Key Points**
- [Point 1 — 1 line, substantive — include technical detail]
- [Point 2 — 1 line, substantive]
- [Point 3 — 1 line, substantive]
- [Point 4 — optional, only if it adds distinct value]

**Applications**
- [Real system or example 1] — [1-line explanation of HOW it applies, not just name-dropping]
- [Real system or example 2] — [1-line explanation]

**Conclusion**
[1 sentence — synthesis or significance]

Target: 150–200 words. No diagram. Each bullet = one distinct idea.`,

    problem:    PROBLEM_TEMPLATE,
    derivation: DERIVATION_TEMPLATE,
    code:       CODE_TEMPLATE,
    comparison: COMPARISON_TEMPLATE,
    diagram:    DIAGRAM_TEMPLATE,

    wordRange:        [120, 250],
    maxTokens:        900,
    requiredSections: ['Key Points', 'Applications', 'Conclusion'],
    diagramRequired:  false,
  },

  10: {
    theory: `Answer with EXACTLY these sections in this order:

## [Topic Name]

**Definition**
[2–3 line formal definition — precise, with key terms bold]

**Introduction**
[2–3 lines: context — why this topic matters, where it fits in the broader subject]

**Core Explanation**
[3–5 lines: fundamental concept, mechanism, or theory explained clearly and technically]

**Key Characteristics**
- [Characteristic 1 — 1 line with technical detail]
- [Characteristic 2]
- [Characteristic 3]
- [Characteristic 4]
- [Characteristic 5]

**Working / Process**
1. [Step — what happens and why, 1 line]
2. [Step]
3. [Step]
4. [Step]
5. [Step]

**Diagram**
\`\`\`
[Text-based diagram — boxes, arrows, labels — MUST show actual relationships/flow]
[Every component labeled. No decorative filler.]
\`\`\`

**Applications**
- **[Real System 1]** — [1-line explanation of HOW this concept is used here]
- **[Real System 2]** — [explanation]
- **[Real System 3]** — [explanation]

**Advantages**
- [Advantage 1 — 1 line]
- [Advantage 2]
- [Advantage 3]

**Conclusion**
[2 lines: summarize significance + forward relevance or trend]

Target: 400–500 words. Diagram is MANDATORY.
Every section adds NEW information — no repetition across sections.`,

    problem:    PROBLEM_TEMPLATE,
    derivation: DERIVATION_TEMPLATE,
    code:       CODE_TEMPLATE,
    comparison: COMPARISON_TEMPLATE,
    diagram:    DIAGRAM_TEMPLATE,

    wordRange:        [350, 550],
    maxTokens:        2200,
    requiredSections: ['Definition', 'Key Characteristics', 'Working', 'Diagram', 'Applications', 'Conclusion'],
    diagramRequired:  true,
  },

  15: {
    theory: `Answer with EXACTLY these sections in this order:

## [Topic Name]

**Definition**
[3-line comprehensive definition covering all key aspects]

**Introduction**
[3–4 lines: historical context or motivation, current relevance, scope]

**Core Explanation**
[4–6 lines: theoretical foundation, underlying principles, technical depth]

**Types / Classification** (include if applicable; omit only if genuinely not applicable)
[Categorized list with brief descriptions, or table]

**Key Characteristics**
- [Feature 1 — 2-line explanation with technical depth]
- [Feature 2 — 2-line explanation]
- [Feature 3]
- [Feature 4]
- [Feature 5]
- [Feature 6 — optional]

**Working Mechanism**
[Detailed technical flow — 5–7 numbered steps with reasoning for each step]

**Diagram**
\`\`\`
[Detailed text diagram — multi-level if needed]
[Show data flow, architectural layers, or process flow]
[All components labeled]
\`\`\`

**Real-World Applications**
- **[Domain 1 — specific company or system]:** [2-line explanation of application]
- **[Domain 2]:** [explanation]
- **[Domain 3]:** [explanation]
- **[Domain 4]:** [explanation]

**Case Study**
[4–6 lines: ONE specific real system — what problem → how this concept was applied → what outcome]
Do NOT use "Company X" — use a real named system]

**Advantages**
- [Advantage 1 — with brief justification]
- [Advantage 2]
- [Advantage 3]
- [Advantage 4]

**Limitations**
- [Limitation 1 — with context for when this matters]
- [Limitation 2]
- [Limitation 3]

**Conclusion**
[3 lines: holistic summary + future relevance or emerging trend]

Target: 600–800 words. Both Advantages AND Limitations required.`,

    problem:    PROBLEM_TEMPLATE,
    derivation: DERIVATION_TEMPLATE,
    code:       CODE_TEMPLATE,
    comparison: COMPARISON_TEMPLATE,
    diagram:    DIAGRAM_TEMPLATE,

    wordRange:        [550, 850],
    maxTokens:        3200,
    requiredSections: ['Definition', 'Core Explanation', 'Key Characteristics', 'Working Mechanism', 'Diagram', 'Real-World Applications', 'Case Study', 'Advantages', 'Limitations', 'Conclusion'],
    diagramRequired:  true,
  },

  20: {
    theory: `Answer with EXACTLY these sections in this order:

## [Topic Name]

**Definition**
[3–4 line authoritative definition covering all dimensions]

**Introduction / Historical Context**
[4–5 lines: origin, evolution, why this concept emerged, current landscape]

**Theoretical Foundation**
[5–7 lines: core principles, mathematical/logical basis, underlying model]

**Types / Classification**
[Comprehensive categorization — table or categorized list with 1-line descriptions]

**Detailed Features**
- **[Feature 1]:** [3-line deep explanation]
- **[Feature 2]:** [3-line explanation]
- **[Feature 3]:** [3-line explanation]
- **[Feature 4]:** [3-line explanation]
- **[Feature 5]:** [3-line explanation]
- **[Feature 6]:** [3-line explanation]

**Working Mechanism**
[7–10 step detailed technical walkthrough]
[Include: execution model, data transformations, internal state changes at each step]

**Diagram**
\`\`\`
[Comprehensive multi-component architecture or process diagram]
[Show interactions between parts]
[All labels present]
\`\`\`

**Extensive Real-World Applications**
- **[Domain 1 — System]:** [2-line explanation]
- **[Domain 2 — System]:** [explanation]
- **[Domain 3 — System]:** [explanation]
- **[Domain 4 — System]:** [explanation]
- **[Domain 5 — System]:** [explanation]
- **[Domain 6 — System]:** [explanation]

**Case Study**
[6–8 lines: detailed real-world scenario]
[Problem → Context → Application of concept → Outcome → Lessons learned]

**Advantages**
[5–6 advantages — each with 1-line justification]

**Limitations**
[4–5 limitations — each with context for when they apply]

**Current Trends / Future Scope**
[3–4 lines: emerging developments, research directions, industry adoption]

**Critical Analysis**
[3–4 lines: balanced evaluation — when to use vs alternatives, trade-offs, nuanced judgment]

**Conclusion**
[4–5 lines: comprehensive summary + significance + forward-looking statement]

Target: 900–1200 words. Multiple diagrams encouraged.`,

    problem:    PROBLEM_TEMPLATE,
    derivation: DERIVATION_TEMPLATE,
    code:       CODE_TEMPLATE,
    comparison: COMPARISON_TEMPLATE,
    diagram:    DIAGRAM_TEMPLATE,

    wordRange:        [850, 1250],
    maxTokens:        4500,
    requiredSections: ['Definition', 'Introduction', 'Theoretical Foundation', 'Detailed Features', 'Working Mechanism', 'Diagram', 'Extensive Real-World Applications', 'Case Study', 'Advantages', 'Limitations', 'Current Trends', 'Conclusion'],
    diagramRequired:  true,
  },
};

// ── Quick summary instruction (appended for 10M+) ────────────
export const QUICK_SUMMARY_INSTRUCTION = `

After the full answer, add this block exactly:

---
**QUICK SUMMARY**
In one line: [topic] = [simplest possible explanation, max 15 words]
Analogy: [everyday comparison that makes the concept click instantly]
Exam tip: [the ONE thing to remember for full marks on this topic]`;

// ── Exports ──────────────────────────────────────────────────
export function getTemplate(marks, questionType) {
  const validMarks = [2, 5, 10, 15, 20];
  // Snap to nearest valid mark level.
  // Uses strict < so ties (e.g. 7.5 between 5 and 10) always resolve to the
  // lower bucket — intentional; parseInt() in route.js prevents fractions anyway.
  const snapped = validMarks.reduce((prev, curr) =>
    Math.abs(curr - marks) < Math.abs(prev - marks) ? curr : prev
  );

  const template = TEMPLATES[snapped] || TEMPLATES[10];
  const prompt = template[questionType] || template.theory;

  return {
    prompt,
    wordRange:        template.wordRange,
    maxTokens:        template.maxTokens,
    requiredSections: template.requiredSections,
    diagramRequired:  template.diagramRequired,
    marks:            snapped,
  };
}

export { TEMPLATES };
