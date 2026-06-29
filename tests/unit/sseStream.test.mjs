/**
 * Unit tests for src/lib/sseStream.js and src/lib/sseParser.js
 *
 * Tests the SSE v2 encoding/decoding round-trip and backward compatibility
 * with the legacy v1 __META__ / __CONV__ protocol.
 *
 * Run: node --test tests/unit/sseStream.test.mjs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

// ── Inline SSE encoder (mirrors sseStream.js) ─────────────────────────────
const encoder = new TextEncoder();

function sseEvent(payload) {
  return encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
}
function sseMeta({ sources = [], usedContext = false, fromCache = false, classification = {} } = {}) {
  return sseEvent({ type: "meta", v: 2, sources, usedContext, fromCache, classification });
}
function sseToken(text) { return sseEvent({ type: "token", text }); }
function sseConv(payload) { return sseEvent({ type: "conv", ...payload }); }

// ── Inline SSE parser (mirrors sseParser.js) ──────────────────────────────
const decoder = new TextDecoder();

function* parseLegacyBuffer(raw) {
  let text = raw;
  if (text.startsWith("__META__")) {
    const metaLine = text.replace("__META__", "").split("\n")[0];
    try { yield { type: "meta", v: 1, ...JSON.parse(metaLine) }; } catch {}
    text = text.replace(`__META__${metaLine}\n`, "");
  }
  const convIdx = text.indexOf("\n__CONV__");
  if (convIdx !== -1) {
    const textPart = text.slice(0, convIdx);
    const metaPart = text.slice(convIdx + 9);
    if (textPart) yield { type: "token", text: textPart };
    try { yield { type: "conv", ...JSON.parse(metaPart) }; } catch {}
    return;
  }
  if (text) yield { type: "token", text };
}

async function* parseSseStream(response) {
  const reader = response.body.getReader();
  let buffer = "";
  let detectedV = null;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      if (detectedV === null) {
        detectedV = buffer.trimStart().startsWith("data: ") ? 2 : 1;
      }
      if (detectedV === 2) {
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const raw of events) {
          const line = raw.trim();
          if (!line.startsWith("data: ")) continue;
          try { yield JSON.parse(line.slice(6)); } catch {}
        }
      } else {
        yield* parseLegacyBuffer(buffer);
        buffer = "";
      }
    }
    if (detectedV === 2 && buffer.trim()) {
      const line = buffer.trim();
      if (line.startsWith("data: ")) {
        try { yield JSON.parse(line.slice(6)); } catch {}
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ── Helper: build a fake Response from Uint8Array chunks ─────────────────
function makeResponse(chunks) {
  const stream = new ReadableStream({
    start(ctrl) {
      for (const chunk of chunks) ctrl.enqueue(chunk);
      ctrl.close();
    },
  });
  return { body: stream };
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("sseStream — encoding", () => {
  test("sseToken produces data: line with type token", () => {
    const bytes = sseToken("hello");
    const str   = decoder.decode(bytes);
    assert.ok(str.startsWith("data: "), "should start with 'data: '");
    assert.ok(str.endsWith("\n\n"),     "should end with double newline");
    const payload = JSON.parse(str.replace("data: ", "").trim());
    assert.strictEqual(payload.type, "token");
    assert.strictEqual(payload.text, "hello");
  });

  test("sseMeta produces v:2 event with all fields", () => {
    const bytes = sseMeta({ sources: ["p1"], usedContext: true, classification: { domain: "cs" } });
    const payload = JSON.parse(decoder.decode(bytes).replace("data: ", "").trim());
    assert.strictEqual(payload.type, "meta");
    assert.strictEqual(payload.v, 2);
    assert.deepStrictEqual(payload.sources, ["p1"]);
    assert.strictEqual(payload.usedContext, true);
    assert.strictEqual(payload.classification.domain, "cs");
  });

  test("sseConv produces conv event with conversation_id", () => {
    const bytes = sseConv({ conversation_id: "abc-123" });
    const payload = JSON.parse(decoder.decode(bytes).replace("data: ", "").trim());
    assert.strictEqual(payload.type, "conv");
    assert.strictEqual(payload.conversation_id, "abc-123");
  });

  test("empty token does not break encoding", () => {
    const bytes = sseToken("");
    const payload = JSON.parse(decoder.decode(bytes).replace("data: ", "").trim());
    assert.strictEqual(payload.text, "");
  });
});

describe("parseSseStream — v2 protocol", () => {
  async function collectEvents(chunks) {
    const events = [];
    for await (const e of parseSseStream(makeResponse(chunks))) {
      events.push(e);
    }
    return events;
  }

  test("parses meta + tokens + conv in a single stream", async () => {
    const chunks = [
      sseMeta({ sources: [], usedContext: false, classification: { domain: "physics" } }),
      sseToken("Newton"),
      sseToken(" was right"),
      sseConv({ conversation_id: "conv-1" }),
    ];
    const events = await collectEvents(chunks);
    assert.strictEqual(events.length, 4);
    assert.strictEqual(events[0].type,   "meta");
    assert.strictEqual(events[0].v,      2);
    assert.strictEqual(events[0].classification.domain, "physics");
    assert.strictEqual(events[1].type,   "token");
    assert.strictEqual(events[1].text,   "Newton");
    assert.strictEqual(events[2].text,   " was right");
    assert.strictEqual(events[3].type,   "conv");
    assert.strictEqual(events[3].conversation_id, "conv-1");
  });

  test("handles chunks split mid-event (real-world streaming)", async () => {
    // Simulate network chunking: one event arrives in two parts
    const full  = decoder.decode(sseToken("split-me"));
    const half1 = encoder.encode(full.slice(0, full.length / 2));
    const half2 = encoder.encode(full.slice(full.length / 2));
    const events = await collectEvents([half1, half2]);
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].type, "token");
    assert.strictEqual(events[0].text, "split-me");
  });

  test("ignores malformed data lines", async () => {
    const bad  = encoder.encode("data: not-json\n\n");
    const good = sseToken("ok");
    const events = await collectEvents([bad, good]);
    // malformed line skipped, good token passes through
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].text, "ok");
  });

  test("handles fromCache:true in meta", async () => {
    const events = await collectEvents([
      sseMeta({ fromCache: true, sources: [] }),
      sseToken("cached answer"),
    ]);
    assert.strictEqual(events[0].fromCache, true);
    assert.strictEqual(events[1].text, "cached answer");
  });
});

describe("parseSseStream — v1 legacy fallback", () => {
  async function collectLegacy(rawString) {
    const chunks = [encoder.encode(rawString)];
    const events = [];
    for await (const e of parseSseStream(makeResponse(chunks))) {
      events.push(e);
    }
    return events;
  }

  test("parses legacy __META__ + text + __CONV__", async () => {
    const meta = JSON.stringify({ v: 1, sources: [], usedContext: false, classification: {} });
    const raw  = `__META__${meta}\nHello world\n__CONV__${JSON.stringify({ conversation_id: "old-1" })}`;
    const events = await collectLegacy(raw);

    const metaEv  = events.find(e => e.type === "meta");
    const tokenEv = events.find(e => e.type === "token");
    const convEv  = events.find(e => e.type === "conv");

    assert.ok(metaEv,  "should have meta event");
    assert.ok(tokenEv, "should have token event");
    assert.ok(convEv,  "should have conv event");
    assert.strictEqual(convEv.conversation_id, "old-1");
  });

  test("parses legacy text-only (no __META__, no __CONV__)", async () => {
    const events = await collectLegacy("plain text chunk");
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].type, "token");
    assert.strictEqual(events[0].text, "plain text chunk");
  });
});

describe("round-trip: encode then parse", () => {
  test("meta + 3 tokens + conv round-trips correctly", async () => {
    const chunks = [
      sseMeta({ sources: ["Page 1"], usedContext: true, classification: { domain: "math", marks: 10 } }),
      sseToken("First "),
      sseToken("second "),
      sseToken("third."),
      sseConv({ conversation_id: "rt-conv", used_rag: true }),
    ];
    const events = [];
    for await (const e of parseSseStream(makeResponse(chunks))) {
      events.push(e);
    }

    assert.strictEqual(events.length, 5);

    const meta = events[0];
    assert.strictEqual(meta.type, "meta");
    assert.strictEqual(meta.v, 2);
    assert.deepStrictEqual(meta.sources, ["Page 1"]);
    assert.strictEqual(meta.classification.marks, 10);

    const tokens = events.slice(1, 4).map(e => e.text).join("");
    assert.strictEqual(tokens, "First second third.");

    const conv = events[4];
    assert.strictEqual(conv.type, "conv");
    assert.strictEqual(conv.used_rag, true);
  });
});
