import { NextResponse } from "next/server";
import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "shaizan2006@gmail.com")
  .split(",").map(e => e.trim());

const STATUSES = ["open", "in_progress", "resolved"];

async function requireAdmin(req) {
  const user = await verifyAuth(req);
  if (!user || !ADMIN_EMAILS.includes(user.email)) return null;
  return user;
}

/** GET /api/admin/tickets?status=open — all tickets, newest first. */
export async function GET(req) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  let query = supabaseAdmin
    .from("support_requests")
    .select("id, user_id, subject, message, category, status, screenshot_url, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (STATUSES.includes(status)) query = query.eq("status", status);

  const { data: tickets, error } = await query;
  if (error) {
    console.error("[admin/tickets GET]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Attach reporter emails (profiles.email) in one query
  const userIds = [...new Set((tickets ?? []).map(t => t.user_id))];
  const emailMap = new Map();
  if (userIds.length > 0) {
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .in("id", userIds);
    for (const p of profiles ?? []) emailMap.set(p.id, p.email);
  }

  return NextResponse.json(
    (tickets ?? []).map(t => ({ ...t, email: emailMap.get(t.user_id) ?? null }))
  );
}

/** PATCH /api/admin/tickets — body {id, status}. Status updates are admin-only. */
export async function PATCH(req) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.id || !STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "id and valid status required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("support_requests")
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq("id", body.id);

  if (error) {
    console.error("[admin/tickets PATCH]", error.message);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
