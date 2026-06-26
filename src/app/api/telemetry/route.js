import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/serverAuth";

/**
 * Client-side growth telemetry sink.
 * Exists so "use client" components can record growth_events without importing
 * serverAuth (which carries the service-role key and crashes in the browser).
 * Low-sensitivity analytics — intentionally unauthenticated and fire-and-forget.
 */
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { userId, eventName, properties } = body || {};
  if (!eventName || typeof eventName !== "string") {
    return NextResponse.json({ error: "eventName required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("growth_events").insert({
    user_id: userId ?? null,
    event_name: eventName,
    properties: properties ?? {},
  });

  if (error) {
    console.error("[telemetry] insert failed", eventName, error.message);
    return NextResponse.json({ error: "Failed to record" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
