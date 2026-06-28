import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";
import { getAmount, computeExpiry } from "@/lib/pricing";

// A/B test variant → paise amounts for Pro plan
const AB_VARIANT_PAISE = {
  a: { monthly: 19900,  yearly: 159900 },
  b: { monthly: 39900,  yearly: 299900 },
  c: { monthly: 49900,  yearly: 399900 },
};

export async function POST(req) {
  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  try {
    const user = await verifyAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { plan, cycle = "monthly" } = await req.json();

    // For the Pro plan during an active A/B test, use the server-stored variant price.
    // The price is NEVER taken from the client — it's derived from the user's DB record.
    let amount;
    const testEpoch = process.env.AB_TEST_PRICING_EPOCH ?? null;
    if (plan === "pro" && testEpoch) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("pricing_variant, pricing_ab_test")
        .eq("id", user.id)
        .maybeSingle();

      const variantKey = (profile?.pricing_ab_test === testEpoch && profile?.pricing_variant)
        ? profile.pricing_variant
        : "b"; // fallback to control

      amount = AB_VARIANT_PAISE[variantKey]?.[cycle] ?? getAmount(plan, cycle);
    } else {
      amount = getAmount(plan, cycle);
    }

    if (!amount) return NextResponse.json({ error: "Invalid plan or cycle" }, { status: 400 });

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `rcpt_${user.id.slice(0, 8)}_${Date.now()}`,
      notes: { userId: user.id, plan, cycle },
    });

    // Store order metadata for webhook lookup. The supabase-js builder is a
    // thenable, not a Promise — it has no .catch(), so calling .catch() threw a
    // TypeError and 500'd every create-order. Await it and check the returned error.
    const { error: orderStoreErr } = await supabaseAdmin.from("payment_orders").upsert({
      order_id: order.id,
      user_id: user.id,
      tier: plan,
      cycle,
      amount,
      created_at: new Date().toISOString(),
    }, { onConflict: "order_id" });
    if (orderStoreErr) console.warn("create-order: payment_orders upsert non-fatal:", orderStoreErr.message);

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("create-order error:", err);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
