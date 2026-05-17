import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";
import { generateHandle } from "@/lib/cohorts/handles";

export async function POST(req) {
  const user = await verifyAuth(req);
  if (!user) return new Response(null, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles").select("cohort_id").eq("id", user.id).maybeSingle();

  if (!profile?.cohort_id) return Response.json({ error: "No cohort assigned" }, { status: 400 });

  const { data: member } = await supabaseAdmin
    .from("cohort_members")
    .select("display_handle, handle_regenerated_at")
    .eq("cohort_id", profile.cohort_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (member?.handle_regenerated_at) {
    return Response.json({ error: "Handle can only be regenerated once" }, { status: 400 });
  }

  let newHandle;
  for (let attempt = 0; attempt < 5; attempt++) {
    newHandle = generateHandle();
    const { error } = await supabaseAdmin.from("cohort_members").update({
      display_handle: newHandle,
      handle_regenerated_at: new Date().toISOString(),
    }).eq("cohort_id", profile.cohort_id).eq("user_id", user.id);
    if (!error) break;
  }

  return Response.json({ handle: newHandle });
}
