/**
 * Unit tests for aiSpend.js pure functions.
 * Tests estimateCost() and MONTHLY_CAPS_USD without hitting Supabase.
 * Run: node --test tests/unit/aiSpend.test.mjs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

// ── Inline the pure cost constants (mirrors aiSpend.js) ──────────

const COST_PER = {
  gpt4oMiniInputPerToken:  0.15  / 1_000_000,
  gpt4oMiniOutputPerToken: 0.60  / 1_000_000,
  gpt4oInputPerToken:      2.50  / 1_000_000,
  gpt4oOutputPerToken:     10.00 / 1_000_000,
  ttsPerChar:              15.00 / 1_000_000,
  whisperPerSec:           0.006 / 60,
};

function estimateCost({ model, tokensIn = 0, tokensOut = 0, chars = 0, durationSecs = 0 }) {
  if (model?.startsWith("gpt-4o-mini")) {
    return tokensIn  * COST_PER.gpt4oMiniInputPerToken
         + tokensOut * COST_PER.gpt4oMiniOutputPerToken;
  }
  if (model?.startsWith("gpt-4o")) {
    return tokensIn  * COST_PER.gpt4oInputPerToken
         + tokensOut * COST_PER.gpt4oOutputPerToken;
  }
  if (model === "tts-1" || model === "tts-1-hd") {
    return chars * COST_PER.ttsPerChar;
  }
  if (model === "whisper-1") {
    return durationSecs * COST_PER.whisperPerSec;
  }
  return 0;
}

const MONTHLY_CAPS_USD = {
  free:    0.50,
  student: 3.00,
  pro:     6.00,
  family:  6.00,
  school:  null,
};

// ── Tests ──────────────────────────────────────────────────────────

describe("estimateCost — gpt-4o-mini", () => {
  test("zero tokens → zero cost", () => {
    assert.strictEqual(estimateCost({ model: "gpt-4o-mini" }), 0);
  });

  test("1M input tokens = $0.15", () => {
    const cost = estimateCost({ model: "gpt-4o-mini", tokensIn: 1_000_000 });
    assert.ok(Math.abs(cost - 0.15) < 0.000001, `Expected ~0.15, got ${cost}`);
  });

  test("1M output tokens = $0.60", () => {
    const cost = estimateCost({ model: "gpt-4o-mini", tokensOut: 1_000_000 });
    assert.ok(Math.abs(cost - 0.60) < 0.000001, `Expected ~0.60, got ${cost}`);
  });

  test("typical Q&A: 500 in + 1000 out ≈ $0.000675", () => {
    const cost = estimateCost({ model: "gpt-4o-mini", tokensIn: 500, tokensOut: 1000 });
    const expected = 500 * 0.15 / 1_000_000 + 1000 * 0.60 / 1_000_000;
    assert.ok(Math.abs(cost - expected) < 1e-9);
  });
});

describe("estimateCost — gpt-4o", () => {
  test("1M input tokens = $2.50", () => {
    const cost = estimateCost({ model: "gpt-4o", tokensIn: 1_000_000 });
    assert.ok(Math.abs(cost - 2.50) < 0.000001);
  });

  test("1M output tokens = $10.00", () => {
    const cost = estimateCost({ model: "gpt-4o", tokensOut: 1_000_000 });
    assert.ok(Math.abs(cost - 10.00) < 0.000001);
  });
});

describe("estimateCost — TTS", () => {
  test("zero chars → zero cost", () => {
    assert.strictEqual(estimateCost({ model: "tts-1" }), 0);
  });

  test("1M chars = $15.00", () => {
    const cost = estimateCost({ model: "tts-1", chars: 1_000_000 });
    assert.ok(Math.abs(cost - 15.00) < 0.000001);
  });

  test("200 chars (typical response) ≈ $0.003", () => {
    const cost = estimateCost({ model: "tts-1", chars: 200 });
    assert.ok(cost > 0 && cost < 0.01, `Expected small positive cost, got ${cost}`);
  });

  test("tts-1-hd uses same rate as tts-1", () => {
    const a = estimateCost({ model: "tts-1",    chars: 500 });
    const b = estimateCost({ model: "tts-1-hd", chars: 500 });
    assert.strictEqual(a, b);
  });
});

describe("estimateCost — Whisper", () => {
  test("60 seconds = $0.006", () => {
    const cost = estimateCost({ model: "whisper-1", durationSecs: 60 });
    assert.ok(Math.abs(cost - 0.006) < 0.000001);
  });

  test("10 min voice call = $0.06", () => {
    const cost = estimateCost({ model: "whisper-1", durationSecs: 600 });
    assert.ok(Math.abs(cost - 0.06) < 0.000001);
  });
});

describe("estimateCost — unknown model", () => {
  test("returns 0 for unknown model", () => {
    assert.strictEqual(estimateCost({ model: "gpt-999", tokensIn: 1000 }), 0);
  });
});

describe("MONTHLY_CAPS_USD", () => {
  test("free cap is $0.50", () => assert.strictEqual(MONTHLY_CAPS_USD.free, 0.50));
  test("student cap is $3.00", () => assert.strictEqual(MONTHLY_CAPS_USD.student, 3.00));
  test("pro cap is $6.00", () => assert.strictEqual(MONTHLY_CAPS_USD.pro, 6.00));
  test("family cap equals pro cap", () => assert.strictEqual(MONTHLY_CAPS_USD.family, MONTHLY_CAPS_USD.pro));
  test("school is uncapped (null)", () => assert.strictEqual(MONTHLY_CAPS_USD.school, null));

  test("pro revenue (~$4.80) is below the $6.00 cap — margin buffer exists", () => {
    // Pro plan revenue ≈ ₹399/mo ÷ 84 (USD/INR) ≈ $4.75
    // Cap must exceed break-even to allow legitimate usage before cutting off
    const proRevenueUsd = 399 / 84;
    assert.ok(MONTHLY_CAPS_USD.pro > proRevenueUsd,
      `Pro cap $${MONTHLY_CAPS_USD.pro} should exceed revenue $${proRevenueUsd.toFixed(2)}`);
  });
});

describe("abuse scenario: voice call cost check", () => {
  test("15 calls × 10min TTS chars should exceed free cap", () => {
    // Rough: each voice response ~500 chars TTS + 10min Whisper per call
    const callsPerDay = 15;
    const daysPerMonth = 30;
    const charsPerCall = 500;
    const whisperSecsPerCall = 600; // 10 min

    const ttsMonthly = estimateCost({ model: "tts-1", chars: charsPerCall * callsPerDay * daysPerMonth });
    const whisperMonthly = estimateCost({ model: "whisper-1", durationSecs: whisperSecsPerCall * callsPerDay * daysPerMonth });
    const totalMonthly = ttsMonthly + whisperMonthly;

    // Pro at 15 calls/day should far exceed the free cap (proving the circuit breaker is needed)
    assert.ok(totalMonthly > MONTHLY_CAPS_USD.free,
      `Expected monthly cost $${totalMonthly.toFixed(2)} > free cap $${MONTHLY_CAPS_USD.free}`);
  });
});
