"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// Amounts in paise
const PRICING = {
  student: { monthly: 19900, yearly: 159900 },
  pro:     { monthly: 39900, yearly: 299900 },
  proplus: { monthly: 69900, yearly: 599900 },
};

// Feature flag — matches server-side VOICE_PROPLUS_ENABLED env var.
// Set NEXT_PUBLIC_VOICE_PROPLUS_ENABLED=true in Vercel to show the Pro+ card.
const VOICE_PROPLUS_ENABLED = process.env.NEXT_PUBLIC_VOICE_PROPLUS_ENABLED === "true";

// PLANS is built inside the component (useMemo) so it can react to the A/B variant.
// See buildPlans() below.

function buildPlans(variant) {
  const proMonthly  = variant?.testActive ? variant.prices.monthly : 399;
  const proYearly   = variant?.testActive ? variant.prices.yearly  : 2999;
  const proSaving   = proMonthly * 12 - proYearly;

  return [
    {
      id: "free",
      name: "Free Explorer",
      monthlyPrice: 0,
      yearlyPrice: 0,
      features: [
        "3 PDF uploads",
        "20 questions/day",
        "Brain Map (read-only)",
        "Exam countdown",
        "Basic analytics",
      ],
      cta: "Continue with Free",
    },
    {
      id: "student",
      name: "Student",
      monthlyPrice: 199,
      yearlyPrice: 1599,
      yearlySaving: 789,
      features: [
        "15 PDF uploads",
        "Unlimited questions",
        "Brain Map + mastery tracking",
        "Smart study plan",
        "Weak topic quiz",
        "Spaced repetition cards",
        "Cohort percentile",
      ],
      cta: "Start Student",
    },
    {
      id: "pro",
      name: "Pro",
      monthlyPrice: proMonthly,
      yearlyPrice:  proYearly,
      yearlySaving: proSaving,
      features: [
        "Unlimited PDF uploads",
        "Everything in Student",
        "7-day free trial",
        "Adaptive AI plan",
        "Focus mode (Pomodoro)",
        "Weekly AI recap",
        "Priority responses",
        VOICE_PROPLUS_ENABLED ? "3 voice calls/day" : "15 voice calls/day",
      ],
      cta: "Start Pro",
    },
    ...(VOICE_PROPLUS_ENABLED ? [{
      id: "proplus",
      name: "Pro+",
      monthlyPrice: 699,
      yearlyPrice: 5999,
      yearlySaving: 2389,
      features: [
        "Everything in Pro",
        "Unlimited voice AI tutor",
        "60-min max call duration",
        "Priority response queue",
        "Early access to new features",
      ],
      cta: "Start Pro+",
    }] : []),
  ];
}

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState("");
  const [annual, setAnnual] = useState(true);
  // A/B test variant — null until fetched, 'b' (control) as safe default
  const [variant, setVariant] = useState(null);
  const PLANS = useMemo(() => buildPlans(variant), [variant]);

  useEffect(() => {
    (async () => {
      try {
        const supabase = getSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return; // unauthenticated visitors see default prices
        const res = await fetch("/api/pricing-variant", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setVariant(data);
        }
      } catch { /* non-fatal — fallback to control prices */ }
    })();
  }, []);

  const handlePlanClick = async (plan) => {
    if (plan.id === "free") { router.push("/signup"); return; }

    setError("");
    setLoading(plan.id);

    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push(`/login?redirect=/pricing`); return; }

      const cycle = annual ? "yearly" : "monthly";

      // Create Razorpay order
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan: plan.id, cycle }),
      });

      if (!res.ok) throw new Error("Could not initiate payment");
      const { orderId, amount, currency, keyId } = await res.json();

      // Load Razorpay checkout script dynamically
      await loadRazorpayScript();

      const options = {
        key: keyId,
        amount,
        currency,
        name: "Ask My Notes",
        description: `${plan.name} Plan — ${cycle === "yearly" ? "1 Year" : "1 Month"}`,
        order_id: orderId,
        prefill: {
          email: session.user.email,
        },
        // Surface UPI first — India's credit card recurring failure rate is ~80%.
        // Annual = one-time payment, no mandate needed = highest reliability.
        method: { upi: 1, card: 1, netbanking: 1, wallet: 1 },
        theme: { color: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() },
        handler: async (response) => {
          // Verify payment on server
          const verifyRes = await fetch("/api/payments/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              plan: plan.id,
            }),
          });

          if (verifyRes.ok) {
            router.push("/dashboard?upgraded=1");
          } else {
            setError("Payment verified but activation failed. Please contact support.");
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => {
        setError("Payment failed. Please try again.");
      });
      rzp.open();
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "40px 20px", color: "var(--text-primary)" }}>
      {/* Header */}
      <div style={{ textAlign: "center", maxWidth: 600, margin: "0 auto 36px" }}>
        <h1 style={{ fontSize: "clamp(26px, 5vw, 38px)", fontWeight: 800, margin: "0 0 12px", lineHeight: 1.2 }}>
          Simple, honest pricing
        </h1>
        <p style={{ color: "var(--text-tertiary)", fontSize: 15, margin: "0 0 24px" }}>
          Built for JEE and NEET aspirants. Cancel anytime.
        </p>

        {/* Annual/monthly toggle */}
        <div style={{ display: "inline-flex", background: "var(--bg-surface)", borderRadius: 10, padding: 4, gap: 4, marginBottom: 12 }}>
          <button onClick={() => setAnnual(false)} style={{
            background: !annual ? "var(--bg-surface-2)" : "transparent",
            border: "none", borderRadius: 7, padding: "7px 18px",
            color: !annual ? "var(--text-primary)" : "var(--text-tertiary)", fontSize: 13, fontWeight: 500, cursor: "pointer",
          }}>Monthly</button>
          <button onClick={() => setAnnual(true)} style={{
            background: annual ? "var(--accent)" : "transparent",
            border: "none", borderRadius: 7, padding: "7px 18px",
            color: annual ? "var(--bg-base)" : "var(--text-tertiary)", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>Annual ✦ <span style={{ fontSize: 11, opacity: 0.85 }}>2 months free</span></button>
        </div>

        {/* Annual recommendation callout */}
        {annual && (
          <div style={{
            background:   "color-mix(in srgb, var(--success) 10%, transparent)",
            border:       "1px solid color-mix(in srgb, var(--success) 30%, transparent)",
            borderRadius: 10,
            padding:      "10px 18px",
            fontSize:     12,
            color:        "var(--success)",
            display:      "inline-flex",
            alignItems:   "center",
            gap:          8,
          }}>
            <span>
              Pay once via UPI or card &mdash; no auto-debit mandate, no failed renewals.
              Best for India.
            </span>
          </div>
        )}
      </div>

      {/* Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 20, maxWidth: 900, margin: "0 auto 32px",
      }}>
        {PLANS.map((plan) => {
          const price = annual && plan.yearlyPrice > 0 ? plan.yearlyPrice : plan.monthlyPrice;
          const period = plan.id === "free" ? null : annual ? "/year" : "/month";
          const perMonth = annual && plan.yearlyPrice > 0
            ? `₹${Math.round(plan.yearlyPrice / 12).toLocaleString("en-IN")}/mo`
            : null;
          const saving = annual && plan.yearlySaving ? `Save ₹${plan.yearlySaving.toLocaleString("en-IN")}` : null;
          return (
          <div key={plan.id} style={{
            background: plan.id === "pro" ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "var(--bg-surface)",
            border: `2px solid ${plan.id === "pro" ? "var(--accent)" : "var(--border-hairline)"}`,
            borderRadius: 16, padding: 28,
            display: "flex", flexDirection: "column",
          }}>
            {/* Plan name + price */}
            <h3 style={{ color: "var(--text-primary)", margin: "0 0 4px", fontSize: 17, fontWeight: 600 }}>{plan.name}</h3>
            <div style={{ marginBottom: 2 }}>
              <span style={{ color: "var(--text-primary)", fontSize: 34, fontWeight: 800 }}>
                {price === 0 ? "₹0" : `₹${price.toLocaleString("en-IN")}`}
              </span>
              {period && <span style={{ color: "var(--text-tertiary)", fontSize: 14, marginLeft: 4 }}>{period}</span>}
            </div>
            {perMonth && (
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 2 }}>≈ {perMonth} billed annually</div>
            )}
            <div style={{ minHeight: 20, marginBottom: 4 }}>
              {saving && <span style={{ fontSize: 11, color: "var(--success)", fontWeight: 600 }}>{saving} · 2 months free</span>}
            </div>

            {/* Features */}
            <ul style={{ listStyle: "none", margin: "0 0 24px", padding: 0, flex: 1 }}>
              {plan.features.map((f, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10, color: "var(--text-secondary)", fontSize: 13 }}>
                  <span style={{ color: "var(--success)", flexShrink: 0 }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <button
              onClick={() => handlePlanClick(plan)}
              disabled={loading === plan.id}
              style={{
                width: "100%", padding: "12px 0", borderRadius: 10,
                fontSize: 14, fontWeight: 700,
                cursor: loading === plan.id ? "not-allowed" : "pointer",
                border:
                  plan.id === "free" ? "1px solid var(--border-hairline)" :
                  plan.id === "pro"  ? "none" : "1px solid var(--border-strong)",
                background:
                  plan.id === "free" ? "transparent" :
                  plan.id === "pro"  ? "var(--accent-grad)" : "var(--bg-surface-2)",
                color:
                  plan.id === "free" ? "var(--text-secondary)" :
                  plan.id === "pro"  ? "var(--bg-base)" : "var(--text-primary)",
                opacity: loading === plan.id ? 0.7 : 1,
              }}
            >
              {loading === plan.id ? "Loading…"
                : annual && plan.yearlyPrice > 0
                  ? `${plan.cta} — Annual`
                  : plan.cta}
            </button>
          </div>
          );
        })}
      </div>

      {/* Family + Institute cards */}
      <div style={{ maxWidth: 900, margin: "0 auto 32px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-hairline)", borderRadius: 14, padding: "22px 24px" }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "var(--text-primary)" }}>Family</h3>
          <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>₹4,499<span style={{ fontSize: 14, color: "var(--text-tertiary)" }}>/year</span></div>
          <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 16 }}>2 students + parent dashboard</p>
          <button onClick={() => handlePlanClick({ id: "family", cta: "Start Family" })} style={{
            width: "100%", background: "transparent", border: "1px solid var(--border-hairline)",
            borderRadius: 8, padding: "8px", color: "var(--text-secondary)", fontSize: 13, cursor: "pointer",
          }}>Start Family</button>
        </div>
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-hairline)", borderRadius: 14, padding: "22px 24px" }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "var(--text-primary)" }}>Coaching Institute</h3>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Custom pricing</div>
          <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 16 }}>Batch management, analytics, bulk seats</p>
          <button onClick={() => window.location.href = "mailto:hello@askmynotes.in?subject=Institute Pilot"} style={{
            width: "100%", background: "transparent", border: "1px solid var(--border-hairline)",
            borderRadius: 8, padding: "8px", color: "var(--text-secondary)", fontSize: 13, cursor: "pointer",
          }}>Contact us</button>
        </div>
      </div>

      {error && <p style={{ color: "var(--error)", textAlign: "center", fontSize: 14 }}>{error}</p>}

      <div style={{ maxWidth: 700, margin: "48px auto 0", textAlign: "center" }}>
        <p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>
          Payments by Razorpay &nbsp;·&nbsp; ↩ Cancel anytime &nbsp;·&nbsp; hello@askmynotes.in
        </p>
        <p style={{ marginTop: 12 }}>
          <a href="/dashboard" style={{ color: "var(--accent)", fontSize: 13, textDecoration: "none" }}>← Back to Dashboard</a>
        </p>
      </div>
    </div>
  );
}

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) { resolve(); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
    document.body.appendChild(script);
  });
}
