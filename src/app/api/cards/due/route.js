/**
 * GET /api/cards/due
 *
 * Returns cards due for review for the authenticated user.
 * "Due" means: next_due_at IS NULL (never reviewed) OR next_due_at <= now.
 *
 * Query params:
 *   limit       — max cards to return (default 20, max 50)
 *   document_id — optional, restrict to one document
 *
 * Response: { cards: [{ id, type, front, back, metadata, concept: { title, type, difficulty }, mastery }] }
 *
 * Note: Supabase PostgREST can't order/filter by foreign-table columns, so we
 * fetch cards + mastery separately and merge in JS.
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const DEFAULT_LIMIT = 20;
const MAX_LIMIT     = 50;

export async function GET(req) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const limit      = Math.min(Number(searchParams.get("limit")) || DEFAULT_LIMIT, MAX_LIMIT);
    const documentId = searchParams.get("document_id");

    // ── 1. Fetch cards with concept info ─────────────────────────────────
    let cardQuery = supabase
      .from("cards")
      .select("id, type, front, back, metadata, concept_id, concepts ( title, type, difficulty )")
      .eq("user_id", user.id);

    if (documentId) cardQuery = cardQuery.eq("document_id", documentId);

    const { data: cards, error: cardErr } = await cardQuery;
    if (cardErr) throw cardErr;
    if (!cards?.length) return NextResponse.json({ cards: [] });

    // ── 2. Fetch mastery for these concepts ───────────────────────────────
    const conceptIds = [...new Set(cards.map((c) => c.concept_id))];
    const { data: masteryRows, error: mErr } = await supabase
      .from("mastery_state")
      .select("concept_id, next_due_at, strength, confidence, exposures, lapses")
      .eq("user_id", user.id)
      .in("concept_id", conceptIds);

    if (mErr) throw mErr;

    const masteryMap = new Map((masteryRows ?? []).map((m) => [m.concept_id, m]));

    // ── 3. Filter due + sort (nulls = never reviewed = highest priority) ──
    const now = Date.now();

    const due = cards
      .map((card) => {
        const mastery = masteryMap.get(card.concept_id) ?? null;
        return { ...card, concept: card.concepts, mastery };
      })
      .filter(({ mastery }) => {
        if (!mastery?.next_due_at) return true;           // never reviewed
        return new Date(mastery.next_due_at).getTime() <= now;
      })
      .sort((a, b) => {
        // null (never reviewed) sorts first
        const ta = a.mastery?.next_due_at ? new Date(a.mastery.next_due_at).getTime() : 0;
        const tb = b.mastery?.next_due_at ? new Date(b.mastery.next_due_at).getTime() : 0;
        return ta - tb;
      })
      .slice(0, limit)
      .map(({ concepts, ...rest }) => rest); // drop raw join field

    return NextResponse.json({ cards: due });
  } catch (err) {
    console.error("GET /api/cards/due error:", err);
    return NextResponse.json({ error: "Failed to fetch due cards" }, { status: 500 });
  }
}
