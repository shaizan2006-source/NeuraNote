import { NextResponse } from "next/server";
import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";

export async function POST(req) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { documentId } = body ?? {};
  if (!documentId || typeof documentId !== "string") {
    return NextResponse.json({ error: "documentId required" }, { status: 400 });
  }

  // Verify ownership before deleting — prevent any user deleting another's document
  const { data: doc, error: fetchErr } = await supabaseAdmin
    .from("documents")
    .select("id, user_id")
    .eq("id", documentId)
    .maybeSingle();

  if (fetchErr) {
    console.error("[delete-document] fetch error:", fetchErr.message);
    return NextResponse.json({ error: "Failed to verify ownership" }, { status: 500 });
  }
  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (doc.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await supabaseAdmin.from("document_chunks").delete().eq("document_id", documentId);
    await supabaseAdmin.from("documents").delete().eq("id", documentId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[delete-document] delete error:", err.message);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
