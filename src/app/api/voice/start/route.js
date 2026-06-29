import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { canStartCall, startCallSession } from "@/lib/voiceLimits";
import { checkMonthlyBudget, budgetExhaustedResponse } from "@/lib/aiSpend";
import { getUserPlan } from "@/lib/planLimits";
import { isInternalDev } from "@/lib/internalAccess";

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

    const check = await canStartCall(user.id, user);
    if (!check.allowed) {
      return NextResponse.json({
        error:        check.reason,
        upgradeUrl:   check.upgradeUrl,
        limitReached: true,
      }, { status: 403 });
    }

    // ── Monthly AI budget circuit breaker ────────────────────────────────
    // Skip for internal dev accounts (they test at unlimited scale).
    if (!isInternalDev(user)) {
      const plan        = await getUserPlan(user.id, user);
      const budgetCheck = await checkMonthlyBudget(user.id, plan);
      if (!budgetCheck.allowed) {
        return NextResponse.json(
          { ...budgetExhaustedResponse(budgetCheck), limitReached: true },
          { status: 429 }
        );
      }
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
