/**
 * POST /api/cards/[id]/review
 *
 * Records a review rating for a card and updates mastery_state.
 *
 * Body: { rating: "again" | "hard" | "good" | "easy" }
 *
 * Mastery update (Phase 0.5 simple rules — FSRS deferred to Phase 1):
 *   again → strength -= 0.2, next_due = now + 1 min, lapses++
 *   hard  → strength += 0,   next_due = now + 1 day
 *   good  → strength += 0.15, next_due = now + (strength * 5 days)
 *   easy  → strength += 0.3,  next_due = now + (strength * 14 days)
 *
 * strength is clamped to [0, 1].
 * confidence grows by 0.1 per review (clamped to 1).
 *
 * Response: { ok: true, mastery: { strength, next_due_at, exposures, lapses } }
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { scheduleReview } from "@/lib/fsrs/scheduler";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const RATING_DELTA = { again: -0.2, hard: 0, good: 0.15, easy: 0.3 };
const RATING_DAYS  = { again: 0,    hard: 1, good: 5,    easy: 14 };
// FSRS rating values: Again=1, Hard=2, Good=3, Easy=4
const RATING_TO_FSRS = { again: 1, hard: 2, good: 3, easy: 4 };

export async function POST(req, { params }) {
  try {
    const { id: cardId } = await params;

    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const rating = body?.rating;
    if (!RATING_DELTA.hasOwnProperty(rating)) {
      return NextResponse.json({ error: "rating must be again|hard|good|easy" }, { status: 400 });
    }

    // Fetch card to get concept_id (and verify ownership)
    const { data: card, error: cardErr } = await supabase
      .from("cards")
      .select("concept_id")
      .eq("id", cardId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (cardErr) throw cardErr;
    if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });

    // Fetch current mastery
    const { data: mastery, error: mErr } = await supabase
      .from("mastery_state")
      .select("strength, confidence, exposures, lapses")
      .eq("user_id", user.id)
      .eq("concept_id", card.concept_id)
      .maybeSingle();

    if (mErr) throw mErr;

    const current = mastery ?? { strength: 0, confidence: 0, exposures: 0, lapses: 0 };
    const delta   = RATING_DELTA[rating];

    const newStrength   = Math.min(1, Math.max(0, (current.strength ?? 0) + delta));
    const newConfidence = Math.min(1, (current.confidence ?? 0) + 0.1);
    const newExposures  = (current.exposures ?? 0) + 1;
    const newLapses     = (current.lapses ?? 0) + (rating === "again" ? 1 : 0);

    // next_due: again → 1 min; others → days proportional to new strength (min 1 day)
    let nextDueAt;
    if (rating === "again") {
      nextDueAt = new Date(Date.now() + 60 * 1000).toISOString();
    } else {
      const days = Math.max(1, RATING_DAYS[rating] * newStrength);
      nextDueAt  = new Date(Date.now() + days * 86_400_000).toISOString();
    }

    const { error: updateErr } = await supabase
      .from("mastery_state")
      .upsert({
        user_id:          user.id,
        concept_id:       card.concept_id,
        strength:         newStrength,
        confidence:       newConfidence,
        exposures:        newExposures,
        lapses:           newLapses,
        last_reviewed_at: new Date().toISOString(),
        next_due_at:      nextDueAt,
      }, { onConflict: "user_id,concept_id" });

    if (updateErr) throw updateErr;

    // Update SM-2 spaced repetition state (Phase 3).
    // First, fetch the concept's topic/subject from mastery_topics if available.
    const { data: masteryTopic } = await supabase
      .from("mastery_topics")
      .select("topic, subject")
      .eq("user_id", user.id)
      .eq("topic", card.concept_id) // Assume concept_id is the topic name for now
      .maybeSingle();

    if (masteryTopic) {
      const fsrsRating = RATING_TO_FSRS[rating] ?? 3;
      await scheduleReview(user.id, masteryTopic.topic, fsrsRating).catch(() => null);
    }

    return NextResponse.json({
      ok: true,
      mastery: {
        strength:    newStrength,
        confidence:  newConfidence,
        next_due_at: nextDueAt,
        exposures:   newExposures,
        lapses:      newLapses,
      },
    });
  } catch (err) {
    console.error("POST /api/cards/[id]/review error:", err);
    return NextResponse.json({ error: "Review failed" }, { status: 500 });
  }
}
