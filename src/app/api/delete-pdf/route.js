import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  const { data: pdf } = await supabase
    .from("pdfs_metadata")
    .select("*")
    .eq("id", id)
    .single();

  await supabase.storage.from("pdfs").remove([pdf.path]);
  await supabase.from("pdfs_metadata").delete().eq("id", id);

  return NextResponse.json({ success: true });
}