import { NextResponse } from "next/server";
import crypto from "crypto";
import Razorpay from "razorpay";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Plan durations in days
const PLAN_DURATION = { student: 30, pro: 30 };

export async function POST(req) {
  try {
    // Auth
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    // Verify signature
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // F-012: derive the tier from the SERVER-SET Razorpay order notes, never from the
    // client. The signature only covers order|payment, so trusting a client `plan` let a
    // user pay for a cheap order and claim an expensive tier. Also confirm the order
    // belongs to this user.
    const rzp = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
    let order;
    try {
      order = await rzp.orders.fetch(razorpay_order_id);
    } catch {
      return NextResponse.json({ error: "Order not found" }, { status: 400 });
    }
    if (order?.notes?.userId !== user.id) {
      return NextResponse.json({ error: "Order does not belong to this user" }, { status: 403 });
    }
    const plan = order?.notes?.plan;
    if (!plan || !PLAN_DURATION[plan]) {
      return NextResponse.json({ error: "Unknown plan on order" }, { status: 400 });
    }

    // Activate subscription
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (PLAN_DURATION[plan] || 30));

    // F-013: never report success if the entitlement write fails (money taken, no access).
    const { error: grantErr } = await supabase.from("user_plans").upsert({
      user_id:    user.id,
      plan,
      payment_id: razorpay_payment_id,
      order_id:   razorpay_order_id,
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    if (grantErr) {
      console.error("verify: entitlement upsert failed", grantErr);
      return NextResponse.json({ error: "Payment captured but activation failed — please contact support" }, { status: 500 });
    }

    return NextResponse.json({ success: true, plan, expiresAt: expiresAt.toISOString() });
  } catch (err) {
    console.error("verify error:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
