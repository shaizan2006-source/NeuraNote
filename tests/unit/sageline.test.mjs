/**
 * SageLine conversation-engine unit tests — pure logic, no I/O.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canTransition,
  nextStateForTurn,
  splitSentences,
  detectEndIntent,
  buildSagelineSystemPrompt,
} from "../../src/lib/sageline/stateMachine.js";

describe("sageline state machine transitions", () => {
  it("allows the documented forward path", () => {
    assert.equal(canTransition("connecting", "greeting"), true);
    assert.equal(canTransition("greeting", "questioning"), true);
    assert.equal(canTransition("questioning", "clarifying"), true);
    assert.equal(canTransition("clarifying", "questioning"), true);
    assert.equal(canTransition("questioning", "wrapping_up"), true);
    assert.equal(canTransition("wrapping_up", "ended"), true);
  });
  it("allows failure from any live state", () => {
    for (const s of ["connecting", "greeting", "questioning", "clarifying", "wrapping_up"]) {
      assert.equal(canTransition(s, "failed"), true);
    }
  });
  it("rejects illegal jumps and moves out of terminal states", () => {
    assert.equal(canTransition("connecting", "questioning"), false);
    assert.equal(canTransition("greeting", "clarifying"), false);
    assert.equal(canTransition("ended", "questioning"), false);
    assert.equal(canTransition("failed", "greeting"), false);
  });
});

describe("sageline nextStateForTurn", () => {
  const base = { turnIndex: 2, maxTurns: 10 };
  it("routes confusion to clarifying", () => {
    assert.equal(nextStateForTurn({ ...base, state: "questioning", confused: true }), "clarifying");
  });
  it("resolves clarifying back to questioning", () => {
    assert.equal(nextStateForTurn({ ...base, state: "clarifying", confused: false }), "questioning");
  });
  it("wraps up on end intent", () => {
    assert.equal(nextStateForTurn({ ...base, state: "questioning", endIntent: true }), "wrapping_up");
  });
  it("wraps up when the turn budget is exhausted", () => {
    assert.equal(nextStateForTurn({ state: "questioning", turnIndex: 10, maxTurns: 10 }), "wrapping_up");
  });
  it("greeting advances into questioning", () => {
    assert.equal(nextStateForTurn({ ...base, state: "greeting" }), "questioning");
  });
  it("stays in questioning by default", () => {
    assert.equal(nextStateForTurn({ ...base, state: "questioning" }), "questioning");
  });
});

describe("sageline splitSentences", () => {
  it("splits on . ? ! and returns the remainder", () => {
    const { sentences, remainder } = splitSentences("Hello there. How are you? I am fine");
    assert.deepEqual(sentences, ["Hello there.", "How are you?"]);
    assert.equal(remainder, "I am fine");
  });
  it("splits on the Devanagari danda", () => {
    const { sentences } = splitSentences("नमस्ते। कैसे हो।");
    assert.equal(sentences.length, 2);
  });
  it("does not split inside decimals", () => {
    const { sentences, remainder } = splitSentences("Pi is 3.14 roughly");
    assert.deepEqual(sentences, []);
    assert.equal(remainder, "Pi is 3.14 roughly");
  });
  it("returns no sentences when there is no terminator", () => {
    const { sentences, remainder } = splitSentences("still talking");
    assert.deepEqual(sentences, []);
    assert.equal(remainder, "still talking");
  });
});

describe("sageline detectEndIntent", () => {
  it("detects English end phrases", () => {
    assert.equal(detectEndIntent("ok that's all thanks"), true);
    assert.equal(detectEndIntent("bye"), true);
    assert.equal(detectEndIntent("I'm done for now"), true);
  });
  it("detects Hindi/Hinglish end phrases", () => {
    assert.equal(detectEndIntent("bas itna hi"), true);
    assert.equal(detectEndIntent("theek hai bye"), true);
  });
  it("does not fire on normal doubts", () => {
    assert.equal(detectEndIntent("can you explain osmosis again"), false);
    assert.equal(detectEndIntent("what is the answer"), false);
  });
});

describe("sageline system prompt", () => {
  it("is Socratic-first and multilingual, injects doc context", () => {
    const p = buildSagelineSystemPrompt({
      studentName: "Aarav",
      docName: "Thermodynamics Ch 3",
      ragContext: "Entropy always increases in an isolated system.",
      languageHint: "hi",
    });
    assert.ok(/question/i.test(p));            // guides with questions
    assert.ok(p.includes("Thermodynamics Ch 3"));
    assert.ok(p.includes("Entropy always increases"));
    assert.ok(/language|hinglish|mix/i.test(p)); // code-switching instruction
  });
  it("omits the context block cleanly when no doc", () => {
    const p = buildSagelineSystemPrompt({ studentName: "Aarav", docName: null, ragContext: "", languageHint: null });
    assert.ok(!/undefined|null/.test(p));
  });
});
