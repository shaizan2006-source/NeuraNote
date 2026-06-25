"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createOrder, openCheckout } from "@/lib/payments/razorpayCheckout";
import { trackEvent, EVENTS } from "@/lib/telemetry/events";

const PLANS = [
  {
    id: "pro_annual",
    plan: "pro",
    cycle: "yearly",
    title: "Pro Annual",
    price: "₹2,999/year",
    savings: "Save ₹1,789 vs monthly",
    note: "One payment, full year. Most popular with parents.",
    highlighted: true,
    cta: "Choose Annual",
  },
  {
    id: "student",
    plan: "student",
    cycle: "monthly",
    title: "Student",
    price: "₹199/month",
    savings: null,
    note: "Slower briefings. No Brain Map. Fewer mock tests.",
    highlighted: false,
    cta: "Choose Student",
  },
  {
    id: "free",
    plan: "free",
    cycle: null,
    title: "Continue free",
    price: null,
    savings: null,
    note: "Keep your data, lose Pro features.",
    highlighted: false,
    cta: "Switch to Free",
    isFree: true,
  },
];

export default function OptionsSheet({ open, onClose, session, profile, pageLoadTime }) {
  const router = useRouter();
  const [paying, setPaying] = useState(null); // plan id being paid
  const [error, setError] = useState("");

  // Lock body scroll when sheet is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const handlePay = async (planOption) => {
    if (planOption.isFree) {
      await trackEvent(session.user.id, EVENTS.TRIAL_DECISION_MADE, {
        outcome: "free",
        decision_source: "self",
        time_on_page_sec: Math.round((Date.now() - pageLoadTime) / 1000),
      });
      router.replace("/dashboard");
      return;
    }

    setPaying(planOption.id);
    setError("");

    const orderData = await createOrder({
      plan: planOption.plan,
      cycle: planOption.cycle,
      accessToken: session.access_token,
    });

    // R2 fix: if order creation failed, reset paying so user can retry
    if (!orderData) {
      setError("Could not initiate payment. Please try again.");
      setPaying(null);
      return;
    }

    // R2 fix: do NOT call setPaying(null) after openCheckout() — the modal is still
    // open after openCheckout() returns (it's synchronous, just calls rzp.open()).
    // Keep paying set until onSuccess (navigate away) or onError.
    openCheckout({
      orderData,
      userEmail: session.user.email,
      userPhone: profile?.phone_number ?? "",
      plan: planOption.plan,
      cycle: planOption.cycle,
      accessToken: session.access_token,
      onSuccess: async () => {
        await trackEvent(session.user.id, EVENTS.TRIAL_DECISION_MADE, {
          outcome: planOption.id,
          decision_source: "self",
          time_on_page_sec: Math.round((Date.now() - pageLoadTime) / 1000),
        });
        router.replace("/trial/success");
        // No setPaying(null) — navigation unmounts component
      },
      onError: (msg) => {
        setError(msg);
        setPaying(null); // Reset only on failure so user can retry
      },
    });
    // R2 fix: removed setPaying(null) — was incorrectly resetting state while modal was open
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.4)",
          zIndex: 40,
          animation: "fadeIn 0.2s ease",
        }}
      />

      {/* Sheet */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "var(--bg-surface)",
        borderRadius: "20px 20px 0 0",
        padding: "24px 24px 40px",
        zIndex: 50,
        animation: "slideUp 0.25s ease",
        maxWidth: 480,
        margin: "0 auto",
      }}>
        {/* Handle */}
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: "var(--bg-surface-2)", margin: "0 auto 20px",
        }} />

        <h3 style={{
          fontSize: 16, fontWeight: 600, color: "var(--text-primary)",
          fontFamily: "system-ui, sans-serif",
          margin: "0 0 20px",
        }}>
          Choose your plan
        </h3>

        {PLANS.map((p) => (
          <div
            key={p.id}
            style={{
              border: p.highlighted ? "1px solid var(--accent-dim)" : "1px solid var(--border-hairline)",
              borderRadius: 12,
              padding: "16px",
              marginBottom: 12,
              background: p.highlighted ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "var(--bg-surface)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: p.highlighted ? "var(--accent-bright)" : "var(--text-primary)", fontFamily: "system-ui, sans-serif" }}>
                {p.title}
              </span>
              {p.price && (
                <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-secondary)", fontFamily: "system-ui, sans-serif" }}>
                  {p.price}
                </span>
              )}
            </div>

            {p.savings && (
              <p style={{ fontSize: 12, color: "var(--accent-bright)", margin: "0 0 6px", fontFamily: "system-ui, sans-serif" }}>
                {p.savings}
              </p>
            )}

            <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: "0 0 12px", fontFamily: "system-ui, sans-serif" }}>
              {p.note}
            </p>

            <button
              onClick={() => handlePay(p)}
              disabled={!!paying}
              style={{
                width: "100%",
                background: p.highlighted ? "var(--accent-grad)" : p.isFree ? "none" : "var(--bg-surface-2)",
                color: p.highlighted ? "var(--bg-base)" : p.isFree ? "var(--text-tertiary)" : "var(--text-secondary)",
                border: p.isFree ? "none" : "none",
                borderRadius: 8,
                padding: "10px",
                fontSize: 14,
                fontWeight: p.isFree ? 400 : 500,
                cursor: paying ? "not-allowed" : "pointer",
                fontFamily: "system-ui, sans-serif",
                textDecoration: p.isFree ? "underline" : "none",
                opacity: paying && paying !== p.id ? 0.6 : 1,
              }}
            >
              {paying === p.id ? "Opening payment…" : p.cta}
            </button>
          </div>
        ))}

        {error && (
          <p style={{ color: "var(--error)", fontSize: 13, textAlign: "center", marginTop: 8 }}>
            {error}
          </p>
        )}
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </>
  );
}
