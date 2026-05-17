import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";

function generateCode() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export async function POST(req) {
  const user = await verifyAuth(req);
  if (!user) return new Response(null, { status: 401 });

  const { role } = await req.json(); // 'child' | 'parent'
  if (!["child", "parent"].includes(role)) return Response.json({ error: "Invalid role" }, { status: 400 });

  // Verify user has family tier
  const { data: plan } = await supabaseAdmin.from("user_plans").select("plan, family_role").eq("user_id", user.id).maybeSingle();
  if (plan?.plan !== "family" && plan?.family_role !== "primary") {
    return Response.json({ error: "Family tier required" }, { status: 403 });
  }

  // Count existing children (max 2)
  if (role === "child") {
    const { count } = await supabaseAdmin
      .from("user_plans")
      .select("user_id", { count: "exact", head: true })
      .eq("family_primary_id", user.id)
      .eq("family_role", "child");
    if ((count ?? 0) >= 2) return Response.json({ error: "Maximum 2 children per family plan" }, { status: 400 });
  }

  const code = generateCode();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://askmynotes.in";

  await supabaseAdmin.from("family_invites").insert({
    primary_user_id: user.id,
    invite_code: code,
    role,
  });

  return Response.json({ invite_link: `${appUrl}/family/invite/${code}`, code, role });
}
