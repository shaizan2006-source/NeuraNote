import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PLAN_DURATION = { student: 30, pro: 30 };

/**
 * Razorpay Webhook Handler
 *
 * Razorpay sends events to this endpoint for payment lifecycle events.
 * We verify the X-Razorpay-Signature header (HMAC-SHA256 of raw body)
 * using RAZORPAY_WEBHOOK_SECRET, then activate/log the plan accordingly.
 *
 * Events handled:
 *   payment.captured → activate user plan (fallback for missed verify calls)
 *   payment.failed   → log the failure
 *
 * IMPORTANT: Raw body must be read with req.text() BEFORE any JSON parsing,
 * otherwise the HMAC will not match.
 */
export async function POST(req) {
  // 1. Read raw body for signature verification
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing X-Razorpay-Signature" }, { status: 400 });
  }

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("RAZORPAY_WEBHOOK_SECRET env var is not set");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  // 2. Verify signature — prevent spoofed webhook calls
  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  if (expected !== signature) {
    console.warn("Webhook: signature mismatch — rejecting request");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // 3. Parse event
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const eventType = event.event;
  console.log("Razorpay webhook received:", eventType);

  // 4. Handle payment.captured — activate or extend subscription
  if (eventType === "payment.captured") {
    const payment = event.payload?.payment?.entity;
    if (!payment) {
      return NextResponse.json({ error: "Missing payment entity" }, { status: 400 });
    }

    const { notes, id: paymentId, order_id: orderId } = payment;
    // create-order puts user.id under "userId" key
    const userId = notes?.userId;
    const plan   = notes?.plan;

    if (!userId || !plan) {
      // Acknowledge receipt — Razorpay would otherwise retry indefinitely
      console.warn("Webhook: missing userId or plan in notes", { notes });
      return NextResponse.json({ received: true, warning: "Missing userId or plan in notes" });
    }

    if (!PLAN_DURATION[plan]) {
      console.warn("Webhook: unknown plan:", plan);
      return NextResponse.json({ received: true, warning: "Unknown plan" });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + PLAN_DURATION[plan]);

    const { error } = await supabase.from("user_plans").upsert({
      user_id:    userId,
      plan,
      payment_id: paymentId,
      order_id:   orderId,
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    if (error) {
      // Return 500 so Razorpay retries delivery
      console.error("Webhook: DB upsert failed", error);
      return NextResponse.json({ error: "DB update failed" }, { status: 500 });
    }

    console.log(`Webhook: plan activated — user=${userId} plan=${plan} expires=${expiresAt.toISOString()}`);
    return NextResponse.json({ received: true, activated: true });
  }

  // 5. Handle payment.failed — log only
  if (eventType === "payment.failed") {
    const payment = event.payload?.payment?.entity;
    console.warn("Webhook: payment failed", {
      id:    payment?.id,
      error: payment?.error_description,
      user:  payment?.notes?.userId,
    });
    return NextResponse.json({ received: true });
  }

  // 6. Unknown event — acknowledge receipt
  return NextResponse.json({ received: true });
}
