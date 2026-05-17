import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";

export async function GET(req) {
  const user = await verifyAuth(req);
  if (!user) return new Response(null, { status: 401 });

  const { data: plan } = await supabaseAdmin
    .from("user_plans")
    .select("plan, trial_ends_at, payment_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!plan || !plan.trial_ends_at) {
    return Response.json({ is_trial: false, days_remaining: 0, expires_at: null });
  }

  const now = new Date();
  const expires = new Date(plan.trial_ends_at);
  const msLeft = expires - now;
  const daysLeft = Math.max(0, Math.ceil(msLeft / 86_400_000));
  const isPaidPlan = !!plan.payment_id;

  return Response.json({
    is_trial: !isPaidPlan && plan.plan === "pro" && msLeft > 0,
    days_remaining: daysLeft,
    expires_at: plan.trial_ends_at,
  });
}
