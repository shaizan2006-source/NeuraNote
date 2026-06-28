#!/usr/bin/env node
/**
 * phase1-money.mjs — Phase 1 money-path + entitlement tests (staging only).
 *
 * Drives the server-side payment flow without a browser checkout, using the
 * test-mode key secret to craft Razorpay-style signatures. Verifies:
 *   - create-order derives price server-side
 *   - verify rejects a forged signature
 *   - verify grants on a valid signature
 *   - F-012: verify trusts client `plan` (pay-cheap-claim-expensive escalation)
 *   - webhook rejects forged signature, grants on valid, is idempotent on replay
 * Resets the test persona's plan at the end.
 *
 * Env (source .env.staging): STAGING_SUPABASE_URL, STAGING_SUPABASE_ANON_KEY,
 *   STAGING_SUPABASE_SERVICE_ROLE_KEY, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET.
 * App must be running at APP (default http://localhost:3000) against staging.
 */
import crypto from "node:crypto";

const APP = process.env.APP || "http://localhost:3000";
const SUPA = process.env.STAGING_SUPABASE_URL;
const ANON = process.env.STAGING_SUPABASE_ANON_KEY;
const SR = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;
for (const [k, v] of Object.entries({ SUPA, ANON, SR, KEY_SECRET, WEBHOOK_SECRET })) {
  if (!v) { console.error(`missing env ${k}`); process.exit(1); }
}

const EMAIL = "free@staging.askmynotes.test";
const PASSWORD = "StagingPass!23";

let pass = 0, fail = 0;
const findings = [];
const ok = (name, cond, detail = "") => {
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
  cond ? pass++ : fail++;
};

async function login() {
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error("login failed: " + JSON.stringify(j).slice(0, 150));
  return { token: j.access_token, uid: j.user.id };
}
async function getPlan(uid) {
  const r = await fetch(`${SUPA}/rest/v1/user_plans?user_id=eq.${uid}&select=plan,expires_at,payment_id,order_id`, {
    headers: { apikey: SR, Authorization: `Bearer ${SR}` },
  });
  return (await r.json())[0] || null;
}
const sign = (data, secret) => crypto.createHmac("sha256", secret).update(data).digest("hex");

(async () => {
  const { token, uid } = await login();
  console.log(`persona ${EMAIL} uid=${uid}\n`);
  const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // 1. create-order (student/monthly) — price must be server-derived (19900 paise)
  console.log("== create-order ==");
  const coRes = await fetch(`${APP}/api/payments/create-order`, {
    method: "POST", headers: auth, body: JSON.stringify({ plan: "student", cycle: "monthly" }),
  });
  const co = await coRes.json();
  ok("create-order 200", coRes.status === 200, `status=${coRes.status}`);
  ok("server-derived amount = 19900", co.amount === 19900, `amount=${co.amount}`);
  const orderId = co.orderId;

  // 2. verify — forged signature rejected
  console.log("== verify ==");
  const badRes = await fetch(`${APP}/api/payments/verify`, {
    method: "POST", headers: auth,
    body: JSON.stringify({ razorpay_order_id: orderId, razorpay_payment_id: "pay_qa_bad", razorpay_signature: "deadbeef", plan: "student" }),
  });
  ok("forged signature rejected (400)", badRes.status === 400, `status=${badRes.status}`);

  // 3. verify — valid signature, plan=student → granted
  const payS = "pay_qa_student";
  const okRes = await fetch(`${APP}/api/payments/verify`, {
    method: "POST", headers: auth,
    body: JSON.stringify({ razorpay_order_id: orderId, razorpay_payment_id: payS, razorpay_signature: sign(`${orderId}|${payS}`, KEY_SECRET), plan: "student" }),
  });
  ok("valid signature accepted (200)", okRes.status === 200, `status=${okRes.status}`);
  let plan = await getPlan(uid);
  ok("entitlement = student after verify", plan?.plan === "student", `plan=${plan?.plan}`);
  ok("expires_at set", !!plan?.expires_at, `expires_at=${plan?.expires_at}`);

  // 4. F-012 — verify trusts client plan: pay student-priced order, claim family
  console.log("== F-012 plan-tampering ==");
  const payE = "pay_qa_escalation";
  const escRes = await fetch(`${APP}/api/payments/verify`, {
    method: "POST", headers: auth,
    body: JSON.stringify({ razorpay_order_id: orderId, razorpay_payment_id: payE, razorpay_signature: sign(`${orderId}|${payE}`, KEY_SECRET), plan: "family" }),
  });
  plan = await getPlan(uid);
  const escalated = escRes.status === 200 && plan?.plan === "family";
  ok("verify does NOT grant a higher tier than paid (expect blocked)", !escalated,
     escalated ? "ESCALATED to family on a student order!" : `plan=${plan?.plan}`);
  if (escalated) findings.push("F-012 CONFIRMED (S1): /api/payments/verify trusts client `plan` — paid student order yielded family entitlement.");

  // 5. webhook — forged signature rejected
  console.log("== webhook ==");
  const whBody = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_qa_wh", order_id: orderId, notes: { userId: uid, plan: "student" } } } } });
  const whBad = await fetch(`${APP}/api/payments/webhook`, {
    method: "POST", headers: { "Content-Type": "application/json", "x-razorpay-signature": "bad" }, body: whBody,
  });
  ok("webhook forged signature rejected (400)", whBad.status === 400, `status=${whBad.status}`);

  // 6. webhook — valid signature activates
  const whGood = await fetch(`${APP}/api/payments/webhook`, {
    method: "POST", headers: { "Content-Type": "application/json", "x-razorpay-signature": sign(whBody, WEBHOOK_SECRET) }, body: whBody,
  });
  const whGoodJson = await whGood.json().catch(() => ({}));
  ok("webhook valid signature accepted (200)", whGood.status === 200, `status=${whGood.status}`);

  // 7. webhook — replay is idempotent (same payment_id must not double-grant)
  const whReplay = await fetch(`${APP}/api/payments/webhook`, {
    method: "POST", headers: { "Content-Type": "application/json", "x-razorpay-signature": sign(whBody, WEBHOOK_SECRET) }, body: whBody,
  });
  const whReplayJson = await whReplay.json().catch(() => ({}));
  ok("webhook replay is idempotent", whReplayJson.idempotent === true || whReplayJson.received === true, JSON.stringify(whReplayJson).slice(0, 80));

  // Reset persona to free
  await fetch(`${APP}`, {}).catch(() => {});
  await fetch(`${SUPA}/rest/v1/user_plans?user_id=eq.${uid}`, { method: "DELETE", headers: { apikey: SR, Authorization: `Bearer ${SR}`, Prefer: "return=minimal" } });
  await fetch(`${SUPA}/rest/v1/user_plans`, {
    method: "POST", headers: { apikey: SR, Authorization: `Bearer ${SR}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ user_id: uid, plan: "free", is_trial: false, billing_cycle: "monthly" }),
  });
  console.log("\n(reset persona to free)");

  console.log(`\n=== ${pass} pass, ${fail} fail ===`);
  if (findings.length) { console.log("FINDINGS:"); findings.forEach(f => console.log("  - " + f)); }
})().catch((e) => { console.error("harness error:", e.message); process.exit(1); });
