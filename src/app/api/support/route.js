// src/app/api/support/route.js
import { NextResponse } from "next/server";
import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";

export async function POST(req) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.subject || !body?.message) {
    return NextResponse.json({ error: "subject and message required" }, { status: 400 });
  }

  const subject = String(body.subject).slice(0, 100);
  const message = String(body.message).slice(0, 4000);

  const { error } = await supabaseAdmin.from("support_requests").insert({
    user_id: user.id,
    subject,
    message,
  });

  if (error) {
    console.error("[support POST]", error.message);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
