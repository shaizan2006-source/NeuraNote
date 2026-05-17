import { supabaseAdmin } from "@/lib/serverAuth";

export async function GET(req) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) return new Response(null, { status: 401 });

  const now = new Date().toISOString();

  // Find expired photo doubts
  const { data: expired } = await supabaseAdmin
    .from("photo_doubts")
    .select("id, user_id, image_url")
    .lt("delete_after", now);

  let deleted = 0;
  for (const row of expired ?? []) {
    try {
      // Delete storage file
      const path = `${row.user_id}/${row.id}.jpg`;
      await supabaseAdmin.storage.from("photo-doubts").remove([path]);
      // Delete DB row
      await supabaseAdmin.from("photo_doubts").delete().eq("id", row.id);
      deleted++;
    } catch (err) {
      console.error(`[cleanup-photo-doubts] ${row.id}:`, err.message);
    }
  }

  return Response.json({ ok: true, deleted });
}
