/**
 * Structured output helper — single point of contact for JSON-typed LLM calls.
 *
 * Uses OpenAI's native Structured Outputs (`json_schema` + `strict: true`) which
 * guarantees the model returns a value matching the schema, no JSON.parse
 * ambiguity, no regex-stripping hacks. Works on gpt-4o-mini-2024-07-18+.
 *
 * Exports:
 *   openai           — shared OpenAI client singleton (reuse everywhere)
 *   callStructured() — the helper
 *   StructuredError  — thrown on unrecoverable failure
 */

import OpenAI from "openai";

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export class StructuredError extends Error {
  constructor(message, { cause, attempts } = {}) {
    super(message);
    this.name     = "StructuredError";
    this.cause    = cause;
    this.attempts = attempts;
  }
}

/**
 * Call the model with a strict JSON schema. Retries on transient errors.
 *
 * @param {Object}   opts
 * @param {string}   opts.name           — schema name (required by OpenAI)
 * @param {Object}   opts.schema         — JSON Schema (object with type/properties/required/additionalProperties:false)
 * @param {string}   opts.system         — system prompt
 * @param {string}   opts.user           — user prompt
 * @param {string}  [opts.model="gpt-4o-mini"]
 * @param {number}  [opts.temperature=0.2]
 * @param {number}  [opts.maxTokens]     — optional completion cap
 * @param {number}  [opts.maxRetries=2]  — retries on transient failure
 * @param {number}  [opts.timeoutMs=45000]
 * @returns {Promise<Object>} the parsed, schema-validated object
 */
export async function callStructured({
  name,
  schema,
  system,
  user,
  model       = "gpt-4o-mini",
  temperature = 0.2,
  maxTokens,
  maxRetries  = 2,
  timeoutMs   = 45_000,
}) {
  if (!name)   throw new StructuredError("callStructured: `name` is required");
  if (!schema) throw new StructuredError("callStructured: `schema` is required");
  if (!user)   throw new StructuredError("callStructured: `user` is required");

  assertStrictSchema(schema);

  const request = {
    model,
    temperature,
    max_tokens: maxTokens,
    messages: [
      ...(system ? [{ role: "system", content: system }] : []),
      { role: "user", content: user },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name, strict: true, schema },
    },
  };

  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await withTimeout(
        openai.chat.completions.create(request),
        timeoutMs,
        `OpenAI call timed out after ${timeoutMs}ms`,
      );

      const choice = res?.choices?.[0];
      if (!choice) throw new Error("No choice returned");

      // OpenAI emits a 'refusal' field when the model declines — surface it.
      if (choice.message?.refusal) {
        throw new StructuredError(`Model refused: ${choice.message.refusal}`);
      }

      const raw = choice.message?.content;
      if (!raw) throw new Error("Empty content from model");

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        throw new Error(`Model returned invalid JSON (attempt ${attempt + 1}): ${raw.slice(0, 200)}`);
      }

      // Belt-and-suspenders: basic shape check even though OpenAI enforced schema.
      assertShape(parsed, schema, "$");
      return parsed;
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || attempt === maxRetries) break;
      const backoffMs = 400 * Math.pow(2, attempt);
      await sleep(backoffMs);
    }
  }

  throw new StructuredError(
    `Structured call "${name}" failed after ${maxRetries + 1} attempt(s)`,
    { cause: lastErr, attempts: maxRetries + 1 },
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function withTimeout(promise, ms, msg) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms)),
  ]);
}

function isRetryable(err) {
  // Retry on network blips, rate limits (429), server errors (5xx), timeouts.
  const status = err?.status ?? err?.response?.status;
  if (status === 429) return true;
  if (status >= 500 && status < 600) return true;
  if (/timeout|ECONNRESET|ETIMEDOUT|EAI_AGAIN/i.test(err?.message ?? "")) return true;
  return false;
}

/**
 * OpenAI requires schemas to satisfy several constraints for strict mode:
 *   - Every object must declare `additionalProperties: false`
 *   - Every object's `properties` keys must ALL appear in `required`
 * Assert these locally so errors surface at dev time, not in prod.
 */
function assertStrictSchema(schema, path = "$") {
  if (!schema || typeof schema !== "object") return;

  if (schema.type === "object") {
    if (schema.additionalProperties !== false) {
      throw new StructuredError(
        `Schema at ${path} must set additionalProperties: false for strict mode`,
      );
    }
    const props = Object.keys(schema.properties ?? {});
    const required = new Set(schema.required ?? []);
    for (const k of props) {
      if (!required.has(k)) {
        throw new StructuredError(
          `Schema at ${path}: property "${k}" must appear in "required" for strict mode`,
        );
      }
    }
    for (const [k, v] of Object.entries(schema.properties ?? {})) {
      assertStrictSchema(v, `${path}.${k}`);
    }
  }

  if (schema.type === "array" && schema.items) {
    assertStrictSchema(schema.items, `${path}[]`);
  }

  if (schema.anyOf) schema.anyOf.forEach((s, i) => assertStrictSchema(s, `${path}|${i}`));
  if (schema.oneOf) schema.oneOf.forEach((s, i) => assertStrictSchema(s, `${path}|${i}`));
}

/**
 * Minimal runtime shape check. Not a full JSON Schema validator —
 * OpenAI already guarantees conformance. This just catches catastrophic
 * drift (wrong top-level type) before callers touch the value.
 */
function assertShape(value, schema, path) {
  if (!schema?.type) return;

  const typeOk = (() => {
    switch (schema.type) {
      case "object":  return value !== null && typeof value === "object" && !Array.isArray(value);
      case "array":   return Array.isArray(value);
      case "string":  return typeof value === "string";
      case "number":  return typeof value === "number" && !Number.isNaN(value);
      case "integer": return Number.isInteger(value);
      case "boolean": return typeof value === "boolean";
      case "null":    return value === null;
      default:        return true;
    }
  })();

  if (!typeOk) {
    throw new StructuredError(
      `Shape mismatch at ${path}: expected ${schema.type}, got ${describe(value)}`,
    );
  }
}

function describe(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}
