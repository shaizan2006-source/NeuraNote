/**
 * persistGraph — write a validated concept graph to Supabase.
 *
 * Idempotent: re-running for the same document updates existing concepts by
 * title (case-insensitive) instead of duplicating them. Edges + mastery_state
 * use `ignoreDuplicates` on their primary keys.
 *
 * Not transactional: Supabase JS has no Postgres transaction primitive. If
 * edge insert fails, concepts are already persisted — that's a survivable
 * state (caller can retry). Mastery rows use ON CONFLICT DO NOTHING so retry
 * never overwrites progress.
 *
 * @param {Object}   opts
 * @param {Object}   opts.supabase       — service-role client (server-side)
 * @param {string}   opts.userId
 * @param {string}   opts.documentId
 * @param {Array}    opts.concepts       — from validateConcepts (temp ids)
 * @param {Array}    opts.edges
 * @param {Map}      opts.chunkMap       — Map<label, chunkUuid>  (caller-built)
 * @returns {Promise<{ inserted: number, updated: number, edgeCount: number, stats: Object }>}
 */
export async function writeConceptGraph({
  supabase,
  userId,
  documentId,
  concepts,
  edges,
  chunkMap,
}) {
  if (!supabase)    throw new Error("writeConceptGraph: supabase client required");
  if (!userId)      throw new Error("writeConceptGraph: userId required");
  if (!documentId)  throw new Error("writeConceptGraph: documentId required");

  const stats = {
    input_concepts: concepts?.length ?? 0,
    input_edges:    edges?.length ?? 0,
    inserted:       0,
    updated:        0,
    edgeCount:      0,
    masteryCreated: 0,
  };

  if (!concepts?.length) return { ...stats };

  // ── 1. Fetch existing concepts for this doc (for upsert-by-title) ─────
  const { data: existing, error: fetchErr } = await supabase
    .from("concepts")
    .select("id, title")
    .eq("document_id", documentId);

  if (fetchErr) throw fetchErr;

  // Map normalized title → existing UUID
  const titleToId = new Map(
    (existing ?? []).map((c) => [normalizeTitle(c.title), c.id]),
  );

  // ── 2. Partition incoming into INSERT vs UPDATE ───────────────────────
  const toInsert = [];
  const toUpdate = [];
  const tempToRealId = new Map();    // LLM temp id → Supabase UUID

  for (const c of concepts) {
    const row = buildConceptRow({ c, userId, documentId, chunkMap });
    if (!row) continue;

    const key = normalizeTitle(c.title);
    const existingId = titleToId.get(key);

    if (existingId) {
      toUpdate.push({ id: existingId, ...row });
      tempToRealId.set(c.id, existingId);
    } else {
      toInsert.push({ _tempId: c.id, ...row });
    }
  }

  // ── 3. Batch INSERT new concepts ──────────────────────────────────────
  if (toInsert.length) {
    const insertRows = toInsert.map(({ _tempId, ...row }) => row);
    const { data: inserted, error } = await supabase
      .from("concepts")
      .insert(insertRows)
      .select("id, title");

    if (error) throw error;

    // Re-build temp → real mapping for newly inserted (match by title)
    const insertedByTitle = new Map(
      (inserted ?? []).map((r) => [normalizeTitle(r.title), r.id]),
    );
    for (const { _tempId, title } of toInsert) {
      const realId = insertedByTitle.get(normalizeTitle(title));
      if (realId) tempToRealId.set(_tempId, realId);
    }
    stats.inserted = inserted?.length ?? 0;
  }

  // ── 4. Parallel UPDATE existing concepts ──────────────────────────────
  // Fire all updates concurrently — each targets a different PK so no conflicts.
  if (toUpdate.length) {
    const results = await Promise.all(
      toUpdate.map(({ id, ...fields }) =>
        supabase.from("concepts").update(fields).eq("id", id),
      ),
    );
    for (const { error } of results) {
      if (error) throw error;
    }
    stats.updated = toUpdate.length;
  }

  // ── 5. Persist edges (dedup by PK via ignoreDuplicates) ───────────────
  const edgeRows = (edges ?? [])
    .map((e) => {
      const from_id = tempToRealId.get(e.from);
      const to_id   = tempToRealId.get(e.to);
      if (!from_id || !to_id || from_id === to_id) return null;
      return { from_id, to_id, kind: e.kind, strength: e.strength };
    })
    .filter(Boolean);

  if (edgeRows.length) {
    const { error: edgeErr } = await supabase
      .from("concept_edges")
      .upsert(edgeRows, {
        onConflict: "from_id,to_id,kind",
        ignoreDuplicates: true,
      });
    if (edgeErr) throw edgeErr;
    stats.edgeCount = edgeRows.length;
  }

  // ── 6. Create empty mastery rows (never overwrite progress) ───────────
  const allConceptIds = Array.from(tempToRealId.values());
  if (allConceptIds.length) {
    const masteryRows = allConceptIds.map((concept_id) => ({
      user_id: userId,
      concept_id,
    }));
    const { error: mErr } = await supabase
      .from("mastery_state")
      .upsert(masteryRows, {
        onConflict: "user_id,concept_id",
        ignoreDuplicates: true,
      });
    if (mErr) throw mErr;
    stats.masteryCreated = masteryRows.length;
  }

  return { ...stats, tempToRealId };
}

// ── Helpers ──────────────────────────────────────────────────────────────

function buildConceptRow({ c, userId, documentId, chunkMap }) {
  if (!c?.title || !c?.type) return null;

  // Resolve chunk labels (c1, c2) → DB uuids, attach optional page refs.
  const source_refs = (c.source_chunk_ids ?? [])
    .map((label) => {
      const chunkMeta = chunkMap.get(label);
      if (!chunkMeta) return null;
      // chunkMap can carry either the raw uuid or { id, page }
      if (typeof chunkMeta === "string") return { chunk_id: chunkMeta };
      return {
        chunk_id: chunkMeta.id,
        ...(chunkMeta.page != null ? { page: chunkMeta.page } : {}),
      };
    })
    .filter(Boolean);

  if (source_refs.length === 0) return null;

  return {
    user_id:        userId,
    document_id:    documentId,
    title:          c.title,
    type:           c.type,
    difficulty:     c.difficulty ?? 3,
    canonical_text: c.canonical_text ?? null,
    source_refs,
    // embedding: null  — populated in Phase 0.5
  };
}

function normalizeTitle(title) {
  return (title ?? "")
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
