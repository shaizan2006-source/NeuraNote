import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/serverAuth";
import { PLANS, getUserPlan, countTodayQA, countUserPDFs } from "@/lib/planLimits";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // getUserPlan applies expiry + trial logic — use it as the source of truth for plan tier.
  // The raw user_plans query is only needed for expires_at, which getUserPlan doesn't expose.
  const [plan, qaUsedToday, pdfCount] = await Promise.all([
    getUserPlan(user.id),
    countTodayQA(user.id),
    countUserPDFs(user.id),
  ]);

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const { data: planData } = await sb
    .from("user_plans")
    .select("expires_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const expiresAt = planData?.expires_at ?? null;
  const limits    = PLANS[plan] ?? PLANS.free;

  return NextResponse.json({
    plan,
    expiresAt,
    qaUsedToday,
    qaLimit:  limits.qaLimit,
    pdfCount,
    pdfLimit: limits.pdfLimit,
  });
}
