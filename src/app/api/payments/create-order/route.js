import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";
import { getAmount, computeExpiry } from "@/lib/pricing";

export async function POST(req) {
  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  try {
    const user = await verifyAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { plan, cycle = "monthly" } = await req.json();
    const amount = getAmount(plan, cycle);
    if (!amount) return NextResponse.json({ error: "Invalid plan or cycle" }, { status: 400 });

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `rcpt_${user.id.slice(0, 8)}_${Date.now()}`,
      notes: { userId: user.id, plan, cycle },
    });

    // Store order metadata for webhook lookup
    await supabaseAdmin.from("payment_orders").upsert({
      order_id: order.id,
      user_id: user.id,
      tier: plan,
      cycle,
      amount,
      created_at: new Date().toISOString(),
    }, { onConflict: "order_id" }).catch(() => {}); // table may not exist yet — non-fatal

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
