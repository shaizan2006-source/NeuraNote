import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Stores PDF file + metadata only — no parsing, no embeddings.
// Parsing is triggered separately via /api/parse-pdf when the user activates the PDF.
export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const userId = formData.get("userId");

    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
    if (!userId) return NextResponse.json({ error: "No userId" }, { status: 400 });
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Must be a PDF" }, { status: 400 });
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 20MB)" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = `${userId}/${Date.now()}-${file.name}`;

    // Upload to storage
    const { error: storageError } = await supabase.storage
      .from("documents")
      .upload(filePath, buffer, { contentType: "application/pdf" });

    if (storageError) throw storageError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("documents")
      .getPublicUrl(filePath);

    // Insert metadata row — no subject, no chunks yet
    const { data: doc, error: dbError } = await supabase
      .from("documents")
      .insert({ user_id: userId, name: file.name, file_url: publicUrl })
      .select("id, name")
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({ id: doc.id, name: doc.name });
  } catch (err) {
    console.error("STORE PDF ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
