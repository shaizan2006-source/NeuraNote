/**
 * Unit tests — QA cache hit/miss logic and SHA-256 key correctness
 * qa-framework.md test suite: T-CACHE-001 through T-CACHE-010
 *
 * Tests the logic extracted from:
 *   src/app/api/ask/route.js  (lines 17-56, 204-241, 314-317) — cache helpers + bypass conditions
 *
 * Run: node --test tests/unit/cache.test.mjs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

// ── Extracted + inlined: cache key builder (route.js lines 20-23) ──
function buildCacheKey(question, domain, marks, answerMode) {
  const raw = `${question.trim().toLowerCase()}|${domain}|${marks}|${answerMode}`;
  return createHash("sha256").update(raw).digest("hex");
}

// ── Extracted + inlined: TTL boundary (route.js line 30) ──
const CACHE_TTL_DAYS = 7;
function isCacheEntryValid(createdAt) {
  // Mirrors the .gt("created_at", expiryIso) Supabase filter
  const expiryTime = Date.now() - CACHE_TTL_DAYS * 86400_000;
  return new Date(createdAt).getTime() > expiryTime;
}

// ── Extracted + inlined: cache bypass condition (route.js line 206) ──
function shouldCheckCache(usedContext, exportIntent) {
  return !usedContext && !exportIntent;
}

// ── Extracted + inlined: cache store condition (route.js line 315) ──
function shouldStoreInCache(usedContext, fullAnswer) {
  return !usedContext && fullAnswer.length > 50;
}

// ── Extracted + inlined: upsert payload builder (route.js lines 46-55) ──
function buildCacheUpsertPayload(cacheKey, question, classification, answerMode, answer) {
  return {
    cache_key:   cacheKey,
    question,
    domain:      classification.domain,
    marks:       classification.marks,
    answer_mode: answerMode,
    answer,
    classification,
    created_at:  new Date().toISOString(),
  };
}

// ── Extracted + inlined: mock getCachedAnswer (mirrors route.js lines 25-43) ──
// Takes an in-memory "db" array of rows to simulate Supabase query + TTL filter
async function getCachedAnswerMock(cacheKey, db) {
  const expiryIso = new Date(Date.now() - CACHE_TTL_DAYS * 86400_000).toISOString();
  const row = db.find(
    (r) => r.cache_key === cacheKey && r.created_at > expiryIso
  );
  if (!row) return null;
  return { answer: row.answer, classification: row.classification };
}

// ── Shared fixtures ──────────────────────────────────────────────────────────
const Q = "What is an operating system?";
const CLASSIFICATION = { domain: "cs", marks: 10, questionType: "theory", language: "en" };
const ANSWER_50PLUS = "An OS manages hardware resources and provides an interface for user programs to execute safely.";
const ANSWER_SHORT  = "An OS manages resources."; // length < 50

// ════════════════════════════════════════════════════════════════════════════
// T-CACHE-001 — SHA-256 key determinism and format
// ════════════════════════════════════════════════════════════════════════════
describe("T-CACHE-001: SHA-256 key determinism and format", () => {
  test("same inputs always produce the same key", () => {
    const k1 = buildCacheKey(Q, "cs", 10, "detailed");
    const k2 = buildCacheKey(Q, "cs", 10, "detailed");
    assert.equal(k1, k2, "Key must be deterministic");
  });

  test("key is a valid 64-character lowercase hex string (SHA-256 output)", () => {
    const key = buildCacheKey(Q, "cs", 10, "detailed");
    assert.match(key, /^[0-9a-f]{64}$/, "Expected 64-char lowercase hex");
  });

  test("known input produces the expected SHA-256 digest", () => {
    // Pre-computed: sha256("what is an operating system?|cs|10|detailed")
    const expected = createHash("sha256")
      .update("what is an operating system?|cs|10|detailed")
      .digest("hex");
    const actual = buildCacheKey(Q, "cs", 10, "detailed");
    assert.equal(actual, expected);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-CACHE-002 — Key uniqueness: different inputs → different keys
// ════════════════════════════════════════════════════════════════════════════
describe("T-CACHE-002: Key uniqueness across different inputs", () => {
  const BASE = buildCacheKey(Q, "cs", 10, "detailed");

  test("different question → different key", () => {
    const other = buildCacheKey("What is a process?", "cs", 10, "detailed");
    assert.notEqual(BASE, other);
  });

  test("different domain → different key", () => {
    const other = buildCacheKey(Q, "math", 10, "detailed");
    assert.notEqual(BASE, other);
  });

  test("different marks → different key", () => {
    const other = buildCacheKey(Q, "cs", 5, "detailed");
    assert.notEqual(BASE, other);
  });

  test("different answerMode → different key", () => {
    const other = buildCacheKey(Q, "cs", 10, "short");
    assert.notEqual(BASE, other);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-CACHE-003 — Question normalization (trim + toLowerCase)
// ════════════════════════════════════════════════════════════════════════════
describe("T-CACHE-003: Question normalization before hashing", () => {
  test("leading and trailing whitespace is trimmed", () => {
    const base   = buildCacheKey("What is OS?",    "cs", 10, "detailed");
    const padded = buildCacheKey("  What is OS?  ", "cs", 10, "detailed");
    assert.equal(base, padded, "Leading/trailing whitespace must not change the key");
  });

  test("uppercase question produces the same key as lowercase", () => {
    const lower = buildCacheKey("what is os?", "cs", 10, "detailed");
    const upper = buildCacheKey("WHAT IS OS?", "cs", 10, "detailed");
    assert.equal(lower, upper, "Case must be normalized to lowercase before hashing");
  });

  test("mixed-case with padding produces same key as normalized form", () => {
    const normalized = buildCacheKey("what is os?", "cs", 10, "detailed");
    const messy      = buildCacheKey("  WHAT IS OS?  ", "cs", 10, "detailed");
    assert.equal(normalized, messy);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-CACHE-004 — All four components independently affect the key
// ════════════════════════════════════════════════════════════════════════════
describe("T-CACHE-004: All four key components are load-bearing", () => {
  // Baseline: swap one component at a time and verify the key changes
  const base = buildCacheKey("q", "cs", 10, "detailed");

  test("changing question changes the key", () => {
    assert.notEqual(base, buildCacheKey("q2", "cs", 10, "detailed"));
  });
  test("changing domain changes the key", () => {
    assert.notEqual(base, buildCacheKey("q", "math", 10, "detailed"));
  });
  test("changing marks changes the key", () => {
    assert.notEqual(base, buildCacheKey("q", "cs", 5, "detailed"));
  });
  test("changing answerMode changes the key", () => {
    assert.notEqual(base, buildCacheKey("q", "cs", 10, "exam"));
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-CACHE-005 — TTL: entries within 7-day window are valid
// ════════════════════════════════════════════════════════════════════════════
describe("T-CACHE-005: TTL validity — entries inside the 7-day window", () => {
  test("entry created 1 day ago is valid", () => {
    const createdAt = new Date(Date.now() - 1 * 86400_000).toISOString();
    assert.equal(isCacheEntryValid(createdAt), true);
  });

  test("entry created 6 days ago is valid", () => {
    const createdAt = new Date(Date.now() - 6 * 86400_000).toISOString();
    assert.equal(isCacheEntryValid(createdAt), true);
  });

  test("entry created 1 minute ago is valid", () => {
    const createdAt = new Date(Date.now() - 60_000).toISOString();
    assert.equal(isCacheEntryValid(createdAt), true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-CACHE-006 — TTL: entries outside the window are expired
// ════════════════════════════════════════════════════════════════════════════
describe("T-CACHE-006: TTL expiry — entries outside the 7-day window", () => {
  test("entry created 8 days ago is expired", () => {
    const createdAt = new Date(Date.now() - 8 * 86400_000).toISOString();
    assert.equal(isCacheEntryValid(createdAt), false);
  });

  test("entry created exactly 7 days ago is expired (boundary: .gt is strictly greater)", () => {
    // Supabase uses .gt("created_at", expiryIso) — strictly greater-than
    // An entry AT the boundary is NOT valid
    const createdAt = new Date(Date.now() - 7 * 86400_000).toISOString();
    assert.equal(isCacheEntryValid(createdAt), false, "Exactly at TTL boundary must be expired (strict .gt)");
  });

  test("entry created 30 days ago is expired", () => {
    const createdAt = new Date(Date.now() - 30 * 86400_000).toISOString();
    assert.equal(isCacheEntryValid(createdAt), false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-CACHE-007 — Cache bypass conditions (usedContext / exportIntent)
// ════════════════════════════════════════════════════════════════════════════
describe("T-CACHE-007: Cache bypass conditions", () => {
  test("usedContext=false, exportIntent=false → cache IS checked", () => {
    assert.equal(shouldCheckCache(false, false), true);
  });

  test("usedContext=true → cache is skipped (PDF context was used)", () => {
    assert.equal(shouldCheckCache(true, false), false);
  });

  test("exportIntent=true → cache is skipped (export path bypasses cache)", () => {
    assert.equal(shouldCheckCache(false, true), false);
  });

  test("both usedContext=true and exportIntent=true → cache skipped", () => {
    assert.equal(shouldCheckCache(true, true), false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-CACHE-008 — Cache store conditions (after live stream completes)
// ════════════════════════════════════════════════════════════════════════════
describe("T-CACHE-008: Cache store conditions (post-stream)", () => {
  test("usedContext=false + answer >50 chars → answer IS stored", () => {
    assert.equal(shouldStoreInCache(false, ANSWER_50PLUS), true);
  });

  test("usedContext=true → answer is NOT stored (PDF context was used)", () => {
    assert.equal(shouldStoreInCache(true, ANSWER_50PLUS), false);
  });

  test("answer ≤50 chars → NOT stored (too short, likely an error or empty response)", () => {
    assert.equal(shouldStoreInCache(false, ANSWER_SHORT), false,
      `Answer length ${ANSWER_SHORT.length} must not be cached`);
  });

  test("exact 50-char answer is NOT stored (boundary: condition is > 50, not >=)", () => {
    const exactly50 = "A".repeat(50);
    assert.equal(shouldStoreInCache(false, exactly50), false,
      "Boundary: length === 50 must NOT be stored");
  });

  test("51-char answer IS stored", () => {
    const exactly51 = "A".repeat(51);
    assert.equal(shouldStoreInCache(false, exactly51), true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-CACHE-009 — Upsert payload shape matches DB schema
// ════════════════════════════════════════════════════════════════════════════
describe("T-CACHE-009: storeCachedAnswer upsert payload shape", () => {
  const cacheKey = buildCacheKey(Q, "cs", 10, "detailed");
  const payload  = buildCacheUpsertPayload(cacheKey, Q, CLASSIFICATION, "detailed", ANSWER_50PLUS);

  test("payload contains cache_key", () => {
    assert.equal(payload.cache_key, cacheKey);
  });

  test("payload contains question verbatim (not normalized)", () => {
    // The raw question is stored; normalization only happens for key generation
    assert.equal(payload.question, Q);
  });

  test("payload flattens domain and marks at top level", () => {
    assert.equal(payload.domain, "cs");
    assert.equal(payload.marks, 10);
  });

  test("payload contains answer_mode (snake_case column name)", () => {
    assert.equal(payload.answer_mode, "detailed");
    assert.ok(!("answerMode" in payload), "Must use snake_case answer_mode, not camelCase");
  });

  test("payload embeds full classification object", () => {
    assert.deepEqual(payload.classification, CLASSIFICATION);
  });

  test("payload contains created_at as ISO string", () => {
    assert.ok(typeof payload.created_at === "string", "created_at must be a string");
    assert.doesNotThrow(() => new Date(payload.created_at), "created_at must be a valid ISO date");
  });

  test("payload has exactly the expected keys (no extra fields)", () => {
    const expectedKeys = ["cache_key", "question", "domain", "marks", "answer_mode", "answer", "classification", "created_at"];
    const actualKeys   = Object.keys(payload).sort();
    assert.deepEqual(actualKeys, expectedKeys.sort());
  });
});

// ════════════════════════════════════════════════════════════════════════════
// T-CACHE-010 — End-to-end hit/miss simulation (in-memory mock DB)
// ════════════════════════════════════════════════════════════════════════════
describe("T-CACHE-010: End-to-end cache hit/miss with mock DB", () => {
  test("cache miss: key not in DB returns null", async () => {
    const db = [];
    const key = buildCacheKey(Q, "cs", 10, "detailed");
    const result = await getCachedAnswerMock(key, db);
    assert.equal(result, null, "Cache miss must return null");
  });

  test("cache hit: same key, fresh entry returns answer + classification", async () => {
    const key = buildCacheKey(Q, "cs", 10, "detailed");
    const db  = [{
      cache_key:      key,
      answer:         ANSWER_50PLUS,
      classification: CLASSIFICATION,
      created_at:     new Date().toISOString(),  // just now — always fresh
    }];
    const result = await getCachedAnswerMock(key, db);
    assert.notEqual(result, null, "Cache hit must return data");
    assert.equal(result.answer, ANSWER_50PLUS);
    assert.deepEqual(result.classification, CLASSIFICATION);
  });

  test("cache miss: same key but entry is expired (8 days old)", async () => {
    const key = buildCacheKey(Q, "cs", 10, "detailed");
    const db  = [{
      cache_key:      key,
      answer:         ANSWER_50PLUS,
      classification: CLASSIFICATION,
      created_at:     new Date(Date.now() - 8 * 86400_000).toISOString(),
    }];
    const result = await getCachedAnswerMock(key, db);
    assert.equal(result, null, "Expired entry must not be returned");
  });

  test("cache miss: key exists but for different question (hash collision impossible)", async () => {
    const key1 = buildCacheKey(Q, "cs", 10, "detailed");
    const key2 = buildCacheKey("What is a process?", "cs", 10, "detailed");
    const db   = [{
      cache_key:      key1,
      answer:         ANSWER_50PLUS,
      classification: CLASSIFICATION,
      created_at:     new Date().toISOString(),
    }];
    const result = await getCachedAnswerMock(key2, db);
    assert.equal(result, null, "Different question must not match a different key's entry");
  });

  test("repeat query: second call with identical inputs hits the cache", async () => {
    const key = buildCacheKey(Q, "cs", 10, "detailed");
    const db  = [{
      cache_key:      key,
      answer:         ANSWER_50PLUS,
      classification: CLASSIFICATION,
      created_at:     new Date().toISOString(),
    }];

    // First call — hit
    const first = await getCachedAnswerMock(key, db);
    assert.notEqual(first, null);

    // Second call — still a hit (same key, same DB row)
    const second = await getCachedAnswerMock(key, db);
    assert.notEqual(second, null);
    assert.equal(first.answer, second.answer);
  });

  test("normalized repeat query hits the same cache entry as original", async () => {
    // Original question stored with its exact key
    const originalKey  = buildCacheKey(Q, "cs", 10, "detailed");
    // Repeat query with different casing + whitespace normalizes to the same key
    const normalizedKey = buildCacheKey("  WHAT IS AN OPERATING SYSTEM?  ", "cs", 10, "detailed");

    assert.equal(originalKey, normalizedKey,
      "Normalized repeat query must produce the same key as the original");

    const db = [{
      cache_key:      originalKey,
      answer:         ANSWER_50PLUS,
      classification: CLASSIFICATION,
      created_at:     new Date().toISOString(),
    }];
    const result = await getCachedAnswerMock(normalizedKey, db);
    assert.notEqual(result, null, "Normalized repeat query must hit the cache");
    assert.equal(result.answer, ANSWER_50PLUS);
  });
});
