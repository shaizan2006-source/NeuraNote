/**
 * GET /api/graph/[docId]
 *
 * Returns the concept graph for a single document — concepts, edges, and the
 * caller's mastery overlay. Shape is tuned for the debug viewer in Phase 0
 * and will be the same payload the real Brain Map consumes in Phase 3.
 *
 * Auth: Bearer token (Supabase user JWT).
 * Authorization: the document must belong to the caller. 404 on mismatch.
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export async function GET(req, { params }) {
  try {
    const { docId } = await params;
    if (!docId) {
      return NextResponse.json({ error: "Missing docId" }, { status: 400 });
    }

    // ── Auth ────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;

    // ── 1. Document (verifies ownership in one query) ───────────────────
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select(
        "id, name, concept_extraction_status, concept_extraction_error, concepts_count, concept_extraction_started_at, concept_extraction_finished_at",
      )
      .eq("id", docId)
      .eq("user_id", userId)
      .maybeSingle();

    if (docErr) throw docErr;
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // ── 2. Concepts ─────────────────────────────────────────────────────
    const { data: concepts, error: cErr } = await supabase
      .from("concepts")
      .select("id, title, type, difficulty, canonical_text, source_refs")
      .eq("document_id", docId)
      .order("created_at", { ascending: true });

    if (cErr) throw cErr;

    const conceptIds = (concepts ?? []).map((c) => c.id);

    // Short-circuit when extraction hasn't produced anything yet.
    if (conceptIds.length === 0) {
      return NextResponse.json({
        document: doc,
        concepts: [],
        edges: [],
        mastery: {},
      });
    }

    // ── 3. Edges + mastery in parallel ──────────────────────────────────
    const [edgesRes, masteryRes] = await Promise.all([
      supabase
        .from("concept_edges")
        .select("from_id, to_id, kind, strength")
        .in("from_id", conceptIds),
      supabase
        .from("mastery_state")
        .select("concept_id, strength, confidence, last_reviewed_at, next_due_at, exposures, lapses")
        .eq("user_id", userId)
        .in("concept_id", conceptIds),
    ]);

    if (edgesRes.error)   throw edgesRes.error;
    if (masteryRes.error) throw masteryRes.error;

    // Keep only intra-doc edges (concept_edges may point cross-document in future).
    const conceptIdSet = new Set(conceptIds);
    const edges = (edgesRes.data ?? []).filter(
      (e) => conceptIdSet.has(e.from_id) && conceptIdSet.has(e.to_id),
    );

    // concept_id → mastery row (flat map is cheaper for the client than array).
    const mastery = Object.fromEntries(
      (masteryRes.data ?? []).map((m) => [m.concept_id, m]),
    );

    return NextResponse.json({
      document: doc,
      concepts,
      edges,
      mastery,
    });
  } catch (err) {
    console.error("GET /api/graph/[docId] error:", err);
    return NextResponse.json(
      { error: "Failed to load concept graph" },
      { status: 500 },
    );
  }
}
