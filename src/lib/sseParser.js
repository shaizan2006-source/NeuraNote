/**
 * sseParser — Client-side streaming response parser
 *
 * Handles BOTH the legacy v1 text protocol (__META__ / __CONV__) and the
 * standard SSE v2 protocol (data: {json}\n\n).
 *
 * Version detection:
 *   v2: first chunk starts with "data: " and parses as SSE
 *   v1: first chunk starts with "__META__" (legacy, kept for cache hits
 *       and any old cached responses in flight)
 *
 * USAGE:
 *
 *   const res = await fetch("/api/ask", { method: "POST", ... });
 *   for await (const event of parseSseStream(res)) {
 *     if (event.type === "meta")  handleMeta(event);
 *     if (event.type === "token") appendText(event.text);
 *     if (event.type === "conv")  handleConv(event);
 *   }
 *
 * EVENTS EMITTED:
 *   { type: "meta",  v, sources, usedContext, fromCache, classification }
 *   { type: "token", text }
 *   { type: "conv",  conversation_id, [used_rag] }
 */

/**
 * Async generator that reads a streaming Response and yields typed events.
 * @param {Response} response
 */
export async function* parseSseStream(response) {
  const reader  = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer    = "";
  let detectedV = null;   // null = not yet detected, 1 = legacy, 2 = SSE

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      // ── Version detection on first meaningful chunk ─────────
      if (detectedV === null) {
        if (buffer.trimStart().startsWith("data: ")) {
          detectedV = 2;
        } else {
          detectedV = 1;  // legacy __META__ protocol
        }
      }

      if (detectedV === 2) {
        // ── SSE v2: split on double newline, parse each event ──
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";   // last incomplete event stays in buffer

        for (const raw of events) {
          const line = raw.trim();
          if (!line.startsWith("data: ")) continue;
          try {
            const payload = JSON.parse(line.slice(6)); // strip "data: "
            yield payload;  // { type, ... }
          } catch { /* malformed event — skip */ }
        }
      } else {
        // ── Legacy v1: __META__ / __CONV__ string protocol ─────
        yield* _parseLegacyBuffer(buffer);
        buffer = "";   // legacy parser is stateless; drain on each chunk
      }
    }

    // Flush any remaining SSE events
    if (detectedV === 2 && buffer.trim()) {
      const line = buffer.trim();
      if (line.startsWith("data: ")) {
        try {
          yield JSON.parse(line.slice(6));
        } catch { /* ignore */ }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ── Legacy v1 compatibility ────────────────────────────────────────────────

function* _parseLegacyBuffer(raw) {
  let text = raw;

  // Extract __META__ (always at the start)
  if (text.startsWith("__META__")) {
    const metaLine = text.replace("__META__", "").split("\n")[0];
    try {
      const meta = JSON.parse(metaLine);
      yield { type: "meta", v: 1, ...meta };
    } catch { /* ignore malformed */ }
    text = text.replace(`__META__${metaLine}\n`, "");
  }

  // Extract __CONV__ (at the end)
  const convIdx = text.indexOf("\n__CONV__");
  if (convIdx !== -1) {
    const textPart = text.slice(0, convIdx);
    const metaPart = text.slice(convIdx + 9); // "\n__CONV__".length === 9
    if (textPart) yield { type: "token", text: textPart };
    try {
      const conv = JSON.parse(metaPart);
      yield { type: "conv", ...conv };
    } catch { /* ignore */ }
    return;
  }

  // Plain text token
  if (text) yield { type: "token", text };
}
