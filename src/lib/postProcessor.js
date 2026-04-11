// ──────────────────────────────────────────────────────────────
// Post-Processor — validate answer completeness after streaming
// ──────────────────────────────────────────────────────────────

/**
 * validateAnswer(answer, templateMeta)
 *
 * templateMeta shape:
 *   { requiredSections: string[], diagramRequired: boolean, wordRange: [min, max] }
 *
 * Returns:
 *   {
 *     isComplete:      boolean,
 *     wordCount:       number,
 *     wordInRange:     boolean,
 *     missingSections: string[],
 *     diagramMissing:  boolean,
 *     verifyCount:     number,     // number of [Verify:...] markers
 *     confidence:      "high" | "medium" | "low",
 *   }
 */
export function validateAnswer(answer, templateMeta = {}) {
  const {
    requiredSections = [],
    diagramRequired  = false,
    wordRange        = [0, Infinity],
  } = templateMeta;

  // ── Word count ───────────────────────────────────────────────
  const wordCount  = answer.trim().split(/\s+/).filter(Boolean).length;
  const wordInRange = wordCount >= wordRange[0] && wordCount <= wordRange[1];

  // ── Required sections ─────────────────────────────────────────
  const missingSections = requiredSections.filter((section) => {
    // Match heading as ## Section, **Section**, or **Section:**
    const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
      `(##\\s+${escaped}|\\*\\*${escaped}\\*\\*|\\*\\*${escaped}:\\*\\*)`,
      "i"
    );
    return !pattern.test(answer);
  });

  // ── Diagram presence ─────────────────────────────────────────
  // A diagram is present if there's a fenced code block (``` ... ```)
  const hasDiagram     = /```[\s\S]*?```/.test(answer);
  const diagramMissing = diagramRequired && !hasDiagram;

  // ── [Verify] markers ─────────────────────────────────────────
  const verifyMatches = answer.match(/\[Verify[^\]]*\]/gi) || [];
  const verifyCount   = verifyMatches.length;

  // ── Confidence level ─────────────────────────────────────────
  let confidence = "high";
  if (verifyCount >= 3 || missingSections.length >= 2 || diagramMissing) {
    confidence = "low";
  } else if (verifyCount >= 1 || missingSections.length >= 1) {
    confidence = "medium";
  }

  // ── Complete flag ─────────────────────────────────────────────
  const isComplete =
    missingSections.length === 0 &&
    !diagramMissing &&
    wordInRange;

  return {
    isComplete,
    wordCount,
    wordInRange,
    missingSections,
    diagramMissing,
    verifyCount,
    confidence,
  };
}

/**
 * extractVerifyMarkers(answer)
 * Returns array of { marker, claim } objects for UI display.
 */
export function extractVerifyMarkers(answer) {
  const regex = /\[Verify:\s*([^\]]+)\]/gi;
  const results = [];
  let match;
  while ((match = regex.exec(answer)) !== null) {
    results.push({ marker: match[0], claim: match[1].trim() });
  }
  return results;
}

/**
 * scoreAnswer(answer, templateMeta)
 * Returns a 0–10 integer quality score and a breakdown object.
 *
 * Scoring breakdown (total 10):
 *   sections    0–4  — 4 × (sections_present / max(required, 1))
 *   diagram     0–2  — 2 if diagram present (or not required)
 *   wordCount   0–2  — 2 if in range, 1 if within 20% of range, 0 otherwise
 *   accuracy    0–2  — 2 − min(verifyCount, 2)
 */
export function scoreAnswer(answer, templateMeta = {}) {
  const {
    requiredSections = [],
    diagramRequired  = false,
    wordRange        = [0, Infinity],
  } = templateMeta;

  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;

  // Section score
  const presentCount = requiredSections.filter((section) => {
    const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
      `(##\\s+${escaped}|\\*\\*${escaped}\\*\\*|\\*\\*${escaped}:\\*\\*)`,
      "i"
    );
    return pattern.test(answer);
  }).length;
  const sectionScore = requiredSections.length === 0
    ? 4
    : Math.round((presentCount / requiredSections.length) * 4);

  // Diagram score
  const hasDiagram = /```[\s\S]*?```/.test(answer);
  const diagramScore = (!diagramRequired || hasDiagram) ? 2 : 0;

  // Word count score
  const [minW, maxW] = wordRange;
  let wordScore = 0;
  if (wordCount >= minW && wordCount <= maxW) {
    wordScore = 2;
  } else {
    const lowerBound = minW * 0.8;
    const upperBound = maxW * 1.2;
    if (wordCount >= lowerBound && wordCount <= upperBound) wordScore = 1;
  }

  // Accuracy score — only meaningful when there is actual content
  const verifyCount = (answer.match(/\[Verify[^\]]*\]/gi) || []).length;
  const accuracyScore = wordCount === 0 ? 0 : Math.max(0, 2 - Math.min(verifyCount, 2));

  const total = sectionScore + diagramScore + wordScore + accuracyScore;

  return {
    score: Math.min(10, Math.max(0, total)),
    breakdown: { sectionScore, diagramScore, wordScore, accuracyScore },
  };
}
