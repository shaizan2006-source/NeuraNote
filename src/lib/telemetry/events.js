/**
 * Track a growth telemetry event.
 * Fire-and-forget — never blocks the caller on failure.
 *
 * Isomorphic: on the server it inserts directly via the admin client
 * (dynamically imported so the service-role key is NEVER pulled into the
 * client bundle); on the client it POSTs to /api/telemetry. This keeps
 * "use client" callers (e.g. /trial/decision) from importing serverAuth,
 * which would throw "supabaseKey is required" at module eval in the browser.
 *
 * @param {string} userId
 * @param {string} eventName  e.g. "trial_d3_segment"
 * @param {object} properties  Additional structured data
 */
export async function trackEvent(userId, eventName, properties = {}) {
  try {
    if (typeof window === "undefined") {
      // Server: insert directly. Dynamic import keeps serverAuth server-only.
      const { supabaseAdmin } = await import("@/lib/serverAuth");
      const { error } = await supabaseAdmin.from("growth_events").insert({
        user_id: userId ?? null,
        event_name: eventName,
        properties,
      });
      if (error) {
        console.error("[telemetry] insert failed", eventName, error.message);
      }
    } else {
      // Client: route through the telemetry API (no service-role key in the browser).
      await fetch("/api/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId ?? null, eventName, properties }),
        keepalive: true,
      });
    }
  } catch (err) {
    console.error("[telemetry] unexpected error", eventName, err?.message);
  }
}

// Named event constants — import these instead of raw strings to prevent typos
export const EVENTS = {
  // Phase 1
  WHATSAPP_OPT_IN:         "whatsapp_opt_in",
  WHATSAPP_REPLY_RECEIVED: "whatsapp_reply_received",
  // Phase 2
  TRIAL_D3_SEGMENT:        "trial_d3_segment",
  // Phase 3
  TRIAL_D7_PAGE_VIEWED:    "trial_d7_page_viewed",
  TRIAL_DECISION_MADE:     "trial_decision_made",
  PARENT_REFERRAL_INITIATED: "parent_referral_initiated",
  // Phase 4
  TRIAL_D5_WARMUP_SENT:    "trial_d5_warmup_sent",
  // Phase 5
  TRIAL_D8_RECOVERY_SENT:  "trial_d8_recovery_sent",
  TRIAL_RECOVERED:         "trial_recovered",
  // Phase 6
  PARENT_REFERRAL_SENT:    "parent_referral_sent",
  // Phase 7
  TRIAL_PAID_D30_RETAINED: "trial_paid_d30_retained",
};
