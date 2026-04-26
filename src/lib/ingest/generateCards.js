/**
 * generateCards — pure function: validated concepts + edges → card rows.
 *
 * No DB, no LLM. Uses templates + canonical_text already extracted.
 * concept_id on output rows is still the LLM temp id (e.g. "k1").
 * Caller must pass tempToRealId to persistCards to translate.
 *
 * Yields ~2-3 cards per concept:
 *   - definition/recall   (all types)
 *   - cloze               (when title appears verbatim in canonical_text)
 *   - application         (theorem, formula, procedure, argument)
 *   - relationship        (from prerequisite_of / specializes edges)
 */

export function generateCards({ concepts, edges }) {
  if (!concepts?.length) return [];

  const conceptMap = new Map(concepts.map((c) => [c.id, c]));
  const cards = [];

  for (const c of concepts) {
    if (!c.title || !c.canonical_text) continue;

    // 1. Recall card — always generated
    cards.push(makeRecallCard(c));

    // 2. Cloze — only when title appears verbatim
    const cloze = makeClozeCard(c);
    if (cloze) cards.push(cloze);

    // 3. Application — type-specific follow-up question
    const app = makeApplicationCard(c);
    if (app) cards.push(app);
  }

  // 4. Relationship cards from edges
  for (const edge of edges ?? []) {
    const from = conceptMap.get(edge.from);
    const to   = conceptMap.get(edge.to);
    if (!from || !to) continue;

    if (edge.kind === "prerequisite_of") {
      cards.push({
        concept_id: to.id,
        type: "relationship",
        front: `What prerequisite concept must you understand before learning "${to.title}"?`,
        back: from.title,
        metadata: { edge_kind: "prerequisite_of", linked_id: from.id },
      });
    } else if (edge.kind === "specializes") {
      cards.push({
        concept_id: from.id,
        type: "relationship",
        front: `"${from.title}" is a special case of what broader concept?`,
        back: to.title,
        metadata: { edge_kind: "specializes", linked_id: to.id },
      });
    }
  }

  return cards;
}

// ── Card builders ─────────────────────────────────────────────────────────────

function makeRecallCard(c) {
  const verb = {
    definition: "Define",
    theorem:    "State",
    procedure:  "What are the steps of",
    formula:    "Write the formula for",
    argument:   "Explain the argument for",
    case:       "Describe the case of",
  }[c.type] ?? "Explain";

  return {
    concept_id: c.id,
    type: "definition",
    front: `${verb}: ${c.title}`,
    back: c.canonical_text,
    metadata: { difficulty: c.difficulty ?? 3 },
  };
}

function makeClozeCard(c) {
  const text  = c.canonical_text;
  const title = c.title;

  // Exact case-insensitive match
  const idx = text.toLowerCase().indexOf(title.toLowerCase());
  if (idx === -1) return null;

  const masked = text.slice(0, idx) + "_____" + text.slice(idx + title.length);

  return {
    concept_id: c.id,
    type: "cloze",
    front: masked,
    back: title,
    metadata: { mask_start: idx, mask_len: title.length },
  };
}

function makeApplicationCard(c) {
  const prompt = {
    theorem:   `When does "${c.title}" apply? Give a condition or example.`,
    formula:   `In what situation would you use the formula for "${c.title}"?`,
    procedure: `In what situation would you apply "${c.title}"?`,
    argument:  `What is the strongest counter-argument to "${c.title}"?`,
  }[c.type];

  if (!prompt) return null;

  return {
    concept_id: c.id,
    type: "application",
    front: prompt,
    back: c.canonical_text,
    metadata: { self_graded: true, difficulty: c.difficulty ?? 3 },
  };
}
