import { NextResponse } from "next/server";
import { verifyAuth, supabaseAdmin as supabase } from "@/lib/serverAuth";

export async function GET(req) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get PDFs + active PDF id from profiles — scoped to authenticated user
  const [pdfsRes, profileRes] = await Promise.all([
    supabase
      .from("documents")
      .select("id, name, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("active_pdf_id")
      .eq("id", user.id)
      .single(),
  ]);

  const pdfs = pdfsRes.data || [];
  const activePdfId = profileRes.data?.active_pdf_id ?? null;

  const result = pdfs.map(p => ({ ...p, is_active: p.id === activePdfId }));
  return NextResponse.json(result);
}

export async function PATCH(req) {
  try {
    const user = await verifyAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, name } = await req.json();
    if (!id || !name?.trim()) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const { error } = await supabase
      .from("documents")
      .update({ name: name.trim() })
      .eq("id", id)
      .eq("user_id", user.id);  // enforces ownership
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const user = await verifyAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { pdf_id } = await req.json();

    await supabase
      .from("profiles")
      .update({ active_pdf_id: pdf_id ?? null })
      .eq("id", user.id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
