/**
 * GET /api/cards/sr_due
 *
 * Fetches next-due spaced repetition cards for the authenticated user.
 * Returns topics ranked by daysOverdue (most urgent first).
 *
 * Query params:
 *   limit: int (default 10) — max number of topics to return
 *
 * Response: { ok: true, topics: [ { topic, subject, ease_factor, interval_days, repetition, next_due_at, days_overdue } ] }
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export async function GET(req) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50); // cap at 50

    // Call sr_next_due RPC to get next-due topics sorted by urgency
    const { data: topics, error } = await supabase.rpc("sr_next_due", {
      p_user_id: user.id,
      p_limit: limit,
    });

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      topics: topics || [],
    }, {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    console.error("GET /api/cards/sr_due error:", err);
    return NextResponse.json({ error: "Failed to fetch due cards" }, { status: 500 });
  }
}
