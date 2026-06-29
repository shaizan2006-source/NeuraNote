import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/serverAuth";
import { trackEvent, EVENTS } from "@/lib/telemetry/events";

// ─────────────────────────────────────────────────────────────
// GET  — Meta webhook verification handshake
// ─────────────────────────────────────────────────────────────
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  // S5 fix: reject if env var is not configured (prevents undefined === undefined bypass)
  if (!expected) {
    console.error("[whatsapp/webhook] WHATSAPP_VERIFY_TOKEN is not configured");
    return new Response("Forbidden", { status: 403 });
  }

  if (mode === "subscribe" && token === expected) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

// ─────────────────────────────────────────────────────────────
// POST — inbound delivery status updates + reply messages
// ─────────────────────────────────────────────────────────────
export async function POST(req) {
  // S1 fix: read raw body FIRST, then verify HMAC before parsing
  let rawBody;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: "Could not read body" }, { status: 400 });
  }

  if (!verifyProviderSignature(req, rawBody)) {
    console.warn("[whatsapp/webhook] signature verification failed — rejecting");
    return new Response("Forbidden", { status: 403 });
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // AiSensy, Gupshup, and Interakt each wrap differently.
  const events = normaliseWebhookPayload(body);

  for (const event of events) {
    await handleEvent(event).catch((err) =>
      console.error("[whatsapp/webhook] event handler error", err.message)
    );
  }

  // Always return 200 quickly — providers retry on non-2xx
  return NextResponse.json({ received: true });
}

// ─────────────────────────────────────────────────────────────
// S1 fix: Provider-specific HMAC signature verification
// ─────────────────────────────────────────────────────────────

function verifyProviderSignature(req, rawBody) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  const provider  = process.env.WHATSAPP_PROVIDER || "aisensy";

  // No secret configured — block in production, warn in dev
  if (!appSecret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[whatsapp/webhook] WHATSAPP_APP_SECRET not set — blocking in production");
      return false;
    }
    console.warn("[whatsapp/webhook] WHATSAPP_APP_SECRET not set — allowing in dev");
    return true;
  }

  if (provider === "aisensy") {
    // AiSensy uses Meta's format: X-Hub-Signature-256: sha256=<HMAC-SHA256(appSecret, rawBody)>
    const sig = req.headers.get("x-hub-signature-256") ?? "";
    if (!sig.startsWith("sha256=")) return false;
    const expected = "sha256=" + createHmac("sha256", appSecret).update(rawBody).digest("hex");
    return safeBytesEqual(sig, expected);
  }

  if (provider === "gupshup") {
    // Gupshup signs with HMAC-SHA256, header: X-Gupshup-Signature
    const sig = req.headers.get("x-gupshup-signature") ?? "";
    const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
    return safeBytesEqual(sig, expected);
  }

  if (provider === "interakt") {
    // Interakt: X-Interakt-Signature (HMAC-SHA256, hex)
    const sig = req.headers.get("x-interakt-signature") ?? "";
    const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
    return safeBytesEqual(sig, expected);
  }

  console.warn("[whatsapp/webhook] unknown provider, rejecting:", provider);
  return false;
}

/** Constant-time buffer comparison — throws if different lengths, returns false on mismatch */
function safeBytesEqual(a, b) {
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    // Buffer lengths differ — definitively not equal
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// Event handler
// ─────────────────────────────────────────────────────────────

async function handleEvent(event) {
  const { type, messageId, phoneNumber, status, replyText } = event;

  if (type === "status_update" && messageId && status) {
    await supabaseAdmin
      .from("whatsapp_messages")
      .update({ status, status_updated_at: new Date().toISOString() })
      .eq("provider_message_id", messageId);
    return;
  }

  if (type === "inbound_message" && phoneNumber && replyText) {
    const normalised = replyText.trim().toUpperCase();

    // Look up user by phone_number
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("phone_number", phoneNumber)
      .maybeSingle();

    const userId = profile?.id ?? null;

    // Handle STOP — opt out immediately
    if (normalised === "STOP") {
      if (userId) {
        await supabaseAdmin
          .from("profiles")
          .update({ whatsapp_opt_in: false, updated_at: new Date().toISOString() })
          .eq("id", userId);
        // S2 fix: no phone_number in properties — user_id is sufficient for audit
        await trackEvent(userId, EVENTS.WHATSAPP_REPLY_RECEIVED, {
          reply: "STOP",
          action: "opted_out",
        });
      } else {
        // S4 fix: phone not in our DB — log without PII, don't store orphan events
        console.log("[whatsapp/webhook] STOP from unknown phone — not stored");
      }
      return;
    }

    // S4 fix: only track events for known users — prevents orphan rows with null user_id
    if (!userId) {
      console.log("[whatsapp/webhook] inbound message from unknown phone — ignored");
      return;
    }

    if (normalised === "YES") {
      // S2 fix: no phone_number in properties
      await trackEvent(userId, EVENTS.WHATSAPP_REPLY_RECEIVED, {
        reply: "YES",
        action: "requested_payment_link",
      });
      return;
    }

    // Unknown reply — log for manual review (no phone_number per PII policy)
    await trackEvent(userId, EVENTS.WHATSAPP_REPLY_RECEIVED, {
      reply: replyText.slice(0, 200),
      action: "manual_review_required",
    });
  }
}

// ─────────────────────────────────────────────────────────────
// Payload normalisers — each provider has a different shape
// ─────────────────────────────────────────────────────────────

function normaliseWebhookPayload(body) {
  const provider = process.env.WHATSAPP_PROVIDER || "aisensy";

  if (provider === "aisensy") return normaliseAisensy(body);
  if (provider === "gupshup")  return normaliseGupshup(body);
  if (provider === "interakt") return normaliseInterakt(body);

  console.warn("[whatsapp/webhook] unknown provider, skipping:", provider);
  return [];
}

function normaliseAisensy(body) {
  const events = [];
  const entries = body?.entry ?? [];

  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};

      for (const status of value.statuses ?? []) {
        events.push({
          type: "status_update",
          messageId: status.id,
          phoneNumber: status.recipient_id ? `+${status.recipient_id}` : null,
          status: mapDeliveryStatus(status.status),
        });
      }

      for (const msg of value.messages ?? []) {
        events.push({
          type: "inbound_message",
          messageId: msg.id,
          phoneNumber: msg.from ? `+${msg.from}` : null,
          replyText: msg.text?.body ?? msg.button?.text ?? "",
        });
      }
    }
  }

  return events;
}

function normaliseGupshup(body) {
  if (body.type === "message-event") {
    return [{
      type: "status_update",
      messageId: body.payload?.id,
      phoneNumber: body.payload?.destination ? `+${body.payload.destination}` : null,
      status: mapDeliveryStatus(body.payload?.type),
    }];
  }

  if (body.type === "message") {
    return [{
      type: "inbound_message",
      phoneNumber: body.payload?.sender?.phone ? `+${body.payload.sender.phone}` : null,
      replyText: body.payload?.payload?.text ?? body.payload?.payload?.title ?? "",
    }];
  }

  return [];
}

function normaliseInterakt(body) {
  const events = [];

  if (body.type === "whatsapp" && body.data?.message?.type === "text") {
    // S6 fix: normalize phone — strip any existing +91/91 prefix before adding +91
    const rawPhone = body.data?.customer?.phone_number ?? null;
    let phoneNumber = null;
    if (rawPhone) {
      const digits = String(rawPhone).replace(/^\+?91/, "");
      phoneNumber = digits.length === 10 ? `+91${digits}` : null;
    }

    events.push({
      type: "inbound_message",
      phoneNumber,
      replyText: body.data.message.text?.body ?? "",
    });
  }

  return events;
}

// E8 + E9 fix: deduplicated map, returns "unknown" for unmapped statuses
// (previously returned "sent" for unknown values — corrupts delivery tracking)
function mapDeliveryStatus(raw) {
  const map = {
    sent:        "sent",
    delivered:   "delivered",
    read:        "read",
    failed:      "failed",
    undelivered: "failed",
    enqueued:    "sent",   // Gupshup
  };
  return map[raw] ?? "unknown";
}
