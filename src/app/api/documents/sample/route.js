import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";

const SAMPLE_PDF_PATH = "sample-pdfs/jee-physics-rotational-mechanics.pdf";
const SAMPLE_PDF_NAME = "Sample — Rotational Mechanics (JEE Physics)";

export async function POST(req) {
  const user = await verifyAuth(req);
  if (!user) return new Response(null, { status: 401 });

  // Don't give the sample if they already have documents
  const { count } = await supabaseAdmin
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (count > 0) {
    return Response.json({ skipped: true, reason: "User already has documents" });
  }

  const newDocId = crypto.randomUUID();
  const destPath = `${user.id}/${newDocId}/sample.pdf`;

  const { error: copyErr } = await supabaseAdmin.storage
    .from("user-pdfs")
    .copy(SAMPLE_PDF_PATH, destPath);

  if (copyErr) {
    console.error("[sample] storage copy failed:", copyErr.message);
    return Response.json({ error: "Sample PDF unavailable" }, { status: 503 });
  }

  const { data: urlData } = supabaseAdmin.storage.from("user-pdfs").getPublicUrl(destPath);

  await supabaseAdmin.from("documents").insert({
    id: newDocId,
    user_id: user.id,
    name: SAMPLE_PDF_NAME,
    file_url: urlData.publicUrl,
    processing_status: "uploading",
    processing_progress: 0,
  });

  return Response.json({ documentId: newDocId });
}
