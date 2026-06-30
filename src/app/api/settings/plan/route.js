// src/app/api/settings/plan/route.js
import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/serverAuth";
import { PLANS, getUserPlan, countTodayQA, countUserPDFs } from "@/lib/planLimits";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [planRow, qaUsedToday, pdfCount] = await Promise.all([
    getUserPlan(user.id),
    countTodayQA(user.id),
    countUserPDFs(user.id),
  ]);

  // getUserPlan returns the plan string (e.g. "free", "pro"); we need the full row for expiresAt.
  // getUserPlan also accepts a supabaseAdmin query internally — re-query for expires_at.
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: planData } = await sb
    .from("user_plans")
    .select("plan, expires_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const plan      = planData?.plan ?? "free";
  const expiresAt = planData?.expires_at ?? null;
  const limits    = PLANS[plan] ?? PLANS.free;

  return NextResponse.json({
    plan,
    expiresAt,
    qaUsedToday,
    qaLimit:   limits.qaLimit,
    pdfCount,
    pdfLimit:  limits.pdfLimit,
  });
}
