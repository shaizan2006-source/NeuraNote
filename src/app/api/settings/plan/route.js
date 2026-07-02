import { NextResponse } from "next/server";
import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";
import { PLANS, getUserPlan, countTodayQA, countUserPDFs } from "@/lib/planLimits";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [plan, qaUsedToday, pdfCount] = await Promise.all([
    getUserPlan(user.id),
    countTodayQA(user.id),
    countUserPDFs(user.id),
  ]);

  const { data: planData } = await supabaseAdmin
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
