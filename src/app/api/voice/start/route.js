import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { canStartCall, startCallSession } from "@/lib/voiceLimits";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const check = await canStartCall(user.id);
    if (!check.allowed) {
      return NextResponse.json({
        error:        check.reason,
        upgradeUrl:   check.upgradeUrl,
        limitReached: true,
      }, { status: 403 });
    }

    const callId = await startCallSession(user.id);

    return NextResponse.json({
      callId,
      plan:       check.plan,
      limits:     check.limits,
      todayCount: check.todayCount,
    });
  } catch (err) {
    console.error("voice/start error:", err);
    return NextResponse.json({ error: "Failed to start call" }, { status: 500 });
  }
}
