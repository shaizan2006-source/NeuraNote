import { NextResponse } from "next/server";
import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";

export async function DELETE(req) {
  const user = await verifyAuth(req);
  if (!user) return new NextResponse(null, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return new NextResponse(null, { status: 400 });

  const { data: doc } = await supabaseAdmin
    .from("documents")
    .select("id, user_id, file_url")
    .eq("id", id)
    .single();

  // Return 404 for both not-found and wrong-owner (prevents enumeration)
  if (!doc || doc.user_id !== user.id) return new NextResponse(null, { status: 404 });

  // Delete document_chunks (FK ON DELETE CASCADE should handle this; belt-and-suspenders)
  await supabaseAdmin.from("document_chunks").delete().eq("document_id", id);

  // Delete the document row
  await supabaseAdmin.from("documents").delete().eq("id", id);

  // Delete storage files (non-fatal if it fails)
  try {
    const filePath = `${user.id}/${id}`;
    const { data: files } = await supabaseAdmin.storage.from("documents").list(filePath);
    if (files && files.length > 0) {
      const paths = files.map((f) => `${filePath}/${f.name}`);
      await supabaseAdmin.storage.from("documents").remove(paths);
    }
  } catch (err) {
    console.error("[delete-pdf] storage cleanup failed:", err.message);
  }

  return NextResponse.json({ deleted: true });
}