"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { openCheckout, createOrder } from "@/lib/payments/razorpayCheckout";
import { trackEvent, EVENTS } from "@/lib/telemetry/events";
import OptionsSheet from "./OptionsSheet";
import ParentReferralButton from "./ParentReferralButton";

export default function DecisionPage({
  session, heroVariant, profile, signals, segment, proMonthlyOrder, trialEndsAt,
}) {
  const router = useRouter();
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [pageLoadTime] = useState(() => Date.now());

  const handlePrimaryPay = useCallback(async () => {
    if (paying) return;
    setPaying(true);
    setError("");

    const t0 = performance.now();

    await trackEvent(session.user.id, EVENTS.TRIAL_D7_PAGE_VIEWED, {
      hero_variant: heroVariant.variant,
      segment,
      time_to_cta_ms: Math.round(Date.now() - pageLoadTime),
    });

    // Use pre-created order if available, else create on the fly (fallback)
    let orderData = proMonthlyOrder;
    if (!orderData) {
      orderData = await createOrder({ plan: "pro", cycle: "monthly", accessToken: session.access_token });
    }

    // R1 fix: if order creation failed entirely, reset paying so user can retry
    if (!orderData) {
      setError("Could not initiate payment. Please try again.");
      setPaying(false);
      return;
    }

    console.log("[decision] Razorpay open in", Math.round(performance.now() - t0), "ms");

    // R1 fix: do NOT call setPaying(false) here — openCheckout() is synchronous
    // and just opens the Razorpay modal. The modal is still open after this line.
    // paying stays true until onSuccess (navigate away) or onError (reset below).
    openCheckout({
      orderData,
      userEmail: session.user.email,
      userPhone: profile?.phone_number ?? "",
      plan: "pro",
      cycle: "monthly",
      accessToken: session.access_token,
      onSuccess: async () => {
        await trackEvent(session.user.id, EVENTS.TRIAL_DECISION_MADE, {
          outcome: "pro_monthly",
          decision_source: "self",
          time_on_page_sec: Math.round((Date.now() - pageLoadTime) / 1000),
        });
        router.replace("/trial/success");
        // No setPaying(false) — navigation unmounts the component
      },
      onError: (msg) => {
        setError(msg);
        setPaying(false); // Reset only on failure so user can retry
      },
    });
    // R1 fix: removed setPaying(false) — was incorrectly resetting state while modal was open
  }, [paying, session, heroVariant, profile, proMonthlyOrder, segment, pageLoadTime, router]);

  const handleFree = useCallback(async () => {
    await trackEvent(session.user.id, EVENTS.TRIAL_DECISION_MADE, {
      outcome: "free",
      decision_source: "self",
      time_on_page_sec: Math.round((Date.now() - pageLoadTime) / 1000),
    });
    // Switch to free — just redirect, plan expires naturally
    router.replace("/dashboard");
  }, [session, pageLoadTime, router]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-base)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "0 24px",
    }}>
      <div style={{ width: "100%", maxWidth: 390 }}>

        {/* Avatar + greeting */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 48 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "var(--bg-surface-2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--text-primary)", fontSize: 13, fontWeight: 700,
          }}>
            {(profile?.full_name ?? "S")[0].toUpperCase()}
          </div>
          <span style={{ fontSize: 16, color: "var(--text-primary)", fontFamily: "system-ui, sans-serif" }}>
            Hey {(profile?.full_name ?? "").split(" ")[0] || "there"}.
          </span>
        </div>

        {/* Hero number */}
        <div style={{ marginBottom: 48 }}>
          <div style={{
            fontSize: 96, fontWeight: 600, lineHeight: 1,
            color: "var(--text-primary)", fontFamily: "system-ui, sans-serif",
            marginBottom: 16,
          }}>
            {heroVariant.hero_number}
          </div>
          <div style={{
            fontSize: 20, lineHeight: 1.3, color: "var(--text-secondary)",
            fontFamily: "system-ui, sans-serif", maxWidth: 320,
          }}>
            {heroVariant.hero_text}
          </div>
        </div>

        {/* Secondary line */}
        <div style={{
          fontSize: 14, color: "var(--text-tertiary)",
          fontFamily: "system-ui, sans-serif", marginBottom: 24,
        }}>
          Your study schedule continues without interruption.
        </div>

        {/* Primary CTA */}
        <button
          onClick={handlePrimaryPay}
          disabled={paying}
          style={{
            width: "100%", height: 56,
            background: paying ? "var(--bg-surface-2)" : "var(--accent-grad)",
            color: paying ? "var(--text-disabled)" : "var(--bg-base)", border: "none", borderRadius: 12,
            fontSize: 16, fontWeight: 600,
            cursor: paying ? "not-allowed" : "pointer",
            fontFamily: "system-ui, sans-serif",
            transition: "background 0.15s",
            marginBottom: 16,
          }}
        >
          {paying ? "Opening payment…" : "Continue with Pro — ₹399/month"}
        </button>

        {/* See other options */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <button
            onClick={() => setOptionsOpen(true)}
            style={{
              background: "none", border: "none",
              color: "var(--text-tertiary)", fontSize: 14,
              textDecoration: "underline", cursor: "pointer",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            See other options
          </button>
        </div>

        {/* Error */}
        {error && (
          <p style={{ color: "var(--error)", fontSize: 13, textAlign: "center", marginBottom: 16 }}>
            {error}
          </p>
        )}

        {/* Fine print */}
        <p style={{
          fontSize: 12, color: "var(--text-tertiary)", textAlign: "center",
          fontFamily: "system-ui, sans-serif", marginBottom: 24,
        }}>
          Cancel anytime in Settings. Refund within 7 days.
        </p>

        {/* Parent referral */}
        <ParentReferralButton
          session={session}
          profile={profile}
          pageLoadTime={pageLoadTime}
        />
      </div>

      {/* Options sheet */}
      <OptionsSheet
        open={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        session={session}
        profile={profile}
        pageLoadTime={pageLoadTime}
      />
    </div>
  );
}
