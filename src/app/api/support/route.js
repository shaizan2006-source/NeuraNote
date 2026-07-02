// src/app/api/support/route.js
import { NextResponse } from "next/server";
import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";
import { normalizeCategory, validScreenshotPath } from "@/lib/supportValidation";
import { FLAGS, flagDisabledResponse } from "@/lib/featureFlags";

export async function POST(req) {
  if (!FLAGS.SUPPORT) return flagDisabledResponse();

  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.subject || !body?.message) {
    return NextResponse.json({ error: "subject and message required" }, { status: 400 });
  }

  const subject  = String(body.subject).slice(0, 100);
  const message  = String(body.message).slice(0, 4000);
  const category = normalizeCategory(body.category ?? body.subject);
  const screenshot_url = validScreenshotPath(body.screenshot_url, user.id)
    ? body.screenshot_url
    : null;

  const { data, error } = await supabaseAdmin
    .from("support_requests")
    .insert({ user_id: user.id, subject, message, category, screenshot_url })
    .select("id")
    .single();

  if (error) {
    console.error("[support POST]", error.message);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}

export async function GET(req) {
  if (!FLAGS.SUPPORT) return flagDisabledResponse();

  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("support_requests")
    .select("id, subject, category, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[support GET]", error.message);
    return NextResponse.json([], { status: 200 });
  }
  return NextResponse.json(data || []);
}
