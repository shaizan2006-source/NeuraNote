import { supabaseAdmin } from "@/lib/serverAuth";

const PROVIDERS = {
  aisensy: sendViaAisensy,
  gupshup: sendViaGupshup,
  interakt: sendViaInterakt,
};

// E6 fix: 8-second timeout on all provider fetch calls
const PROVIDER_TIMEOUT_MS = 8_000;

/**
 * Dispatch a WhatsApp template message.
 *
 * Handles idempotency, phone validation, logging, and one retry on failure.
 *
 * @param {object} opts
 * @param {string} opts.userId
 * @param {string} opts.phoneNumber  E.164 format: +91XXXXXXXXXX
 * @param {string} opts.templateName
 * @param {object} opts.variables    Key-value map of template placeholders
 * @param {string} opts.idempotencyKey  Unique per user+intent, e.g. "trial_d3_revive_<userId>"
 * @returns {{ ok: boolean, providerMessageId?: string, error?: string }}
 */
export async function dispatchWhatsApp({ userId, phoneNumber, templateName, variables = {}, idempotencyKey }) {
  // 1. Validate phone — must be +91 followed by 10 digits starting with 6-9
  if (!isValidIndianPhone(phoneNumber)) {
    console.warn("[whatsapp] invalid phone for user", userId);
    return { ok: false, error: "invalid_phone" };
  }

  // 2. Idempotency — skip if already sent (not failed)
  const { data: existing } = await supabaseAdmin
    .from("whatsapp_messages")
    .select("id, status")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existing && existing.status !== "failed") {
    console.log("[whatsapp] idempotent skip", idempotencyKey, existing.status);
    return { ok: true, idempotent: true };
  }

  // 3. Upsert log row in queued state
  //    onConflict="idempotency_key" lets us retry previously-failed rows.
  //    Two concurrent callers that both see null/failed will both upsert; the
  //    second upsert is a no-op (same data). The send + status-update below
  //    is idempotent enough for the rare double-fire scenario.
  const { data: logRow, error: logErr } = await supabaseAdmin
    .from("whatsapp_messages")
    .upsert({
      user_id: userId,
      phone_number: phoneNumber,
      template_name: templateName,
      template_variables: variables,
      idempotency_key: idempotencyKey,
      status: "queued",
      status_updated_at: new Date().toISOString(),
    }, { onConflict: "idempotency_key" })
    .select("id")
    .single();

  if (logErr) {
    console.error("[whatsapp] failed to log message", logErr);
    return { ok: false, error: "db_log_failed" };
  }

  // 4. Resolve provider
  const provider = process.env.WHATSAPP_PROVIDER || "aisensy";
  const sendFn = PROVIDERS[provider];

  // S8 fix: mark row failed before returning on unknown provider
  if (!sendFn) {
    console.error("[whatsapp] unknown provider", provider);
    await supabaseAdmin
      .from("whatsapp_messages")
      .update({ status: "failed", status_updated_at: new Date().toISOString() })
      .eq("id", logRow.id);
    return { ok: false, error: "unknown_provider" };
  }

  // 5. Send via provider with one retry
  let result = await sendFn({ phoneNumber, templateName, variables });

  if (!result.ok) {
    // Single retry after a brief delay
    await new Promise(r => setTimeout(r, 500));
    result = await sendFn({ phoneNumber, templateName, variables });
  }

  // 6. Update log with outcome
  const newStatus = result.ok ? "sent" : "failed";
  await supabaseAdmin
    .from("whatsapp_messages")
    .update({
      status: newStatus,
      provider_message_id: result.providerMessageId ?? null,
      provider_response: result.raw ?? null,
      status_updated_at: new Date().toISOString(),
    })
    .eq("id", logRow.id);

  if (!result.ok) {
    console.error("[whatsapp] send failed after retry", { idempotencyKey, error: result.error });
  }

  return result.ok
    ? { ok: true, providerMessageId: result.providerMessageId }
    : { ok: false, error: result.error };
}

// ─────────────────────────────────────────────────────────────
// Provider implementations
// ─────────────────────────────────────────────────────────────

async function sendViaAisensy({ phoneNumber, templateName, variables }) {
  const apiKey = process.env.WHATSAPP_API_KEY;
  const variableValues = Object.values(variables).map(String);

  try {
    const res = await fetchWithTimeout("https://backend.aisensy.com/campaign/t1/api/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey,
        campaignName: templateName,
        destination: phoneNumber,
        userName: "Ask My Notes",
        templateParams: variableValues,
        source: "new-landing-page form",
        media: {},
        buttons: [],
        carouselCards: [],
        location: {},
      }),
    });

    const raw = await res.json().catch(() => ({ status: res.status }));

    if (res.ok && raw.messages?.[0]?.id) {
      return { ok: true, providerMessageId: raw.messages[0].id, raw };
    }
    return { ok: false, error: raw.message ?? "aisensy_error", raw };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function sendViaGupshup({ phoneNumber, templateName, variables }) {
  const apiKey = process.env.WHATSAPP_API_KEY;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  const params = Object.values(variables)
    .map((v, i) => ({ paramindex: i + 1, paramvalue: String(v) }));

  try {
    const body = new URLSearchParams({
      channel: "whatsapp",
      source: phoneNumberId,
      destination: phoneNumber.replace(/^\+/, ""),
      template: JSON.stringify({ id: templateName, params }),
    });

    const res = await fetchWithTimeout("https://api.gupshup.io/sm/api/v1/template/msg", {
      method: "POST",
      headers: { apikey: apiKey, "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const raw = await res.json().catch(() => ({ status: res.status }));

    if (res.ok && raw.status === "submitted") {
      return { ok: true, providerMessageId: raw.messageId, raw };
    }
    return { ok: false, error: raw.message ?? "gupshup_error", raw };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function sendViaInterakt({ phoneNumber, templateName, variables }) {
  const apiKey = process.env.WHATSAPP_API_KEY;
  const bodyValues = Object.values(variables).map((v) => ({ type: "text", text: String(v) }));

  // Strip +91 prefix to get 10-digit number for Interakt
  const digits = phoneNumber.replace(/^\+91/, "");

  try {
    const res = await fetchWithTimeout("https://api.interakt.ai/v1/public/message/", {
      method: "POST",
      headers: {
        Authorization: `Basic ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        countryCode: "+91",
        phoneNumber: digits,
        callbackData: templateName,
        type: "Template",
        template: {
          name: templateName,
          languageCode: "en",
          bodyValues,
        },
      }),
    });

    const raw = await res.json().catch(() => ({ status: res.status }));

    if (res.ok && raw.result) {
      return { ok: true, providerMessageId: raw.id, raw };
    }
    return { ok: false, error: raw.message ?? "interakt_error", raw };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function isValidIndianPhone(phone) {
  return /^\+91[6-9]\d{9}$/.test(phone);
}

/**
 * E6 fix: fetch with AbortController timeout.
 * Throws with err.message = "timeout" if provider doesn't respond in time.
 */
async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      throw new Error(`timeout after ${PROVIDER_TIMEOUT_MS}ms calling ${url}`);
    }
    throw err;
  }
}
