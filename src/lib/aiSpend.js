/**
 * aiSpend — Per-user monthly AI cost circuit breaker
 *
 * Tracks cumulative AI spend (OpenAI Q&A, TTS, Whisper) per user per day in
 * `user_ai_spend_daily`. Aggregates to a monthly total and blocks calls that
 * would push a user past their plan's hard cap.
 *
 * WHY this exists:
 *   A single abusive Pro user running 15 voice calls × 10 min/day can cost
 *   ~$130/mo in OpenAI tokens against ₹399/mo (~$4.80) of revenue.
 *   This module caps that before the call is placed.
 *
 * COST MODELS (current OpenAI public pricing, May 2026):
 *   gpt-4o-mini  : $0.15 / 1M input tokens + $0.60 / 1M output tokens
 *   gpt-4o       : $2.50 / 1M input tokens + $10.00 / 1M output tokens
 *   TTS-1        : $15.00 / 1M characters
 *   Whisper      : $0.006 / minute
 *
 * MONTHLY CAPS (USD) — override via environment variables:
 *   AI_BUDGET_FREE_USD      default 0.50   (~₹42)
 *   AI_BUDGET_STUDENT_USD   default 3.00   (~₹250)
 *   AI_BUDGET_PRO_USD       default 6.00   (~₹500)
 *   Internal dev + school   uncapped
 *
 * USAGE:
 *   // Before an expensive call:
 *   const check = await checkMonthlyBudget(userId, plan);
 *   if (!check.allowed) return budgetError(check);
 *
 *   // After a call completes (non-blocking):
 *   recordAISpend(userId, { costUsd: 0.0023, tokensIn: 800, tokensOut: 600 });
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Cost constants ─────────────────────────────────────────────────────────

/** OpenAI pricing in USD per unit (update when OpenAI changes pricing). */
export const COST_PER = {
  gpt4oMiniInputPerToken:  0.15  / 1_000_000,
  gpt4oMiniOutputPerToken: 0.60  / 1_000_000,
  gpt4oInputPerToken:      2.50  / 1_000_000,
  gpt4oOutputPerToken:     10.00 / 1_000_000,
  ttsPerChar:              15.00 / 1_000_000,
  whisperPerSec:           0.006 / 60,
};

/**
 * Estimate USD cost from an OpenAI usage object.
 *   model: "gpt-4o-mini" | "gpt-4o" | "tts-1" | "whisper-1"
 *   tokensIn / tokensOut — for chat models
 *   chars — for TTS
 *   durationSecs — for Whisper
 */
export function estimateCost({ model, tokensIn = 0, tokensOut = 0, chars = 0, durationSecs = 0 }) {
  if (model?.startsWith("gpt-4o-mini")) {
    return tokensIn  * COST_PER.gpt4oMiniInputPerToken
         + tokensOut * COST_PER.gpt4oMiniOutputPerToken;
  }
  if (model?.startsWith("gpt-4o")) {
    return tokensIn  * COST_PER.gpt4oInputPerToken
         + tokensOut * COST_PER.gpt4oOutputPerToken;
  }
  if (model === "tts-1" || model === "tts-1-hd") {
    return chars * COST_PER.ttsPerChar;
  }
  if (model === "whisper-1") {
    return durationSecs * COST_PER.whisperPerSec;
  }
  return 0;
}

// ── Monthly budget caps ────────────────────────────────────────────────────

/** Monthly hard caps in USD, per plan tier. null = uncapped. */
export const MONTHLY_CAPS_USD = {
  free:    parseFloat(process.env.AI_BUDGET_FREE_USD    ?? "0.50"),
  student: parseFloat(process.env.AI_BUDGET_STUDENT_USD ?? "3.00"),
  pro:     parseFloat(process.env.AI_BUDGET_PRO_USD     ?? "6.00"),
  family:  parseFloat(process.env.AI_BUDGET_PRO_USD     ?? "6.00"),
  school:  null,   // B2B — no cap
};

// ── Core functions ─────────────────────────────────────────────────────────

/**
 * Returns the user's total AI spend for the current calendar month (in USD).
 * Uses a single SUM query over user_ai_spend_daily for this month.
 */
export async function getMonthlySpend(userId) {
  if (!userId) return 0;

  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  firstOfMonth.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("user_ai_spend_daily")
    .select("cost_usd")
    .eq("user_id", userId)
    .gte("date", firstOfMonth.toISOString().slice(0, 10));

  if (error) {
    console.error("aiSpend.getMonthlySpend error:", error.message);
    return 0; // fail open — don't block users if tracking is broken
  }

  return (data ?? []).reduce((sum, row) => sum + parseFloat(row.cost_usd ?? 0), 0);
}

/**
 * Check if a user is within their monthly AI budget.
 *
 * @param {string} userId
 * @param {string} plan  — "free" | "student" | "pro" | "family" | "school"
 * @returns {{ allowed: boolean, spentUsd: number, limitUsd: number|null, remainingUsd: number|null }}
 */
export async function checkMonthlyBudget(userId, plan = "free") {
  const limitUsd = MONTHLY_CAPS_USD[plan] ?? MONTHLY_CAPS_USD.free;

  // Uncapped plans (school, internal dev handled by caller)
  if (limitUsd === null) {
    return { allowed: true, spentUsd: 0, limitUsd: null, remainingUsd: null };
  }

  const spentUsd = await getMonthlySpend(userId);
  const remainingUsd = Math.max(0, limitUsd - spentUsd);
  const allowed = spentUsd < limitUsd;

  return { allowed, spentUsd, limitUsd, remainingUsd };
}

/**
 * Record AI spend for a completed call. Safe to fire-and-forget (non-blocking).
 * Uses UPSERT with atomic increments to handle concurrent calls correctly.
 *
 * @param {string} userId
 * @param {{ costUsd: number, tokensIn?: number, tokensOut?: number, ttsChars?: number, whisperSecs?: number }} spend
 */
export async function recordAISpend(userId, spend) {
  if (!userId) return;

  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const {
    costUsd     = 0,
    tokensIn    = 0,
    tokensOut   = 0,
    ttsChars    = 0,
    whisperSecs = 0,
  } = spend;

  // Use Supabase's RPC for atomic increment, or upsert with coalesce.
  // We attempt an upsert; on conflict we increment the existing row.
  const { error } = await supabase.rpc("upsert_ai_spend_daily", {
    p_user_id:      userId,
    p_date:         today,
    p_cost_usd:     costUsd,
    p_tokens_in:    tokensIn,
    p_tokens_out:   tokensOut,
    p_tts_chars:    ttsChars,
    p_whisper_secs: whisperSecs,
  });

  if (error) {
    // Non-fatal: log and continue. Spend tracking should never block users.
    console.error("aiSpend.recordAISpend error:", error.message, { userId, spend });
  }
}

/**
 * Build a standardised 429 response for budget exhaustion.
 * Import and use in route handlers.
 */
export function budgetExhaustedResponse(check) {
  return {
    error:        "Monthly AI budget reached",
    detail:       `You've used $${check.spentUsd.toFixed(3)} of your $${check.limitUsd.toFixed(2)}/mo limit. Resets on the 1st.`,
    upgradeUrl:   "/pricing",
    spentUsd:     check.spentUsd,
    limitUsd:     check.limitUsd,
  };
}
