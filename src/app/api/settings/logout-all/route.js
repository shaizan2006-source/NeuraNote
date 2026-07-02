import { NextResponse } from "next/server";
import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";

/**
 * POST /api/settings/logout-all
 * Revokes every session for the authenticated user (global sign-out).
 * Any in-flight request from another tab 401s on its next call.
 */
export async function POST(req) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = (req.headers.get("authorization") || "").slice(7);
  const { error } = await supabaseAdmin.auth.admin.signOut(token, "global");
  if (error) {
    console.error("[logout-all]", error.message);
    return NextResponse.json({ error: "Failed to sign out sessions" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
