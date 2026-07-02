/**
 * Doubt sidebar isolation-core unit tests — pure logic, no I/O.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildParentKey,
  buildDoubtSystemPrompt,
  parseSuggestedDoubts,
  validEditTarget,
} from "../../src/lib/doubt.js";

describe("doubt parent key", () => {
  it("deterministic + 32 hex chars", () => {
    const k1 = buildParentKey("Q1", "A1");
    assert.equal(k1, buildParentKey("Q1", "A1"));
    assert.match(k1, /^[0-9a-f]{32}$/);
  });
  it("distinct per Q&A pair (regenerated answer → new thread)", () => {
    assert.notEqual(buildParentKey("Q1", "A1"), buildParentKey("Q1", "A2"));
    assert.notEqual(buildParentKey("Q1", "A1"), buildParentKey("Q2", "A1"));
  });
  it("separator prevents boundary collisions", () => {
    assert.notEqual(buildParentKey("ab", "c"), buildParentKey("a", "bc"));
  });
});

describe("doubt system prompt isolation", () => {
  it("contains ONLY the parent Q&A", () => {
    const p = buildDoubtSystemPrompt("What is a monad?", "A monad is a monoid...");
    assert.ok(p.includes("What is a monad?"));
    assert.ok(p.includes("A monad is a monoid..."));
    assert.ok(!p.toLowerCase().includes("previous conversation"));
    assert.ok(!p.toLowerCase().includes("chat history"));
  });
});

describe("parseSuggestedDoubts", () => {
  it("parses a plain JSON array", () => {
    const out = parseSuggestedDoubts('[{"label":"a","prompt":"b"}]');
    assert.deepEqual(out, [{ label: "a", prompt: "b" }]);
  });
  it("extracts from fenced output and clamps to 3", () => {
    const raw = '```json\n[{"label":"a","prompt":"b"},{"label":"c","prompt":"d"},{"label":"e","prompt":"f"},{"label":"g","prompt":"h"}]\n```';
    assert.equal(parseSuggestedDoubts(raw).length, 3);
  });
  it("tolerates garbage", () => {
    assert.deepEqual(parseSuggestedDoubts("not json"), []);
    assert.deepEqual(parseSuggestedDoubts('[{"nope":1}]'), []);
    assert.deepEqual(parseSuggestedDoubts(null), []);
    assert.deepEqual(parseSuggestedDoubts('{"label":"a"}'), []);
  });
});

describe("validEditTarget", () => {
  it("main_answer requires a 32-hex parent key", () => {
    assert.equal(validEditTarget("main_answer", buildParentKey("q", "a")), true);
    assert.equal(validEditTarget("main_answer", "short"), false);
    assert.equal(validEditTarget("main_answer", null), false);
  });
  it("doubt_message requires a uuid", () => {
    assert.equal(validEditTarget("doubt_message", "11111111-1111-1111-1111-111111111111"), true);
    assert.equal(validEditTarget("doubt_message", "not-a-uuid"), false);
  });
  it("rejects unknown target types", () => {
    assert.equal(validEditTarget("conversation", "11111111-1111-1111-1111-111111111111"), false);
  });
});
