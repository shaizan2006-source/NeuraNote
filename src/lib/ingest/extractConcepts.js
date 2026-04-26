/**
 * extractConcepts — turn labelled chunks into a typed concept graph.
 *
 * This is a PURE function:
 *   - No DB writes, no filesystem, no retries beyond the LLM helper
 *   - Caller owns chunk-label → chunk-id mapping (see persistGraph.js)
 *   - Output is raw LLM output (before dedup/validation — see validateConcepts.js)
 *
 * Typical flow:
 *   extractConcepts() → validateConcepts() → persistGraph()
 */

import { callStructured } from "@/lib/llm/structuredOutput";

// Hard ceilings. Chunks beyond MAX_CHUNKS get evenly sampled.
const MAX_CHUNKS            = 30;     // ~24k chars ≈ 6k input tokens — halves LLM latency
const MAX_CHARS_PER_CHUNK   = 800;    // trimmed down; LLM needs context not verbatim walls
const DEFAULT_MAX_CONCEPTS  = 30;
const HARD_MAX_CONCEPTS     = 50;

// ── Schema ───────────────────────────────────────────────────────────────────
const CONCEPT_GRAPH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["concepts", "edges"],
  properties: {
    concepts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "type", "difficulty", "canonical_text", "source_chunk_ids"],
        properties: {
          id:             { type: "string", description: "Short temp id, unique within this response (e.g. k1, k2)" },
          title:          { type: "string", description: "Concise canonical name of the concept" },
          type: {
            type: "string",
            enum: ["definition", "theorem", "procedure", "formula", "argument", "case"],
          },
          difficulty:     { type: "integer", minimum: 1, maximum: 5 },
          canonical_text: { type: "string", description: "≤400 chars, quoted verbatim from a cited chunk" },
          source_chunk_ids: {
            type: "array",
            items: { type: "string", description: "Chunk labels like c1, c2" },
          },
        },
      },
    },
    edges: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["from", "to", "kind", "strength"],
        properties: {
          from:     { type: "string", description: "Concept id from this response" },
          to:       { type: "string", description: "Concept id from this response" },
          kind: {
            type: "string",
            enum: ["prerequisite_of", "related_to", "specializes"],
          },
          strength: { type: "number", minimum: 0, maximum: 1 },
        },
      },
    },
  },
};

// ── System prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You extract a typed concept graph from academic source material.

Definitions (strict):
- A CONCEPT is a named, teachable unit: a definition, theorem, procedure, formula, argument, or case study.
- NOT concepts: section headings, chapter titles, author names, vague topics ("physics", "overview").

Rules:
- Extract 15–${HARD_MAX_CONCEPTS} concepts total. Fewer is fine for short documents.
- Each concept MUST include canonical_text: a substring quoted VERBATIM from one of the cited chunks, ≤400 characters. No paraphrasing.
- Each concept MUST cite at least one source_chunk_id that exists in the provided chunks.
- Edges: only between concepts YOU extract. Use concept ids from your own "concepts" array.
- prerequisite_of: A → B means "you must understand A before you can learn B". Be conservative — over-edging is worse than under.
- related_to: same-level sibling concepts that reference each other.
- specializes: A → B means "A is a special case of B".
- Difficulty 1 = trivially obvious; 3 = standard course material; 5 = requires deep prior work.
- No self-edges. No duplicate concepts (same idea, different wording).

Output strictly matches the provided JSON schema. No prose, no markdown, no explanations.`;

// ── Public API ───────────────────────────────────────────────────────────────
/**
 * @param {Object}   opts
 * @param {Array}    opts.chunks       — [{ label, content, page? }]
 *                                       `label` is caller-assigned (e.g. "c1")
 *                                       and is what appears in source_chunk_ids output.
 * @param {string}   opts.docTitle
 * @param {string}  [opts.docSubject="General"]
 * @param {number}  [opts.maxConcepts=50]
 * @param {string}  [opts.model="gpt-4o-mini"]
 * @returns {Promise<{ concepts: Array, edges: Array }>}
 */
export async function extractConcepts({
  chunks,
  docTitle,
  docSubject = "General",
  maxConcepts = DEFAULT_MAX_CONCEPTS,
  model = "gpt-4o-mini",
}) {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    return { concepts: [], edges: [] };
  }

  const prepared = prepareChunks(chunks);
  const cap = Math.min(Math.max(1, maxConcepts), HARD_MAX_CONCEPTS);

  const user = buildUserPrompt({
    docTitle: docTitle || "Untitled",
    docSubject,
    chunks: prepared,
    maxConcepts: cap,
  });

  const result = await callStructured({
    name:        "concept_extraction",
    system:      SYSTEM_PROMPT,
    user,
    schema:      CONCEPT_GRAPH_SCHEMA,
    model,
    temperature: 0.2,
    maxTokens:   2000,
    maxRetries:  1,
  });

  return {
    concepts: result.concepts ?? [],
    edges:    result.edges ?? [],
  };
}

// ── Internals ────────────────────────────────────────────────────────────────

/**
 * Trim and sample chunks to stay under the MAX_CHUNKS ceiling.
 * Even sampling preserves document coverage; random sampling biases to
 * start-of-doc when chunks are insertion-ordered.
 */
function prepareChunks(chunks) {
  const trimmed = chunks.map((c) => ({
    label:   c.label,
    content: (c.content ?? "").slice(0, MAX_CHARS_PER_CHUNK).trim(),
    page:    c.page,
  })).filter((c) => c.label && c.content);

  if (trimmed.length <= MAX_CHUNKS) return trimmed;

  const stride = trimmed.length / MAX_CHUNKS;
  const sampled = [];
  for (let i = 0; i < MAX_CHUNKS; i++) {
    sampled.push(trimmed[Math.floor(i * stride)]);
  }
  return sampled;
}

function buildUserPrompt({ docTitle, docSubject, chunks, maxConcepts }) {
  const chunkBlocks = chunks
    .map((c) => `[${c.label}${c.page ? ` · p.${c.page}` : ""}]\n${c.content}`)
    .join("\n\n");

  return `Document: ${docTitle}
Subject: ${docSubject}
Target: up to ${maxConcepts} concepts.

Source chunks (each tagged with a label like [c1]):

${chunkBlocks}

Now extract the concept graph as JSON.`;
}
