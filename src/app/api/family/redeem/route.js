import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";

export async function POST(req) {
  const user = await verifyAuth(req);
  if (!user) return new Response(null, { status: 401 });

  const { code } = await req.json();
  if (!code) return Response.json({ error: "code required" }, { status: 400 });

  const { data: invite } = await supabaseAdmin
    .from("family_invites")
    .select("*")
    .eq("invite_code", code)
    .maybeSingle();

  if (!invite) return Response.json({ error: "Invalid invite code" }, { status: 404 });
  if (invite.used_by) return Response.json({ error: "Invite already used" }, { status: 400 });
  if (new Date(invite.expires_at) < new Date()) return Response.json({ error: "Invite expired" }, { status: 400 });

  // Redeem
  await supabaseAdmin.from("family_invites").update({
    used_by: user.id,
    used_at: new Date().toISOString(),
  }).eq("invite_code", code);

  await supabaseAdmin.from("user_plans").upsert({
    user_id: user.id,
    plan: "pro",
    family_role: invite.role,
    family_primary_id: invite.primary_user_id,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  return Response.json({ redeemed: true, role: invite.role });
}
