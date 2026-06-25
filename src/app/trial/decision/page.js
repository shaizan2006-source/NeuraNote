"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { selectHeroVariant } from "@/lib/conversion/heroVariant";
import { preloadRazorpayScript, createOrder } from "@/lib/payments/razorpayCheckout";
import DecisionPage from "./DecisionPage";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export default function TrialDecisionRoute() {
  const router = useRouter();
  const [state, setState] = useState({ status: "loading" }); // loading | ready | redirecting

  useEffect(() => {
    (async () => {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) { router.replace("/login"); return; }

      // E3 fix: use .order + .limit(1) instead of .maybeSingle() — avoids throw
      // if user has multiple plan rows (e.g. free row + trial row).
      const { data: planRows } = await supabase
        .from("user_plans")
        .select("plan, is_trial, trial_ends_at, payment_id, expires_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      const plan = planRows?.[0] ?? null;

      // Already paid — back to dashboard
      if (plan?.payment_id) {
        router.replace("/dashboard?upgraded=1");
        return;
      }

      // Not a trial or no plan — back to pricing
      if (!plan || !plan.is_trial || !plan.trial_ends_at) {
        router.replace("/pricing");
        return;
      }

      const now = Date.now();
      const endsAt = new Date(plan.trial_ends_at).getTime();
      const msLeft = endsAt - now;
      const dayMs = 86_400_000;

      // Too early (more than 1 day left) — back to dashboard
      if (msLeft > dayMs) {
        router.replace("/dashboard");
        return;
      }

      // Too late (expired more than 7 days ago) — legacy pricing
      if (msLeft < -7 * dayMs) {
        router.replace("/pricing");
        return;
      }

      // Fetch signals from trial_segments + streak
      const [segmentRes, profileRes, streakRes, cardsDueRes] = await Promise.all([
        supabase
          .from("trial_segments")
          .select("signals, segment")
          .eq("user_id", session.user.id)
          .maybeSingle(),

        supabase
          .from("profiles")
          .select("full_name, phone_number, parent_phone_number, is_repeat_aspirant")
          .eq("id", session.user.id)
          .maybeSingle(),

        supabase
          .from("study_streaks")
          .select("streak_count")
          .eq("user_id", session.user.id)
          .maybeSingle(),

        supabase
          .from("spaced_repetition_cards")
          .select("id", { count: "exact", head: true })
          .eq("user_id", session.user.id)
          .gte("next_due_at", new Date().toISOString())
          .lte("next_due_at", new Date(now + 7 * dayMs).toISOString()),
      ]);

      const signals = {
        ...(segmentRes.data?.signals ?? {}),
        streak_days: streakRes.data?.streak_count ?? 0,
        fsrs_cards_due_next_week: cardsDueRes.count ?? 0,
      };

      const profile = profileRes.data ?? {};
      const firstName = (profile.full_name ?? "").split(" ")[0] || "";

      const heroVariant = selectHeroVariant(
        { first_name: firstName, is_repeat_aspirant: profile.is_repeat_aspirant },
        signals
      );

      // Low-activity user → lapsed screen
      if (heroVariant.variant === "low_activity") {
        router.replace("/trial/lapsed");
        return;
      }

      // Pre-warm Razorpay in parallel — script load + order creation.
      // E1 fix: catch script-load rejection independently so a CDN failure doesn't
      // freeze the component in the loading spinner forever. createOrder fallback
      // already exists in DecisionPage.jsx if proMonthlyOrder is null.
      const [, proMonthlyOrder] = await Promise.all([
        preloadRazorpayScript().catch((err) => {
          console.warn("[decision] Razorpay script preload failed:", err.message);
        }),
        createOrder({ plan: "pro", cycle: "monthly", accessToken: session.access_token }),
      ]);

      setState({
        status: "ready",
        session,
        heroVariant,
        profile,
        signals,
        segment: segmentRes.data?.segment ?? "unevaluated",
        proMonthlyOrder,
        trialEndsAt: plan.trial_ends_at,
      });
    })();
  }, [router]);

  if (state.status === "loading") {
    return (
      <div style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ width: 24, height: 24, border: "2px solid var(--text-primary)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <DecisionPage
      session={state.session}
      heroVariant={state.heroVariant}
      profile={state.profile}
      signals={state.signals}
      segment={state.segment}
      proMonthlyOrder={state.proMonthlyOrder}
      trialEndsAt={state.trialEndsAt}
    />
  );
}
