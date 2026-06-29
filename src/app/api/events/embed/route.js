import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// =====================================================================
// POST /api/events/embed
//
// Picks up to BATCH_SIZE un-embedded learning_events for a user and
// fills the embedding column using text-embedding-3-small.
//
// Called from /api/events after bulk insert (fire-and-forget).
// Also callable manually for backfilling historical events.
//
// Auth: bearer token (same as other routes) OR internal x-service-call header.
// =====================================================================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 2, timeout: 45_000 });

const BATCH_SIZE    = 50;
const EMBEDDABLE    = new Set(["question_asked", "concept_clarified", "coach_step_requested"]);

async function resolveUserId(req) {
  // Internal server-to-server call — user_id passed directly in body.
  const isInternal = req.headers.get("x-internal-call") === process.env.INTERNAL_CALL_SECRET;
  if (isInternal) return null; // caller must supply userId in body
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user?.id || null;
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    let userId = body.userId || null;

    if (!userId) {
      // Try bearer auth path
      userId = await resolveUserId(req);
    }
    if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

    // Fetch unembedded embeddable events.
    const { data: rows, error } = await supabase
      .from("learning_events")
      .select("id, event_type, topic, metadata")
      .eq("user_id", userId)
      .is("embedding", null)
      .in("event_type", [...EMBEDDABLE])
      .order("created_at", { ascending: false })
      .limit(BATCH_SIZE);

    if (error) {
      console.error("[events/embed] fetch error:", error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: true, embedded: 0 });
    }

    // Extract text for each row.
    // Priority: metadata.questionText > topic > event_type label.
    const texts = rows.map(r => {
      const q = r.metadata?.questionText;
      if (q && typeof q === "string" && q.trim()) return q.trim().slice(0, 500);
      if (r.topic) return r.topic;
      return r.event_type.replace(/_/g, " ");
    });

    // Batch embed — one API call for the whole batch.
    let vectors;
    try {
      const res = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: texts,
      });
      vectors = res.data.map(d => d.embedding);
    } catch (err) {
      console.error("[events/embed] OpenAI error:", err?.message);
      return NextResponse.json({ ok: false, error: "embedding failed" }, { status: 502 });
    }

    // Update each row individually (Supabase JS v2 has no bulk update with per-row values).
    const updates = rows.map((row, i) =>
      supabase
        .from("learning_events")
        .update({ embedding: vectors[i] })
        .eq("id", row.id)
        .eq("user_id", userId)
    );
    const results = await Promise.allSettled(updates);
    const failed  = results.filter(r => r.status === "rejected" || r.value?.error).length;
    if (failed > 0) console.warn(`[events/embed] ${failed}/${rows.length} updates failed`);

    return NextResponse.json({ ok: true, embedded: rows.length - failed });
  } catch (err) {
    console.error("[events/embed] fatal:", err?.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
