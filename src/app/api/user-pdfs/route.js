import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("user_id");
  if (!user_id) return NextResponse.json([], { status: 400 });

  // Get PDFs + active PDF id from profiles
  const [pdfsRes, profileRes] = await Promise.all([
    supabase
      .from("pdfs_metadata")
      .select("id, name, created_at")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("active_pdf_id")
      .eq("id", user_id)
      .single(),
  ]);

  const pdfs = pdfsRes.data || [];
  const activePdfId = profileRes.data?.active_pdf_id ?? null;

  const result = pdfs.map(p => ({ ...p, is_active: p.id === activePdfId }));
  return NextResponse.json(result);
}

export async function PUT(req) {
  try {
    const { user_id, pdf_id } = await req.json();
    if (!user_id) return NextResponse.json({ error: "Missing user_id" }, { status: 400 });

    await supabase
      .from("profiles")
      .update({ active_pdf_id: pdf_id ?? null })
      .eq("id", user_id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
