/**
 * validateConcepts — post-LLM cleanup.
 *
 * The extractor returns raw LLM output. This file is the quality gate that
 * sits between extract and persist. It enforces:
 *
 *   1. canonical_text is actually quoted from a cited chunk (not hallucinated)
 *   2. source_chunk_ids all reference chunks the caller provided
 *   3. titles are not section-heading noise ("Introduction", "Chapter 3")
 *   4. titles are unique after normalization (dedup)
 *   5. concepts are ≤ hard cap
 *   6. edges only reference surviving concepts
 *   7. no self-edges, valid kind + strength
 *
 * Returns { concepts, edges, stats } where stats describes what was filtered.
 */

const HARD_MAX_CONCEPTS = 80;
const MIN_TITLE_WORDS   = 1;        // reject empty titles only
const MAX_TITLE_CHARS   = 120;
const MAX_CANONICAL_CHARS = 600;    // LLM sometimes overshoots 400-char instruction

// Section-heading words that are NOT concepts on their own.
// Matched case-insensitively on the FULL title (trimmed).
const BANNED_TITLES = new Set([
  "introduction", "overview", "summary", "conclusion",
  "preface", "foreword", "abstract", "references", "bibliography",
  "index", "appendix", "glossary", "contents", "acknowledgements",
  "acknowledgments", "exercises", "problems", "review",
]);

const BANNED_TITLE_PATTERNS = [
  /^chapter\s+\d+/i,
  /^section\s+[\d.]+/i,
  /^part\s+[ivx\d]+/i,
  /^unit\s+\d+/i,
  /^lesson\s+\d+/i,
  /^\d+(\.\d+)*\s*$/,              // just a number like "2.3"
];

/**
 * @param {Object} opts
 * @param {Array}  opts.concepts — from extractConcepts
 * @param {Array}  opts.edges
 * @param {Array}  opts.chunks   — [{ label, content }] — caller-provided, source of truth
 * @param {number} [opts.maxConcepts=80]
 * @returns {{ concepts: Array, edges: Array, stats: Object }}
 */
export function validateConcepts({ concepts, edges, chunks, maxConcepts = HARD_MAX_CONCEPTS }) {
  const stats = {
    input_concepts:       concepts?.length ?? 0,
    input_edges:          edges?.length ?? 0,
    dropped_banned_title: 0,
    dropped_bad_refs:     0,
    dropped_ungrounded:   0,
    dropped_duplicate:    0,
    dropped_over_cap:     0,
    dropped_self_edge:    0,
    dropped_orphan_edge:  0,
    kept_concepts:        0,
    kept_edges:           0,
  };

  if (!Array.isArray(concepts) || concepts.length === 0) {
    return { concepts: [], edges: [], stats };
  }

  const chunkMap = new Map(
    (chunks ?? []).map((c) => [c.label, (c.content ?? "").toLowerCase()]),
  );

  // ── Pass 1: per-concept validity ────────────────────────────────────────
  const passOne = [];
  for (const raw of concepts) {
    const c = sanitizeConcept(raw);
    if (!c) continue;

    if (isBannedTitle(c.title)) {
      stats.dropped_banned_title++;
      continue;
    }

    // source_chunk_ids must all reference known chunks
    const validRefs = (c.source_chunk_ids ?? []).filter((id) => chunkMap.has(id));
    if (validRefs.length === 0) {
      stats.dropped_bad_refs++;
      continue;
    }
    c.source_chunk_ids = validRefs;

    // canonical_text must appear (substring) in at least one cited chunk
    if (!isGrounded(c.canonical_text, validRefs, chunkMap)) {
      stats.dropped_ungrounded++;
      continue;
    }

    passOne.push(c);
  }

  // ── Pass 2: title dedup (keep first occurrence) ─────────────────────────
  const seen = new Map();    // normalizedTitle → concept
  const titleRemap = new Map(); // original id → survivor id
  for (const c of passOne) {
    const key = normalizeTitle(c.title);
    if (seen.has(key)) {
      titleRemap.set(c.id, seen.get(key).id);
      stats.dropped_duplicate++;
      continue;
    }
    seen.set(key, c);
  }
  let deduped = Array.from(seen.values());

  // ── Pass 3: hard cap ────────────────────────────────────────────────────
  if (deduped.length > maxConcepts) {
    // Keep the first maxConcepts — they appear in document order which
    // typically mirrors conceptual progression.
    stats.dropped_over_cap = deduped.length - maxConcepts;
    const dropped = deduped.slice(maxConcepts).map((c) => c.id);
    deduped = deduped.slice(0, maxConcepts);
    for (const id of dropped) titleRemap.set(id, null); // mark as dropped
  }

  const survivingIds = new Set(deduped.map((c) => c.id));

  // ── Pass 4: edge filtering ──────────────────────────────────────────────
  const cleanEdges = [];
  for (const rawE of edges ?? []) {
    const from = rawE?.from;
    const to   = rawE?.to;
    if (!from || !to) { stats.dropped_orphan_edge++; continue; }

    // Remap through dedup (edge to a duplicate → redirect to survivor)
    const resolvedFrom = titleRemap.get(from) ?? from;
    const resolvedTo   = titleRemap.get(to)   ?? to;

    if (resolvedFrom === null || resolvedTo === null) {
      stats.dropped_orphan_edge++;
      continue;
    }
    if (resolvedFrom === resolvedTo) {
      stats.dropped_self_edge++;
      continue;
    }
    if (!survivingIds.has(resolvedFrom) || !survivingIds.has(resolvedTo)) {
      stats.dropped_orphan_edge++;
      continue;
    }

    const kind = rawE.kind;
    if (!["prerequisite_of", "related_to", "specializes"].includes(kind)) {
      stats.dropped_orphan_edge++;
      continue;
    }

    const strength = clamp01(rawE.strength ?? 0.5);

    cleanEdges.push({ from: resolvedFrom, to: resolvedTo, kind, strength });
  }

  // Dedup edges (same from+to+kind)
  const edgeKey = (e) => `${e.from}::${e.to}::${e.kind}`;
  const edgesMap = new Map();
  for (const e of cleanEdges) {
    const k = edgeKey(e);
    if (!edgesMap.has(k)) edgesMap.set(k, e);
  }
  const finalEdges = Array.from(edgesMap.values());

  stats.kept_concepts = deduped.length;
  stats.kept_edges    = finalEdges.length;

  return { concepts: deduped, edges: finalEdges, stats };
}

// ── Helpers ──────────────────────────────────────────────────────────────

function sanitizeConcept(c) {
  if (!c || typeof c !== "object") return null;
  const title = (c.title ?? "").trim();
  if (!title || title.length > MAX_TITLE_CHARS) return null;
  if (title.split(/\s+/).filter(Boolean).length < MIN_TITLE_WORDS) return null;

  const canonical = (c.canonical_text ?? "").slice(0, MAX_CANONICAL_CHARS).trim();
  if (!canonical) return null;

  return {
    id:               String(c.id ?? "").trim(),
    title,
    type:             c.type,
    difficulty:       clampInt(c.difficulty, 1, 5, 3),
    canonical_text:   canonical,
    source_chunk_ids: Array.isArray(c.source_chunk_ids) ? c.source_chunk_ids.map(String) : [],
  };
}

function isBannedTitle(title) {
  const lower = title.toLowerCase().trim();
  if (BANNED_TITLES.has(lower)) return true;
  return BANNED_TITLE_PATTERNS.some((re) => re.test(lower));
}

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isGrounded(canonical, chunkIds, chunkMap) {
  const needle = canonical.toLowerCase().replace(/\s+/g, " ").trim();
  if (needle.length < 15) return true;    // too short to meaningfully ground; skip check

  // Try direct substring match first (fast path)
  for (const id of chunkIds) {
    const hay = (chunkMap.get(id) ?? "").replace(/\s+/g, " ");
    if (hay.includes(needle)) return true;
  }

  // Fallback: check if at least 70% of words from canonical appear in any chunk.
  // Catches cases where LLM paraphrases slightly but stays faithful.
  const words = needle.split(" ").filter((w) => w.length > 3);
  if (words.length < 4) return false;

  for (const id of chunkIds) {
    const hay = chunkMap.get(id) ?? "";
    const hits = words.filter((w) => hay.includes(w)).length;
    if (hits / words.length >= 0.7) return true;
  }

  return false;
}

function clamp01(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0.5;
  return Math.max(0, Math.min(1, x));
}

function clampInt(n, min, max, fallback) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.max(min, Math.min(max, Math.round(x)));
}
