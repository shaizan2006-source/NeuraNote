import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  const { documentId } = await req.json();

  if (!documentId) {
    return NextResponse.json({ error: "documentId required" }, { status: 400 });
  }

  await supabase
    .from("document_chunks")
    .delete()
    .eq("document_id", documentId);

  await supabase
    .from("documents")
    .delete()
    .eq("id", documentId);

  return NextResponse.json({ success: true });
}