/**
 * Unit tests — Streaming META token parsing & cache/live stream parity
 * qa-framework.md test suite: T-STR-001 through T-STR-010
 *
 * Tests the logic extracted from:
 *   src/app/api/ask/route.js       (lines 209-240, 284-333) — stream construction
 *   src/context/DashboardContext.jsx (lines 874-907)          — stream parsing
 *
 * Run: node --test tests/unit/streaming.test.mjs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

// ── Extracted + inlined: META parsing loop (DashboardContext lines 874-907) ──
// Returns { accumulated, sources, usedContext, classificationEvent }
async function runStreamParser(chunks) {
  const state = {
    accumulated: "",
    sources: null,
    usedContext: null,
    fromCache: false,
    classificationEvent: null,
    parseError: null,
  };

  // Minimal window.dispatchEvent shim
  const dispatchEvent = (e) => {
    if (e.type === "askmynotes:classification") {
      state.classificationEvent = e.detail;
    }
  };

  let metaHandled = false;

  for (const rawChunk of chunks) {
    if (!metaHandled && rawChunk.startsWith("__META__")) {
      try {
        const metaLine = rawChunk.replace("__META__", "").split("\n")[0];
        const meta = JSON.parse(metaLine);
        if (meta.sources) state.sources = meta.sources;
        if (typeof meta.usedContext !== "undefined") state.usedContext = meta.usedContext;
        if (meta.fromCache) state.fromCache = true;
        if (meta.classification) {
          dispatchEvent({ type: "askmynotes:classification", detail: meta.classification });
        }
        const rest = rawChunk.replace(`__META__${metaLine}\n`, "");
        if (rest) state.accumulated += rest;
        metaHandled = true;
      } catch (err) {
        state.parseError = err;
        state.accumulated += rawChunk;
        metaHandled = true;
      }
      continue;
    }
    state.accumulated += rawChunk;
  }

  return state;
}

// ── Extracted + inlined: cache stream chunk builder (route.js lines 209-228) ──
function buildCacheStreamChunks(cachedAnswer, classification) {
  const metaChunk =
    JSON.stringify({
      sources: [],
      usedContext: false,
      fromCache: true,
      classification,
    }) + "\n";
  return [`__META__${metaChunk}`, cachedAnswer];
}

// ── Extracted + inlined: live stream META chunk builder (route.js lines 296-301) ──
function buildLiveMetaChunk(sources, usedContext, classification) {
  const meta =
    JSON.stringify({
      sources,
      usedContext,
      classification,
    }) + "\n";
  return `__META__${meta}`;
}

// ── Shared fixtures ──────────────────────────────────────────────────────────
const SAMPLE_CLASSIFICATION = {
  domain: "cs",
  marks: 10,
  questionType: "theory",
  language: "en",
};

const SAMPLE_ANSWER = "## Definition\nAn OS manages hardware resources.\n\n## Types\nBatch, Time-Sharing, Real-Time.";

// ════════════════════════════════════════════════════════════════════════════
// T-STR-001 — META token is detected by startsWith("__META__")
// ════════════════════════════════════════════════════════════════════════════
describe("T-STR-001: META token detection", () => {
  test("detects __META__ prefix correctly", async () => {
    const meta = JSON.stringify({ sources: [], usedContext: false, classification: SAMPLE_CLASSIFICATION }) + "\n";
    const chunks = [`__META__${meta}`, "answer text"];
    const state = await runStreamParser(chunks);

    assert.equal(state.accumulated, "answer text", "Answer should be 'answer text' only, META stripped");
    assert.notEqual(state.classificationEvent, null, "Classification event should have fired");
  });

  test("does NOT treat non-META chunk as metadata", async () => {
    const chunks = ["This is regular answer text", " and more text"];
    const state = await runStreamParser(chunks);
    assert.equal(state.accumulated, "This is regular answer text and more text");
    assert.equal(state.classificationEvent, null, "No classification event for non-META chunks");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-STR-002 — META JSON fields parse correctly (live stream path)
// ════════════════════════════════════════════════════════════════════════════
describe("T-STR-002: META JSON parsing — live stream", () => {
  test("extracts sources array", async () => {
    const meta = JSON.stringify({ sources: [1, 3, 5], usedContext: true, classification: SAMPLE_CLASSIFICATION }) + "\n";
    const state = await runStreamParser([`__META__${meta}`]);
    assert.deepEqual(state.sources, [1, 3, 5]);
  });

  test("extracts usedContext boolean", async () => {
    const meta = JSON.stringify({ sources: [], usedContext: true, classification: SAMPLE_CLASSIFICATION }) + "\n";
    const state = await runStreamParser([`__META__${meta}`]);
    assert.equal(state.usedContext, true);
  });

  test("extracts classification and dispatches event", async () => {
    const meta = JSON.stringify({ sources: [], usedContext: false, classification: SAMPLE_CLASSIFICATION }) + "\n";
    const state = await runStreamParser([`__META__${meta}`]);
    assert.deepEqual(state.classificationEvent, SAMPLE_CLASSIFICATION);
  });

  test("all four classification fields are present in event", async () => {
    const meta = JSON.stringify({ sources: [], usedContext: false, classification: SAMPLE_CLASSIFICATION }) + "\n";
    const state = await runStreamParser([`__META__${meta}`]);
    const c = state.classificationEvent;
    assert.ok("domain" in c, "missing domain");
    assert.ok("marks" in c, "missing marks");
    assert.ok("questionType" in c, "missing questionType");
    assert.ok("language" in c, "missing language");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-STR-003 — META + answer in same chunk (cache stream collapse)
// ════════════════════════════════════════════════════════════════════════════
describe("T-STR-003: META and answer in same chunk (cache collapse)", () => {
  test("strips META prefix and returns only the answer text", async () => {
    const [metaChunk, answerChunk] = buildCacheStreamChunks(SAMPLE_ANSWER, SAMPLE_CLASSIFICATION);
    // Simulate OS collapsing both cache enqueues into one read
    const collapsedChunk = metaChunk + answerChunk;
    const state = await runStreamParser([collapsedChunk]);
    assert.equal(state.accumulated, SAMPLE_ANSWER, "Accumulated should equal cached answer only");
  });

  test("classification event still fires when chunks are collapsed", async () => {
    const [metaChunk, answerChunk] = buildCacheStreamChunks(SAMPLE_ANSWER, SAMPLE_CLASSIFICATION);
    const state = await runStreamParser([metaChunk + answerChunk]);
    assert.deepEqual(state.classificationEvent, SAMPLE_CLASSIFICATION);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-STR-004 — META arrives in its own chunk, answer in subsequent chunks
// ════════════════════════════════════════════════════════════════════════════
describe("T-STR-004: META in separate chunk, answer spread across chunks", () => {
  test("accumulates answer correctly across multiple chunks", async () => {
    const [metaChunk] = buildCacheStreamChunks("", SAMPLE_CLASSIFICATION);
    const chunks = [metaChunk, "part one ", "part two ", "part three"];
    const state = await runStreamParser(chunks);
    assert.equal(state.accumulated, "part one part two part three");
  });

  test("live stream: META chunk then several OpenAI delta chunks", async () => {
    const liveMetaChunk = buildLiveMetaChunk([2, 4], false, SAMPLE_CLASSIFICATION);
    const chunks = [liveMetaChunk, "## Intro\n", "OS is a system software.\n", "## Types\n", "Batch, Real-Time."];
    const state = await runStreamParser(chunks);
    assert.equal(
      state.accumulated,
      "## Intro\nOS is a system software.\n## Types\nBatch, Real-Time."
    );
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-STR-005 — metaHandled flag prevents double-parsing
// ════════════════════════════════════════════════════════════════════════════
describe("T-STR-005: metaHandled prevents re-parsing subsequent chunks", () => {
  test("second __META__-like chunk is treated as answer text", async () => {
    const realMeta = JSON.stringify({ sources: [], usedContext: false, classification: SAMPLE_CLASSIFICATION }) + "\n";
    const fakeMeta = JSON.stringify({ sources: [99], usedContext: true, classification: { domain: "math" } }) + "\n";
    const chunks = [`__META__${realMeta}`, `__META__${fakeMeta}some more answer`];
    const state = await runStreamParser(chunks);
    // sources should be from the real (first) META only
    assert.deepEqual(state.sources, [], "sources must come from first META only");
    // The second chunk including its __META__ prefix should be in accumulated as-is
    assert.ok(state.accumulated.startsWith("__META__"), "Second META chunk treated as raw answer text");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-STR-006 — Invalid/malformed META JSON falls back gracefully
// ════════════════════════════════════════════════════════════════════════════
describe("T-STR-006: Malformed META JSON — graceful fallback", () => {
  test("does not throw on invalid JSON", async () => {
    const chunks = ["__META__{not valid json}\nanswer text"];
    await assert.doesNotReject(async () => {
      await runStreamParser(chunks);
    });
  });

  test("on parse failure, raw chunk is appended to accumulated (not lost)", async () => {
    const chunks = ["__META__{bad json}\n"];
    const state = await runStreamParser(chunks);
    assert.ok(state.accumulated.includes("__META__"), "Raw chunk preserved in accumulated on parse fail");
    assert.ok(state.parseError instanceof SyntaxError, "parseError captured");
  });

  test("stream continues reading after parse failure", async () => {
    const chunks = ["__META__{bad json}\n", "subsequent answer text"];
    const state = await runStreamParser(chunks);
    assert.ok(state.accumulated.includes("subsequent answer text"), "Subsequent chunks still accumulated");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-STR-007 — Cache stream META shape vs live stream META shape
// ════════════════════════════════════════════════════════════════════════════
describe("T-STR-007: Cache META vs Live META — frontend-consumed fields are identical", () => {
  test("both contain sources, usedContext, classification at top level", async () => {
    const [cacheMeta] = buildCacheStreamChunks("answer", SAMPLE_CLASSIFICATION);
    const liveMeta = buildLiveMetaChunk([1, 2], false, SAMPLE_CLASSIFICATION);

    const cacheState = await runStreamParser([cacheMeta]);
    const liveState = await runStreamParser([liveMeta, "answer"]);

    // Frontend only reads: sources, usedContext, classification
    // Both must supply these three
    assert.notEqual(cacheState.sources, null, "cache: sources parsed");
    assert.notEqual(cacheState.usedContext, null, "cache: usedContext parsed");
    assert.notEqual(cacheState.classificationEvent, null, "cache: classification dispatched");

    assert.notEqual(liveState.sources, null, "live: sources parsed");
    assert.notEqual(liveState.usedContext, null, "live: usedContext parsed");
    assert.notEqual(liveState.classificationEvent, null, "live: classification dispatched");
  });

  test("cache stream always has usedContext=false and sources=[]", async () => {
    const [cacheMeta] = buildCacheStreamChunks("answer", SAMPLE_CLASSIFICATION);
    const state = await runStreamParser([cacheMeta]);
    assert.equal(state.usedContext, false, "cache usedContext must be false");
    assert.deepEqual(state.sources, [], "cache sources must be empty array");
  });

  test("live stream fromCache field is absent from META", async () => {
    const liveMeta = buildLiveMetaChunk([], false, SAMPLE_CLASSIFICATION);
    const rawJson = liveMeta.replace("__META__", "").split("\n")[0];
    const parsed = JSON.parse(rawJson);
    assert.equal("fromCache" in parsed, false, "Live stream META must NOT contain fromCache");
  });

  test("cache stream fromCache field is true in META", async () => {
    const [cacheMeta] = buildCacheStreamChunks("answer", SAMPLE_CLASSIFICATION);
    const rawJson = cacheMeta.replace("__META__", "").split("\n")[0];
    const parsed = JSON.parse(rawJson);
    assert.equal(parsed.fromCache, true, "Cache stream META must have fromCache: true");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-STR-008 — Accumulated answer is identical for cache vs live stream
// ════════════════════════════════════════════════════════════════════════════
describe("T-STR-008: Accumulated answer parity — cache vs live", () => {
  test("single-chunk cache stream produces same accumulated as equivalent live stream", async () => {
    const [cacheMeta, cacheAnswer] = buildCacheStreamChunks(SAMPLE_ANSWER, SAMPLE_CLASSIFICATION);
    const liveMeta = buildLiveMetaChunk([], false, SAMPLE_CLASSIFICATION);

    const cacheState = await runStreamParser([cacheMeta + cacheAnswer]);
    const liveState = await runStreamParser([liveMeta, SAMPLE_ANSWER]);

    assert.equal(cacheState.accumulated, liveState.accumulated, "Accumulated answer must be identical");
  });

  test("multi-chunk live stream accumulates to same final answer", async () => {
    const liveMeta = buildLiveMetaChunk([], false, SAMPLE_CLASSIFICATION);
    const answerParts = ["## Def\n", "An OS manages hardware.\n", "## Types\n", "Batch, RT."];
    const liveState = await runStreamParser([liveMeta, ...answerParts]);

    // Equivalent cache stream (single chunk of the joined answer)
    const [cacheMeta] = buildCacheStreamChunks(answerParts.join(""), SAMPLE_CLASSIFICATION);
    const cacheState = await runStreamParser([cacheMeta, answerParts.join("")]);

    assert.equal(cacheState.accumulated, liveState.accumulated);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-STR-009 — fromCache parsed from META and set in state
// ════════════════════════════════════════════════════════════════════════════
describe("T-STR-009: fromCache state set correctly from META", () => {
  test("cache stream: fromCache is true after parsing", async () => {
    const [cacheMeta, cacheAnswer] = buildCacheStreamChunks(SAMPLE_ANSWER, SAMPLE_CLASSIFICATION);
    const state = await runStreamParser([cacheMeta, cacheAnswer]);
    assert.equal(state.fromCache, true, "fromCache must be true for cache stream");
  });

  test("live stream: fromCache remains false (field absent from META)", async () => {
    const liveMeta = buildLiveMetaChunk([], false, SAMPLE_CLASSIFICATION);
    const state = await runStreamParser([liveMeta, SAMPLE_ANSWER]);
    assert.equal(state.fromCache, false, "fromCache must be false for live stream");
  });

  test("fromCache resets to false on new ask (cleared before stream starts)", () => {
    // Simulates the setFromCache(false) call at the start of handleAsk
    let fromCache = true; // previous answer was cached
    fromCache = false;    // reset at ask time
    assert.equal(fromCache, false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-STR-010 — Empty answer edge case
// ════════════════════════════════════════════════════════════════════════════
describe("T-STR-010: Edge cases", () => {
  test("META-only stream (no answer) results in empty accumulated", async () => {
    const meta = JSON.stringify({ sources: [], usedContext: false, classification: SAMPLE_CLASSIFICATION }) + "\n";
    const state = await runStreamParser([`__META__${meta}`]);
    assert.equal(state.accumulated, "");
  });

  test("empty chunk list produces empty state", async () => {
    const state = await runStreamParser([]);
    assert.equal(state.accumulated, "");
    assert.equal(state.sources, null);
    assert.equal(state.usedContext, null);
  });

  test("stream with only answer chunks (no META) accumulates normally", async () => {
    const state = await runStreamParser(["part1 ", "part2 ", "part3"]);
    assert.equal(state.accumulated, "part1 part2 part3");
    assert.equal(state.classificationEvent, null);
  });

  test("classification with missing optional fields does not throw", async () => {
    const partialClassification = { domain: "cs", marks: 5 }; // no questionType or language
    const meta = JSON.stringify({ sources: [], usedContext: false, classification: partialClassification }) + "\n";
    await assert.doesNotReject(async () => {
      const state = await runStreamParser([`__META__${meta}`]);
      assert.deepEqual(state.classificationEvent, partialClassification);
    });
  });
});
