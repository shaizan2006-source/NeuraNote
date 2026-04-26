/**
 * POST /api/concepts/backfill
 *
 * Re-run concept extraction for the caller's documents that don't have a graph
 * yet. Picks up docs uploaded before the feature existed, and retries previous
 * failures.
 *
 * Body (optional):
 *   { documentId?: string, limit?: number }
 *   - documentId — backfill just this one doc (useful for manual retry)
 *   - limit      — max docs to process in one invocation (default 3, cap 10)
 *
 * Response: { queued: n, documentIds: [...] }
 *
 * Execution model: the heavy work (extract → validate → persist) runs inside
 * Next's `after()` so the HTTP call returns in ms. Each doc is processed
 * sequentially to avoid racing OpenAI rate limits and overlapping the same
 * few concepts on ingest.
 *
 * Candidate selection: documents where concept_extraction_status IS NULL,
 * 'pending', or 'failed'. `skipped_ocr` is excluded (by design; OCR text
 * isn't safe to ground concepts in). `done` and `running` are excluded.
 */

import { NextResponse, after } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { extractConcepts } from "@/lib/ingest/extractConcepts";
import { validateConcepts } from "@/lib/ingest/validateConcepts";
import { writeConceptGraph } from "@/lib/ingest/persistGraph";
import { generateCards } from "@/lib/ingest/generateCards";
import { persistCards } from "@/lib/ingest/persistCards";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const DEFAULT_LIMIT = 3;
const HARD_LIMIT    = 10;

export async function POST(req) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = user.id;

    // ── Parse body (tolerant — body is optional) ────────────────────────
    let body = {};
    try { body = await req.json(); } catch { /* empty body is fine */ }
    const limit = Math.min(Math.max(1, Number(body.limit) || DEFAULT_LIMIT), HARD_LIMIT);

    // ── Find candidates ─────────────────────────────────────────────────
    let query = supabase
      .from("documents")
      .select("id, name")
      .eq("user_id", userId);

    if (body.documentId) {
      query = query.eq("id", body.documentId);
    } else {
      query = query
        .or(
          "concept_extraction_status.is.null,concept_extraction_status.eq.pending,concept_extraction_status.eq.failed",
        )
        .order("created_at", { ascending: true })
        .limit(limit);
    }

    const { data: candidates, error: findErr } = await query;
    if (findErr) throw findErr;

    if (!candidates?.length) {
      return NextResponse.json({ queued: 0, documentIds: [] });
    }

    const candidateIds = candidates.map((d) => d.id);

    // Mark all as running so duplicate backfill calls don't double-process.
    await supabase
      .from("documents")
      .update({
        concept_extraction_status: "running",
        concept_extraction_started_at: new Date().toISOString(),
        concept_extraction_error: null,
      })
      .in("id", candidateIds);

    // ── Fire-and-forget extraction (2 docs in parallel) ─────────────────
    // Concurrency=2: fast enough to feel parallel, safe for OpenAI rate limits.
    after(async () => {
      const CONCURRENCY = 2;
      for (let i = 0; i < candidates.length; i += CONCURRENCY) {
        const batch = candidates.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map((doc) => runExtractionForDoc({ doc, userId })));
      }
    });

    return NextResponse.json({
      queued:      candidates.length,
      documentIds: candidateIds,
    });
  } catch (err) {
    console.error("POST /api/concepts/backfill error:", err);
    return NextResponse.json(
      { error: "Backfill failed to enqueue" },
      { status: 500 },
    );
  }
}

// ── Per-doc extraction (sequentially invoked from after()) ───────────────

async function runExtractionForDoc({ doc, userId }) {
  const documentId = doc.id;
  try {
    // Verify document still exists (handle race: doc might be deleted between listing and extraction)
    const { data: docCheck, error: docErr } = await supabase
      .from("documents")
      .select("id")
      .eq("id", documentId)
      .maybeSingle();

    if (docErr) throw docErr;
    if (!docCheck) {
      console.warn(`Document ${documentId} no longer exists, skipping extraction`);
      return;
    }

    // Load chunks in document order so labels c1, c2… match reading order.
    const { data: chunks, error: chErr } = await supabase
      .from("document_chunks")
      .select("id, content, page_number")
      .eq("document_id", documentId)
      .order("page_number", { ascending: true })
      .order("id", { ascending: true });

    if (chErr) throw chErr;
    if (!chunks?.length) {
      await supabase
        .from("documents")
        .update({ concept_extraction_status: "skipped_no_chunks" })
        .eq("id", documentId);
      console.log(`Document ${documentId} has no chunks, skipped`);
      return;
    }

    const labelledChunks = chunks.map((c, i) => ({
      label:   `c${i + 1}`,
      content: c.content,
      page:    c.page_number,
    }));

    const chunkMap = new Map(
      chunks.map((c, i) => [`c${i + 1}`, { id: c.id, page: c.page_number }]),
    );

    const raw = await extractConcepts({
      chunks:     labelledChunks,
      docTitle:   doc.name,
      docSubject: "General",
    });

    const validated = validateConcepts({
      concepts: raw.concepts,
      edges:    raw.edges,
      chunks:   labelledChunks,
    });

    const persistStats = await writeConceptGraph({
      supabase,
      userId,
      documentId,
      concepts: validated.concepts,
      edges:    validated.edges,
      chunkMap,
    });

    const cards = generateCards({ concepts: validated.concepts, edges: validated.edges });
    const cardStats = await persistCards({
      supabase,
      userId,
      documentId,
      cards,
      tempToRealId: persistStats.tempToRealId,
    });

    await supabase
      .from("documents")
      .update({
        concept_extraction_status:     "done",
        concept_extraction_finished_at: new Date().toISOString(),
        concepts_count:                persistStats.inserted + persistStats.updated,
      })
      .eq("id", documentId);

    console.log("BACKFILL DONE", {
      documentId,
      validator: validated.stats,
      persist:   persistStats,
      cards:     cardStats,
    });
  } catch (err) {
    console.error("BACKFILL FAILED:", documentId, err);
    await supabase
      .from("documents")
      .update({
        concept_extraction_status:      "failed",
        concept_extraction_error:       String(err?.message ?? err).slice(0, 500),
        concept_extraction_finished_at: new Date().toISOString(),
      })
      .eq("id", documentId);
  }
}
