import { NextResponse } from "next/server";
import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";
import { dispatchWhatsApp } from "@/lib/whatsapp/dispatch";
import { trackEvent, EVENTS } from "@/lib/telemetry/events";

// S4 fix: max 3 parent-referral sends per user per calendar day (IST)
const DAILY_SEND_LIMIT = 3;

export async function POST(req) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  // Accept a supplied phone number (from modal) or fall back to profile
  let parentPhone = body.parent_phone_number ?? null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, parent_phone_number")
    .eq("id", user.id)
    .maybeSingle();

  if (!parentPhone) parentPhone = profile?.parent_phone_number ?? null;

  if (!parentPhone) {
    return NextResponse.json({ error: "parent_phone_required" }, { status: 400 });
  }

  // S4 fix: rate limit — check how many non-failed sends this calendar day (IST)
  const todayIST = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  ).toISOString().slice(0, 10);

  const { count: todaySendCount } = await supabaseAdmin
    .from("whatsapp_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .like("idempotency_key", `parent_referral_${user.id}_${todayIST}_%`)
    .neq("status", "failed");

  if ((todaySendCount ?? 0) >= DAILY_SEND_LIMIT) {
    return NextResponse.json(
      { error: "Daily limit reached. Try again tomorrow." },
      { status: 429 }
    );
  }

  // Save the phone if it was newly provided
  if (body.parent_phone_number && body.parent_phone_number !== profile?.parent_phone_number) {
    await supabaseAdmin
      .from("profiles")
      .update({ parent_phone_number: parentPhone, updated_at: new Date().toISOString() })
      .eq("id", user.id);
  }

  // Generate payment link (Phase 6 adds JWT signing + expiry)
  const paymentLink = `${process.env.NEXT_PUBLIC_APP_URL}/parent-pay?user=${user.id}&utm_source=parent_referral`;

  const studentName = (profile?.full_name ?? "your child").split(" ")[0];

  // S4 fix: idempotency key is per-user per-day per-sequence number.
  // Prevents double-send on network retry; daily rate limit above caps abuse.
  const seq = (todaySendCount ?? 0) + 1;
  const idempotencyKey = `parent_referral_${user.id}_${todayIST}_${seq}`;

  const waResult = await dispatchWhatsApp({
    userId: user.id,
    phoneNumber: parentPhone,
    templateName: "parent_referral_hinglish",
    variables: { "1": studentName, "2": paymentLink },
    idempotencyKey,
  });

  await trackEvent(user.id, EVENTS.PARENT_REFERRAL_SENT, {
    parent_phone_set: true,
    whatsapp_ok: waResult.ok,
  });

  if (!waResult.ok) {
    return NextResponse.json({ error: "Failed to send WhatsApp. Try again." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
