/**
 * API edge-case unit tests.
 * Tests pure validation logic extracted from API routes — no I/O, no server.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

// ─── Helpers (same logic used in the routes) ───────────────────────────────

function validateDocumentId(documentId) {
  if (!documentId || typeof documentId !== "string") return false;
  if (documentId.trim().length === 0) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(documentId);
}

function safeLimitClamp(raw, max = 20, def = 10) {
  const n = parseInt(raw, 10);
  if (Number.isNaN(n) || n < 1) return def;
  return Math.min(n, max);
}

function sanitiseQuestion(q, maxLen = 2000) {
  if (!q || typeof q !== "string") return null;
  const trimmed = q.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, maxLen);
}

function sanitiseAnswers(raw, maxItems = 200) {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, maxItems)
    .filter(a => a && typeof a === "object" && a.question_id);
}

function safeParseBody(raw) {
  try {
    if (typeof raw === "string") return JSON.parse(raw);
    if (raw && typeof raw === "object") return raw;
    return null;
  } catch {
    return null;
  }
}

function validatePauseDuration(d) {
  return [30, 60, 90].includes(d);
}

function buildConversationIdList(conversations) {
  return (conversations ?? []).map(c => c.id).filter(Boolean);
}

function shouldQueryMessages(conversationIds) {
  return Array.isArray(conversationIds) && conversationIds.length > 0;
}

function sanitiseNotificationTime(raw) {
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return null;
  if (n < 0 || n > 1440) return null;
  return n;
}

// ─── T-API-001: validateDocumentId ─────────────────────────────────────────
describe("T-API-001: validateDocumentId", () => {
  it("accepts valid UUID", () => {
    assert.ok(validateDocumentId("550e8400-e29b-41d4-a716-446655440000"));
  });
  it("rejects empty string", () => {
    assert.equal(validateDocumentId(""), false);
  });
  it("rejects null", () => {
    assert.equal(validateDocumentId(null), false);
  });
  it("rejects undefined", () => {
    assert.equal(validateDocumentId(undefined), false);
  });
  it("rejects number type", () => {
    assert.equal(validateDocumentId(12345), false);
  });
  it("rejects whitespace-only string", () => {
    assert.equal(validateDocumentId("   "), false);
  });
  it("rejects malformed UUID", () => {
    assert.equal(validateDocumentId("550e8400-e29b-41d4"), false);
  });
  it("rejects SQL injection attempt", () => {
    assert.equal(validateDocumentId("1; DROP TABLE documents;--"), false);
  });
});

// ─── T-API-002: safeLimitClamp (pyqs/query) ─────────────────────────────────
describe("T-API-002: safeLimitClamp", () => {
  it("returns default for undefined", () => {
    assert.equal(safeLimitClamp(undefined), 10);
  });
  it("returns default for NaN string", () => {
    assert.equal(safeLimitClamp("abc"), 10);
  });
  it("clamps to max", () => {
    assert.equal(safeLimitClamp(9999, 20), 20);
  });
  it("returns default for zero", () => {
    assert.equal(safeLimitClamp(0), 10);
  });
  it("returns default for negative", () => {
    assert.equal(safeLimitClamp(-5), 10);
  });
  it("respects valid value within range", () => {
    assert.equal(safeLimitClamp(7, 20), 7);
  });
  it("handles string number", () => {
    assert.equal(safeLimitClamp("5", 20), 5);
  });
});

// ─── T-API-003: sanitiseQuestion (quick-chat) ───────────────────────────────
describe("T-API-003: sanitiseQuestion", () => {
  it("trims whitespace", () => {
    assert.equal(sanitiseQuestion("  hello  "), "hello");
  });
  it("returns null for empty string", () => {
    assert.equal(sanitiseQuestion(""), null);
  });
  it("returns null for null", () => {
    assert.equal(sanitiseQuestion(null), null);
  });
  it("returns null for non-string number", () => {
    assert.equal(sanitiseQuestion(42), null);
  });
  it("truncates at maxLen", () => {
    const long = "a".repeat(3000);
    assert.equal(sanitiseQuestion(long, 2000).length, 2000);
  });
  it("returns null for whitespace-only", () => {
    assert.equal(sanitiseQuestion("   "), null);
  });
  it("preserves unicode characters", () => {
    const hindi = "न्यूटन का तीसरा नियम क्या है?";
    assert.equal(sanitiseQuestion(hindi), hindi);
  });
});

// ─── T-API-004: sanitiseAnswers (mock-test/submit) ──────────────────────────
describe("T-API-004: sanitiseAnswers", () => {
  it("returns empty array for null", () => {
    assert.deepEqual(sanitiseAnswers(null), []);
  });
  it("returns empty array for string input", () => {
    assert.deepEqual(sanitiseAnswers("string"), []);
  });
  it("returns empty array for object input", () => {
    assert.deepEqual(sanitiseAnswers({}), []);
  });
  it("filters answers without question_id", () => {
    const input = [
      { question_id: "q1", answer: "A" },
      { answer: "B" },
      null,
      { question_id: "q3" },
    ];
    const result = sanitiseAnswers(input);
    assert.equal(result.length, 2);
    assert.equal(result[0].question_id, "q1");
  });
  it("caps at maxItems", () => {
    const big = Array.from({ length: 500 }, (_, i) => ({ question_id: `q${i}`, answer: "A" }));
    assert.equal(sanitiseAnswers(big, 200).length, 200);
  });
  it("empty array returns empty array", () => {
    assert.deepEqual(sanitiseAnswers([]), []);
  });
  it("preserves answer values", () => {
    const input = [{ question_id: "q1", answer: "C" }];
    assert.equal(sanitiseAnswers(input)[0].answer, "C");
  });
});

// ─── T-API-005: safeParseBody ────────────────────────────────────────────────
describe("T-API-005: safeParseBody (malformed JSON guard)", () => {
  it("parses valid JSON string", () => {
    assert.deepEqual(safeParseBody('{"a":1}'), { a: 1 });
  });
  it("returns null for malformed JSON", () => {
    assert.equal(safeParseBody("{bad json}"), null);
  });
  it("returns null for empty string", () => {
    assert.equal(safeParseBody(""), null);
  });
  it("passes through object", () => {
    const obj = { key: "val" };
    assert.equal(safeParseBody(obj), obj);
  });
  it("returns null for null", () => {
    assert.equal(safeParseBody(null), null);
  });
  it("returns null for number", () => {
    assert.equal(safeParseBody(42), null);
  });
});

// ─── T-API-006: validatePauseDuration ───────────────────────────────────────
describe("T-API-006: validatePauseDuration", () => {
  it("accepts 30", () => { assert.ok(validatePauseDuration(30)); });
  it("accepts 60", () => { assert.ok(validatePauseDuration(60)); });
  it("accepts 90", () => { assert.ok(validatePauseDuration(90)); });
  it("rejects 0", () => { assert.equal(validatePauseDuration(0), false); });
  it("rejects 45", () => { assert.equal(validatePauseDuration(45), false); });
  it("rejects negative", () => { assert.equal(validatePauseDuration(-30), false); });
  it("rejects string '30'", () => { assert.equal(validatePauseDuration("30"), false); });
  it("rejects undefined", () => { assert.equal(validatePauseDuration(undefined), false); });
  it("rejects null", () => { assert.equal(validatePauseDuration(null), false); });
});

// ─── T-API-007: user/export conversation list handling ──────────────────────
describe("T-API-007: buildConversationIdList + shouldQueryMessages", () => {
  it("extracts ids from conversations", () => {
    const convs = [{ id: "a" }, { id: "b" }];
    assert.deepEqual(buildConversationIdList(convs), ["a", "b"]);
  });
  it("handles empty array", () => {
    assert.deepEqual(buildConversationIdList([]), []);
  });
  it("handles null conversations", () => {
    assert.deepEqual(buildConversationIdList(null), []);
  });
  it("filters out entries without id", () => {
    const convs = [{ id: "a" }, {}, { id: null }, { id: "d" }];
    assert.deepEqual(buildConversationIdList(convs), ["a", "d"]);
  });
  it("shouldQueryMessages returns false for empty list", () => {
    assert.equal(shouldQueryMessages([]), false);
  });
  it("shouldQueryMessages returns true for populated list", () => {
    assert.equal(shouldQueryMessages(["id1", "id2"]), true);
  });
  it("shouldQueryMessages returns false for null", () => {
    assert.equal(shouldQueryMessages(null), false);
  });
  it("shouldQueryMessages returns false for non-array string", () => {
    assert.equal(shouldQueryMessages("id1,id2"), false);
  });
});

// ─── T-API-008: sanitiseNotificationTime ────────────────────────────────────
describe("T-API-008: sanitiseNotificationTime", () => {
  it("accepts 0 (midnight)", () => {
    assert.equal(sanitiseNotificationTime(0), 0);
  });
  it("accepts 1440 (end of day)", () => {
    assert.equal(sanitiseNotificationTime(1440), 1440);
  });
  it("accepts valid 420 (7am)", () => {
    assert.equal(sanitiseNotificationTime(420), 420);
  });
  it("rejects -1", () => {
    assert.equal(sanitiseNotificationTime(-1), null);
  });
  it("rejects 1441", () => {
    assert.equal(sanitiseNotificationTime(1441), null);
  });
  it("rejects non-numeric string", () => {
    assert.equal(sanitiseNotificationTime("abc"), null);
  });
  it("parses numeric string '420'", () => {
    assert.equal(sanitiseNotificationTime("420"), 420);
  });
  it("rejects float string (parseInt truncates, still valid)", () => {
    assert.equal(sanitiseNotificationTime("420.9"), 420);
  });
});
