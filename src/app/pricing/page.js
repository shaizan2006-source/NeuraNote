"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/supabase-js";

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// Amounts in paise
const PRICING = {
  student: { monthly: 19900, yearly: 159900 },
  pro:     { monthly: 39900, yearly: 299900 },
};

const PLANS = [
  {
    id: "free",
    name: "Free Explorer",
    monthlyPrice: 0,
    yearlyPrice: 0,
    color: "#6B7280",
    border: "rgba(255,255,255,0.08)",
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
    color: "#3B82F6",
    border: "#3B82F6",
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
    monthlyPrice: 399,
    yearlyPrice: 2999,
    yearlySaving: 1789,
    color: "#8B5CF6",
    border: "#8B5CF6",
    features: [
      "Unlimited PDF uploads",
      "Everything in Student",
      "7-day free trial",
      "Adaptive AI plan",
      "Focus mode (Pomodoro)",
      "Weekly AI recap",
      "Priority responses",
    ],
    cta: "Start Pro",
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState("");
  const [annual, setAnnual] = useState(true);

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
        description: `${plan.name} Plan — 1 Month`,
        order_id: orderId,
        prefill: {
          email: session.user.email,
        },
        theme: { color: plan.color },
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
    <div style={{ minHeight: "100vh", background: "#0A0A0A", padding: "40px 20px", color: "#F9FAFB" }}>
      {/* Header */}
      <div style={{ textAlign: "center", maxWidth: 600, margin: "0 auto 36px" }}>
        <h1 style={{ fontSize: "clamp(26px, 5vw, 38px)", fontWeight: 800, margin: "0 0 12px", lineHeight: 1.2 }}>
          Simple, honest pricing
        </h1>
        <p style={{ color: "#9CA3AF", fontSize: 15, margin: "0 0 24px" }}>
          Built for JEE and NEET aspirants. Cancel anytime.
        </p>

        {/* Annual/monthly toggle */}
        <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: 4, gap: 4 }}>
          <button onClick={() => setAnnual(false)} style={{
            background: !annual ? "rgba(255,255,255,0.1)" : "transparent",
            border: "none", borderRadius: 7, padding: "7px 18px",
            color: !annual ? "#F9FAFB" : "#6B7280", fontSize: 13, fontWeight: 500, cursor: "pointer",
          }}>Monthly</button>
          <button onClick={() => setAnnual(true)} style={{
            background: annual ? "#8B5CF6" : "transparent",
            border: "none", borderRadius: 7, padding: "7px 18px",
            color: annual ? "#fff" : "#6B7280", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>Annual <span style={{ fontSize: 11, opacity: 0.8 }}>— best value</span></button>
        </div>
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
          const saving = annual && plan.yearlySaving ? `Save ₹${plan.yearlySaving.toLocaleString("en-IN")}` : null;
          return (
          <div key={plan.id} style={{
            background: plan.id === "pro" ? "rgba(139,92,246,0.08)" : "rgba(255,255,255,0.03)",
            border: `2px solid ${plan.id === "pro" ? plan.border : "rgba(255,255,255,0.08)"}`,
            borderRadius: 16, padding: 28,
            display: "flex", flexDirection: "column",
          }}>
            {/* Plan name + price */}
            <h3 style={{ color: "#F9FAFB", margin: "0 0 4px", fontSize: 17, fontWeight: 600 }}>{plan.name}</h3>
            <div style={{ marginBottom: 6 }}>
              <span style={{ color: "#F9FAFB", fontSize: 34, fontWeight: 800 }}>
                {price === 0 ? "₹0" : `₹${price.toLocaleString("en-IN")}`}
              </span>
              {period && <span style={{ color: "#6B7280", fontSize: 14, marginLeft: 4 }}>{period}</span>}
            </div>
            <div style={{ minHeight: 20, marginBottom: 4 }}>
              {saving && <span style={{ fontSize: 11, color: "#10B981", fontWeight: 600 }}>{saving}</span>}
            </div>

            {/* Features */}
            <ul style={{ listStyle: "none", margin: "0 0 24px", padding: 0, flex: 1 }}>
              {plan.features.map((f, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10, color: "#D1D5DB", fontSize: 13 }}>
                  <span style={{ color: "#22C55E", flexShrink: 0 }}>✓</span>
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
                border: plan.id === "free" ? "1px solid rgba(255,255,255,0.12)" : "none",
                background:
                  plan.id === "free" ? "transparent" :
                  plan.id === "pro"  ? "#8B5CF6" : "#3B82F6",
                color: plan.id === "free" ? "#9CA3AF" : "#fff",
                opacity: loading === plan.id ? 0.7 : 1,
              }}
            >
              {loading === plan.id ? "Loading…" : plan.cta}
            </button>
          </div>
          );
        })}
      </div>

      {/* Family + Institute cards */}
      <div style={{ maxWidth: 900, margin: "0 auto 32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "22px 24px" }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "#F9FAFB" }}>Family</h3>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#F9FAFB", marginBottom: 4 }}>₹4,499<span style={{ fontSize: 14, color: "#6B7280" }}>/year</span></div>
          <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 16 }}>2 students + parent dashboard</p>
          <button onClick={() => handlePlanClick({ id: "family", cta: "Start Family" })} style={{
            width: "100%", background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8, padding: "8px", color: "#9CA3AF", fontSize: 13, cursor: "pointer",
          }}>Start Family</button>
        </div>
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "22px 24px" }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "#F9FAFB" }}>Coaching Institute</h3>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#F9FAFB", marginBottom: 4 }}>Custom pricing</div>
          <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 16 }}>Batch management, analytics, bulk seats</p>
          <button onClick={() => window.location.href = "mailto:hello@askmynotes.in?subject=Institute Pilot"} style={{
            width: "100%", background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8, padding: "8px", color: "#9CA3AF", fontSize: 13, cursor: "pointer",
          }}>Contact us</button>
        </div>
      </div>

      {error && <p style={{ color: "#F87171", textAlign: "center", fontSize: 14 }}>{error}</p>}

      <div style={{ maxWidth: 700, margin: "48px auto 0", textAlign: "center" }}>
        <p style={{ color: "#6B7280", fontSize: 13 }}>
          🔒 Payments by Razorpay &nbsp;·&nbsp; ↩ Cancel anytime &nbsp;·&nbsp; 📧 hello@askmynotes.in
        </p>
        <p style={{ marginTop: 12 }}>
          <a href="/dashboard" style={{ color: "#8B5CF6", fontSize: 13, textDecoration: "none" }}>← Back to Dashboard</a>
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
