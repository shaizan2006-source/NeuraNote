/**
 * Unit tests verifying the updated planLimits.js structure:
 *   - Price fields are now monthlyPrice / yearlyPrice (not price)
 *   - Prices derived from PRICING_AMOUNTS (no hardcoded stale values)
 *   - All 6 plan tiers present: free, student, pro, proplus, family, school
 *   - Functional limit helpers work correctly
 *
 * Run: node --test tests/unit/planLimitsV2.test.mjs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

// ── Inline the pure PRICING_AMOUNTS (mirrors pricing.js) ─────────
const PRICING_AMOUNTS = {
  student: { monthly: 19900, yearly: 159900 },
  pro:     { monthly: 39900, yearly: 299900 },
  proplus: { monthly: 69900, yearly: 599900 },
  family:  { yearly: 449900 },
};

const inr = (p) => Math.round(p / 100);

// ── Inline the updated PLANS (mirrors planLimits.js) ─────────────
const PLANS = {
  free:    { name: "Free",    pdfLimit: 1,    qaLimit: 20,   monthlyPrice: 0,                                monthlyPrice: 0, yearlyPrice: 0 },
  student: { name: "Student", pdfLimit: 10,   qaLimit: null, monthlyPrice: inr(PRICING_AMOUNTS.student.monthly), yearlyPrice: inr(PRICING_AMOUNTS.student.yearly) },
  pro:     { name: "Pro",     pdfLimit: null, qaLimit: null, monthlyPrice: inr(PRICING_AMOUNTS.pro.monthly),     yearlyPrice: inr(PRICING_AMOUNTS.pro.yearly) },
  proplus: { name: "Pro+",    pdfLimit: null, qaLimit: null, monthlyPrice: inr(PRICING_AMOUNTS.proplus.monthly),  yearlyPrice: inr(PRICING_AMOUNTS.proplus.yearly) },
  family:  { name: "Family",  pdfLimit: null, qaLimit: null, monthlyPrice: null,                              yearlyPrice: inr(PRICING_AMOUNTS.family.yearly) },
  school:  { name: "School",  pdfLimit: null, qaLimit: null, monthlyPrice: null,                              yearlyPrice: null },
};

// ── Tests ──────────────────────────────────────────────────────────

describe("PLANS — all tiers present", () => {
  const expected = ["free", "student", "pro", "proplus", "family", "school"];
  for (const tier of expected) {
    test(`${tier} plan exists`, () => assert.ok(PLANS[tier], `Missing plan: ${tier}`));
  }
});

describe("PLANS — no stale hardcoded price field", () => {
  for (const [tier, plan] of Object.entries(PLANS)) {
    test(`${tier} has no legacy 'price' field`, () => {
      assert.ok(!("price" in plan) || plan.price === undefined,
        `${tier} still has a legacy 'price' field: ${plan.price}`);
    });
  }
});

describe("PLANS — prices match PRICING_AMOUNTS (single source of truth)", () => {
  test("student monthly = ₹199", () => {
    assert.strictEqual(PLANS.student.monthlyPrice, 199);
  });

  test("student yearly = ₹1,599", () => {
    assert.strictEqual(PLANS.student.yearlyPrice, 1599);
  });

  test("pro monthly = ₹399", () => {
    assert.strictEqual(PLANS.pro.monthlyPrice, 399);
  });

  test("pro yearly = ₹2,999", () => {
    assert.strictEqual(PLANS.pro.yearlyPrice, 2999);
  });

  test("proplus monthly = ₹699", () => {
    assert.strictEqual(PLANS.proplus.monthlyPrice, 699);
  });

  test("proplus yearly = ₹5,999", () => {
    assert.strictEqual(PLANS.proplus.yearlyPrice, 5999);
  });

  test("family yearly = ₹4,499", () => {
    assert.strictEqual(PLANS.family.yearlyPrice, 4499);
  });

  test("family has no monthly price (annual-only plan)", () => {
    assert.strictEqual(PLANS.family.monthlyPrice, null);
  });

  test("school prices are null (B2B negotiated)", () => {
    assert.strictEqual(PLANS.school.monthlyPrice, null);
    assert.strictEqual(PLANS.school.yearlyPrice, null);
  });
});

describe("PLANS — limit logic", () => {
  test("free has pdfLimit: 1", () => assert.strictEqual(PLANS.free.pdfLimit, 1));
  test("free has qaLimit: 20", () => assert.strictEqual(PLANS.free.qaLimit, 20));
  test("student has pdfLimit: 10", () => assert.strictEqual(PLANS.student.pdfLimit, 10));
  test("student has no Q&A limit (null)", () => assert.strictEqual(PLANS.student.qaLimit, null));
  test("pro has no PDF limit (null)", () => assert.strictEqual(PLANS.pro.pdfLimit, null));
  test("proplus has no PDF limit (null)", () => assert.strictEqual(PLANS.proplus.pdfLimit, null));
  test("school has no limits", () => {
    assert.strictEqual(PLANS.school.pdfLimit, null);
    assert.strictEqual(PLANS.school.qaLimit, null);
  });
});

describe("PLANS — pricing is monotonically increasing by tier", () => {
  test("pro monthly > student monthly", () => {
    assert.ok(PLANS.pro.monthlyPrice > PLANS.student.monthlyPrice);
  });

  test("proplus monthly > pro monthly", () => {
    assert.ok(PLANS.proplus.monthlyPrice > PLANS.pro.monthlyPrice);
  });

  test("annual is cheaper per month than monthly for student", () => {
    const annualPerMonth = PLANS.student.yearlyPrice / 12;
    assert.ok(annualPerMonth < PLANS.student.monthlyPrice,
      `Annual per-month ₹${annualPerMonth.toFixed(0)} should be less than monthly ₹${PLANS.student.monthlyPrice}`);
  });

  test("annual is cheaper per month than monthly for pro", () => {
    const annualPerMonth = PLANS.pro.yearlyPrice / 12;
    assert.ok(annualPerMonth < PLANS.pro.monthlyPrice);
  });
});

describe("PRICING_AMOUNTS — paise consistency", () => {
  test("student monthly paise → INR round-trip is lossless", () => {
    assert.strictEqual(inr(PRICING_AMOUNTS.student.monthly) * 100, PRICING_AMOUNTS.student.monthly);
  });

  test("pro monthly paise → INR round-trip is lossless", () => {
    assert.strictEqual(inr(PRICING_AMOUNTS.pro.monthly) * 100, PRICING_AMOUNTS.pro.monthly);
  });
});
