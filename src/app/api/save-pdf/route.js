import { NextResponse } from "next/server";
import { verifyAuth, supabaseAdmin as supabase } from "@/lib/serverAuth";

export async function POST(req) {
  try {
    const user = await verifyAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const filePath = `pdfs/${Date.now()}-${file.name}`;

    // ✅ Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("pdfs")
      .upload(filePath, buffer, { contentType: file.type });

    if (uploadError) throw uploadError;

    // 🔥 PROCESS PDF (IMPORTANT)
    const baseUrl = req.headers.get("origin") || "http://localhost:3000";

const processRes = await fetch(`${baseUrl}/api/process-pdf`, {
  method: "POST",
  body: formData,
});

    const processData = await processRes.json();

    const documentId = processData.documentId;

    // ✅ Save metadata WITH documentId
    const { data, error } = await supabase
      .from("pdfs_metadata")
      .insert([
        {
          name: file.name,
          path: filePath,
          document_id: documentId,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}