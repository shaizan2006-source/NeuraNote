/**
 * Shared OpenAI client singleton — single source of truth for all OpenAI calls.
 *
 * Why one singleton:
 *   - Connection pool shared across all callers (reduces TLS handshakes)
 *   - SDK-level retry (maxRetries: 2) catches transient blips before app logic sees them
 *   - Circuit breaker at the wrapper layer prevents pile-ups when OpenAI is degraded
 *   - All non-streaming calls wrapped with withRetry() + openaiBreaker
 *
 * Edge cases handled:
 *   - OpenAI key not set at import time → deferred validation at first call (Next.js edge)
 *   - Streaming calls → circuit-breaker + single retry only (can't retry mid-stream)
 *   - TTS calls → retry-safe (idempotent, same text → same audio)
 *   - Embedding calls → retry-safe (pure function)
 *   - Null/undefined input → validated before network call to avoid wasting quota
 *   - CircuitOpenError → re-thrown as-is (503 status, caller decides fallback)
 *   - AbortSignal support → forwarded to withRetry and SDK call
 */

import OpenAI from "openai";
import { withRetry, isRetryable } from "@/lib/retry";
import { openaiBreaker, CircuitOpenError } from "@/lib/circuitBreaker";

// SDK-level: 2 retries on 429/5xx before we even see the error
// App-level: withRetry adds 2 more passes with jitter if SDK retries are exhausted
let _client = null;
function client() {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    _client = new OpenAI({
      apiKey:     process.env.OPENAI_API_KEY,
      maxRetries: 2,       // SDK-level retry with exponential backoff
      timeout:    45_000,  // 45s per attempt (SDK-level)
    });
  }
  return _client;
}

// Retry config for app-level wrapping (on top of SDK retries)
const APP_RETRY_OPTS = {
  maxRetries: 2,
  baseMs:     600,
  maxDelayMs: 8_000,
  label:      "openai",
};

/**
 * Chat completion (non-streaming).
 * Wrapped: circuit breaker + exponential backoff retry.
 *
 * @param {OpenAI.ChatCompletionCreateParamsNonStreaming} params
 * @param {object}        [opts]
 * @param {AbortSignal}   [opts.signal]
 * @returns {Promise<OpenAI.ChatCompletion>}
 */
export async function chatCompletion(params, { signal } = {}) {
  validateChatParams(params);
  return openaiBreaker.call(() =>
    withRetry(
      () => client().chat.completions.create({ ...params, stream: false }),
      { ...APP_RETRY_OPTS, signal }
    )
  );
}

/**
 * Streaming chat completion.
 * Circuit-breaker applied only; no retry mid-stream (client already reading chunks).
 * Single retry on initial connection failure only.
 *
 * @param {OpenAI.ChatCompletionCreateParamsStreaming} params
 * @returns {Promise<AsyncIterable<OpenAI.ChatCompletionChunk>>}
 */
export async function chatStream(params) {
  validateChatParams(params);
  return openaiBreaker.call(() =>
    withRetry(
      () => client().chat.completions.create({ ...params, stream: true }),
      { maxRetries: 1, baseMs: 400, label: "openai-stream" }
    )
  );
}

/**
 * TTS (text-to-speech). Retry-safe — same input always produces equivalent audio.
 *
 * @param {OpenAI.Audio.SpeechCreateParams} params
 * @param {object}      [opts]
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<Response>}  the raw audio response
 */
export async function textToSpeech(params, { signal } = {}) {
  if (!params?.input || typeof params.input !== "string") {
    throw new Error("textToSpeech: params.input must be a non-empty string");
  }
  if (params.input.trim().length === 0) {
    throw new Error("textToSpeech: params.input cannot be blank");
  }
  return openaiBreaker.call(() =>
    withRetry(
      () => client().audio.speech.create(params),
      { ...APP_RETRY_OPTS, signal }
    )
  );
}

/**
 * Embeddings. Retry-safe — pure function.
 *
 * @param {OpenAI.EmbeddingCreateParams} params
 * @param {object}      [opts]
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<OpenAI.CreateEmbeddingResponse>}
 */
export async function embed(params, { signal } = {}) {
  if (!params?.input) throw new Error("embed: params.input is required");
  const input = params.input;
  if (typeof input === "string" && input.trim().length === 0) {
    throw new Error("embed: params.input cannot be blank");
  }
  if (Array.isArray(input) && input.length === 0) {
    throw new Error("embed: params.input array cannot be empty");
  }
  return openaiBreaker.call(() =>
    withRetry(
      () => client().embeddings.create(params),
      { ...APP_RETRY_OPTS, signal }
    )
  );
}

/**
 * Vision (chat with image). Wraps chatCompletion.
 *
 * @param {string} imageBase64
 * @param {string} mimeType
 * @param {string} promptText
 * @param {object} [chatParams]    — overrides for model, max_tokens, etc.
 * @returns {Promise<string>}  raw content string from the model
 */
export async function visionChat(imageBase64, mimeType, promptText, chatParams = {}) {
  if (!imageBase64) throw new Error("visionChat: imageBase64 is required");
  if (!promptText)  throw new Error("visionChat: promptText is required");

  const res = await chatCompletion({
    model:           "gpt-4o",
    max_tokens:      400,
    response_format: { type: "json_object" },
    ...chatParams,
    messages: [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: "high" } },
          { type: "text", text: promptText },
        ],
      },
    ],
  });
  return res.choices[0].message.content;
}

/**
 * Transcription (Whisper). Retry-safe.
 *
 * @param {OpenAI.Audio.TranscriptionCreateParams} params
 * @returns {Promise<OpenAI.Transcription>}
 */
export async function transcribe(params) {
  if (!params?.file) throw new Error("transcribe: params.file is required");
  return openaiBreaker.call(() =>
    withRetry(
      () => client().audio.transcriptions.create(params),
      { ...APP_RETRY_OPTS, label: "openai-transcribe" }
    )
  );
}

// Re-export circuit breaker stats for health endpoint
export { openaiBreaker };

// ── Validation helpers ────────────────────────────────────────────────────────
function validateChatParams(params) {
  if (!params) throw new Error("chatCompletion: params is required");
  if (!params.model) throw new Error("chatCompletion: params.model is required");
  if (!Array.isArray(params.messages) || params.messages.length === 0) {
    throw new Error("chatCompletion: params.messages must be a non-empty array");
  }
}
