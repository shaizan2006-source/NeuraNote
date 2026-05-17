import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";

export async function POST(req) {
  const user = await verifyAuth(req);
  if (!user) return new Response(null, { status: 401 });

  const { reason } = await req.json().catch(() => ({}));

  // Mark cancelled — retain access until billing period end (handled by expires_at)
  const { error } = await supabaseAdmin
    .from("user_plans")
    .update({
      billing_cycle: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) {
    console.error("[subscription/cancel] error:", error.message);
    return Response.json({ error: "Update failed" }, { status: 500 });
  }

  // Log reason for analytics
  if (reason) {
    await supabaseAdmin.from("cancellation_reasons").upsert({
      user_id: user.id,
      reason: reason.slice(0, 500),
      created_at: new Date().toISOString(),
    }, { onConflict: "user_id" }).catch(() => {});
  }

  return Response.json({ cancelled: true, message: "Cancelled. Your data is yours." });
}
