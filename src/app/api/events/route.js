import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Inline validation set — keep server independent of client bundle.
const VALID_EVENT_TYPES = new Set([
  "question_asked","answer_received","followup_asked",
  "mode_switched","dashboard_mode_toggled",
  "coach_step_requested","concept_clarified","study_plan_generated","study_plan_task_done",
  "quiz_started","quiz_question_attempted","quiz_completed","card_reviewed",
  "pdf_uploaded","pdf_queried",
  "session_started","session_ended","focus_started","focus_ended",
  "voice_turn_started","voice_turn_ended",
  "page_viewed",
]);

const MAX_BATCH = 50;

async function resolveUserId(req) {
  // Bearer-auth path (regular fetch from track.js).
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (token) {
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) return user.id;
  }
  // Beacon path: cookies aren't always sent. We accept an optional userId in
  // the body ONLY if it round-trips a JWT in metadata? No — tighter: beacon
  // calls go unauthenticated and are dropped. The next focused fetch flushes.
  // (We deliberately do not honour anonymous inserts.)
  return null;
}

export async function POST(req) {
  try {
    const userId = await resolveUserId(req);
    if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

    const body = await req.json().catch(() => null);
    const events = Array.isArray(body?.events) ? body.events : [];
    if (!events.length) return NextResponse.json({ ok: true, inserted: 0 });
    if (events.length > MAX_BATCH) {
      return NextResponse.json({ ok: false, error: "batch too large" }, { status: 413 });
    }

    const rows = [];
    for (const e of events) {
      if (!e || typeof e !== "object")               continue;
      if (!VALID_EVENT_TYPES.has(e.event_type))      continue;
      rows.push({
        user_id:     userId,
        event_type:  e.event_type,
        surface:     typeof e.surface === "string" ? e.surface.slice(0, 32)  : null,
        topic:       typeof e.topic   === "string" ? e.topic.slice(0, 120)   : null,
        subject:     typeof e.subject === "string" ? e.subject.slice(0, 64)  : null,
        metadata:    e.metadata && typeof e.metadata === "object" ? e.metadata : {},
        session_id:  typeof e.session_id === "string" && e.session_id.length === 36 ? e.session_id : null,
        duration_ms: Number.isFinite(e.duration_ms) ? Math.max(0, Math.min(24*3600*1000, e.duration_ms)) : null,
      });
    }
    if (!rows.length) return NextResponse.json({ ok: true, inserted: 0 });

    const { error } = await supabase.from("learning_events").insert(rows);
    if (error) {
      console.error("[api/events] insert error:", error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Fire embedding worker in background when embeddable events were inserted.
    // Non-blocking: response returns immediately; embed happens async.
    const hasEmbeddable = rows.some(r =>
      ["question_asked","concept_clarified","coach_step_requested"].includes(r.event_type)
    );
    if (hasEmbeddable && process.env.NEXT_PUBLIC_SITE_URL) {
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/events/embed`, {
        method:  "POST",
        headers: {
          "Content-Type":    "application/json",
          "x-internal-call": process.env.INTERNAL_CALL_SECRET || "",
        },
        body: JSON.stringify({ userId }),
      }).catch(() => {}); // fire-and-forget
    }

    return NextResponse.json({ ok: true, inserted: rows.length });
  } catch (err) {
    console.error("[api/events] fatal:", err?.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
