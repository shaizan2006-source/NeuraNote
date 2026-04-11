"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: null,
    color: "#374151",
    border: "#374151",
    badge: null,
    features: [
      "1 PDF upload",
      "20 questions/day",
      "Basic study plan",
      "Exam countdown",
    ],
    cta: "Get Started Free",
    ctaStyle: "outline",
  },
  {
    id: "student",
    name: "Student",
    price: 299,
    period: "/month",
    color: "#1d4ed8",
    border: "#2563eb",
    badge: "Most Popular",
    features: [
      "10 PDF uploads",
      "Unlimited questions",
      "Smart + Daily study plan",
      "AI Coach & Study Sessions",
      "Weak topic quiz",
      "Spaced repetition",
      "Analytics dashboard",
    ],
    cta: "Start for ₹299",
    ctaStyle: "primary",
  },
  {
    id: "pro",
    name: "Pro",
    price: 599,
    period: "/month",
    color: "#6d28d9",
    border: "#7c3aed",
    badge: "Best Value",
    features: [
      "Unlimited PDF uploads",
      "Unlimited questions",
      "Everything in Student",
      "Adaptive AI plan",
      "Focus mode (Pomodoro)",
      "Exam readiness score",
      "Priority AI responses",
    ],
    cta: "Go Pro for ₹599",
    ctaStyle: "pro",
  },
  {
    id: "school",
    name: "School",
    price: 50000,
    period: "/year",
    color: "#0f766e",
    border: "#0d9488",
    badge: null,
    features: [
      "Up to 500 students",
      "Teacher dashboard",
      "Bulk PDF management",
      "Class-wide analytics",
      "Custom branding",
      "Dedicated support",
    ],
    cta: "Contact Us",
    ctaStyle: "school",
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState("");

  const handlePlanClick = async (plan) => {
    if (plan.id === "free") { router.push("/signup"); return; }
    if (plan.id === "school") { window.location.href = "mailto:hello@askmynotes.in?subject=School Plan Enquiry"; return; }

    setError("");
    setLoading(plan.id);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push(`/login?redirect=/pricing`); return; }

      // Create Razorpay order
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan: plan.id }),
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
    <div style={{ minHeight: "100vh", background: "#0a0a0a", padding: "40px 20px", fontFamily: "Arial" }}>
      {/* Header */}
      <div style={{ textAlign: "center", maxWidth: 600, margin: "0 auto 48px" }}>
        <p style={{ color: "#3b82f6", fontWeight: 700, fontSize: 13, letterSpacing: 2, textTransform: "uppercase", margin: "0 0 12px" }}>
          Simple Pricing
        </p>
        <h1 style={{ color: "white", fontSize: "clamp(28px, 5vw, 42px)", margin: "0 0 16px", lineHeight: 1.2 }}>
          Study smarter, score higher
        </h1>
        <p style={{ color: "#9ca3af", fontSize: 16, margin: 0 }}>
          Built for Indian students. No hidden fees. Cancel anytime.
        </p>
      </div>

      {/* Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 20,
        maxWidth: 1100,
        margin: "0 auto",
      }}>
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            style={{
              background: plan.id === "student" ? "linear-gradient(160deg, #0f1f3d 0%, #1a2f54 100%)" : "#111827",
              border: `2px solid ${plan.id === "student" ? plan.border : "#1f2937"}`,
              borderRadius: 16,
              padding: 28,
              position: "relative",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Badge */}
            {plan.badge && (
              <div style={{
                position: "absolute",
                top: -12,
                left: "50%",
                transform: "translateX(-50%)",
                background: plan.color,
                color: "white",
                borderRadius: 20,
                padding: "3px 14px",
                fontSize: 12,
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}>
                {plan.badge}
              </div>
            )}

            {/* Plan name + price */}
            <h3 style={{ color: "white", margin: "0 0 4px", fontSize: 18 }}>{plan.name}</h3>
            <div style={{ marginBottom: 20 }}>
              <span style={{ color: "white", fontSize: 36, fontWeight: 800 }}>
                {plan.price === 0 ? "Free" : `₹${plan.price.toLocaleString("en-IN")}`}
              </span>
              {plan.period && (
                <span style={{ color: "#9ca3af", fontSize: 14, marginLeft: 4 }}>{plan.period}</span>
              )}
            </div>

            {/* Features */}
            <ul style={{ listStyle: "none", margin: "0 0 24px", padding: 0, flex: 1 }}>
              {plan.features.map((f, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10, color: "#d1d5db", fontSize: 14 }}>
                  <span style={{ color: "#22c55e", flexShrink: 0, marginTop: 1 }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <button
              onClick={() => handlePlanClick(plan)}
              disabled={loading === plan.id}
              style={{
                width: "100%",
                padding: "12px 0",
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 700,
                cursor: loading === plan.id ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                border: plan.ctaStyle === "outline" ? "2px solid #374151" : "none",
                background:
                  plan.ctaStyle === "outline" ? "transparent" :
                  plan.ctaStyle === "primary" ? "#2563eb" :
                  plan.ctaStyle === "pro"     ? "linear-gradient(135deg, #6d28d9, #7c3aed)" :
                  "#0d9488",
                color: plan.ctaStyle === "outline" ? "#9ca3af" : "white",
                opacity: loading === plan.id ? 0.7 : 1,
              }}
            >
              {loading === plan.id ? "Loading…" : plan.cta}
            </button>
          </div>
        ))}
      </div>

      {error && (
        <p style={{ color: "#f87171", textAlign: "center", marginTop: 24, fontSize: 14 }}>{error}</p>
      )}

      {/* FAQ strip */}
      <div style={{ maxWidth: 700, margin: "64px auto 0", textAlign: "center" }}>
        <p style={{ color: "#6b7280", fontSize: 14 }}>
          🔒 Payments secured by Razorpay &nbsp;·&nbsp; 📧 Support: hello@askmynotes.in &nbsp;·&nbsp; ↩ Cancel anytime
        </p>
        <p style={{ marginTop: 16 }}>
          <a href="/dashboard" style={{ color: "#3b82f6", fontSize: 14 }}>← Back to Dashboard</a>
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
