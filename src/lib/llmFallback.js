/**
 * llmFallback — Resilient OpenAI streaming adapter with retry logic
 *
 * Provides a unified async-generator interface for streaming chat completions.
 * On rate-limit (429) or server error (5xx), retries with exponential back-off
 * before giving up.
 *
 * WHY this exists:
 *   OpenAI outages are the #2 risk in the project risk matrix (score 20/25).
 *   Wrapping all LLM calls here lets us add resilience in one place without
 *   touching individual route files.
 *
 * RETRY STRATEGY:
 *   - Attempt 1: immediate
 *   - Attempt 2: wait 1 s
 *   - Attempt 3: wait 3 s
 *   - Gives up after 3 attempts, re-throws last error.
 *
 * USAGE (replaces direct openai.chat.completions.create calls):
 *
 *   import { streamCompletion, completeWithFallback } from "@/lib/llmFallback";
 *
 *   for await (const text of streamCompletion({ systemPrompt, messages, model, maxTokens, temperature })) {
 *     controller.enqueue(encoder.encode(text));
 *   }
 */

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey:     process.env.OPENAI_API_KEY,
  maxRetries: 0,   // We handle retries ourselves for full control
  timeout:    45_000,
});

// ── Retry config ───────────────────────────────────────────────────────────

const RETRY_DELAYS_MS = [0, 1_000, 3_000]; // delay before attempt 1, 2, 3

/** Returns true for errors that are worth retrying (transient server-side issues). */
function isRetryable(err) {
  if (!err) return false;
  const status = err?.status ?? err?.response?.status;
  if (status === 429) return true;   // rate limit
  if (status >= 500)  return true;   // server error
  // Network errors (no HTTP status)
  if (err?.code === "ECONNRESET" || err?.code === "ETIMEDOUT") return true;
  return false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Streaming generator ────────────────────────────────────────────────────

async function* attemptStream({ systemPrompt, messages, model, maxTokens, temperature }) {
  const openAIMessages = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  const stream = await openai.chat.completions.create({
    model,
    temperature,
    max_tokens: maxTokens,
    stream:     true,
    messages:   openAIMessages,
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content || "";
    if (text) yield text;
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Stream a chat completion with automatic retry on transient OpenAI errors.
 *
 * @param {{ systemPrompt: string, messages: Array<{role,content}>, model?: string, maxTokens?: number, temperature?: number }} opts
 * @yields {string} text chunks
 */
export async function* streamCompletion(opts) {
  const { systemPrompt, messages, model = "gpt-4o-mini", maxTokens, temperature } = opts;

  let lastErr = null;

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    if (RETRY_DELAYS_MS[attempt] > 0) {
      await sleep(RETRY_DELAYS_MS[attempt]);
    }

    try {
      const gen = attemptStream({ systemPrompt, messages, model, maxTokens, temperature });
      for await (const text of gen) {
        yield text;
      }
      return; // success — done
    } catch (err) {
      lastErr = err;

      if (!isRetryable(err) || attempt === RETRY_DELAYS_MS.length - 1) {
        throw err; // non-retryable or last attempt
      }

      console.warn(
        `[llmFallback] OpenAI ${model} attempt ${attempt + 1} failed (${err?.status ?? err?.code ?? err?.message}) — retrying in ${RETRY_DELAYS_MS[attempt + 1]}ms`
      );
    }
  }

  throw lastErr;
}

/**
 * Non-streaming convenience wrapper — returns the full completion as a string.
 * Useful for short, non-latency-sensitive paths (e.g. export-intent).
 */
export async function completeWithFallback(opts) {
  let result = "";
  for await (const chunk of streamCompletion(opts)) {
    result += chunk;
  }
  return result;
}
