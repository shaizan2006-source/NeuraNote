/**
 * sseStream — Server-Sent Events v2 encoder
 *
 * Replaces the custom __META__ / __CONV__ text protocol with standard SSE.
 * Each event is encoded as:
 *   data: {JSON}\n\n
 *
 * Event shapes:
 *   { type: "meta",  v: 2, sources, usedContext, fromCache?, classification }
 *   { type: "token", text: "..." }
 *   { type: "conv",  conversation_id: "...", [used_rag]: bool }
 *
 * The Response MUST use Content-Type: text/event-stream.
 * Clients parse using parseSseStream() from src/lib/sseParser.js.
 *
 * BACKWARD COMPATIBILITY:
 *   The v:2 field in the meta event lets clients detect the protocol version.
 *   Older clients that check rawChunk.startsWith("__META__") will receive
 *   "data: {..." and safely fall through to the accumulated text path.
 */

const encoder = new TextEncoder();

/** Encode a single SSE event as a Uint8Array. */
export function sseEvent(payload) {
  return encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
}

/** Convenience: meta event */
export function sseMeta({ sources = [], usedContext = false, fromCache = false, classification = {} } = {}) {
  return sseEvent({ type: "meta", v: 2, sources, usedContext, fromCache, classification });
}

/** Convenience: text token event */
export function sseToken(text) {
  return sseEvent({ type: "token", text });
}

/** Convenience: conversation-created event */
export function sseConv(payload) {
  return sseEvent({ type: "conv", ...payload });
}

/** Standard headers for a streaming SSE response. */
export const SSE_HEADERS = {
  "Content-Type":           "text/event-stream; charset=utf-8",
  "Cache-Control":          "no-cache",
  "X-Accel-Buffering":      "no",
  "X-Content-Type-Options": "nosniff",
};
