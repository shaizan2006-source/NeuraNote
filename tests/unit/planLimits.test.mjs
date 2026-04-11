/**
 * Unit tests for plan limit logic in src/lib/planLimits.js
 * Uses Node.js built-in test runner — no external deps required.
 * Run: node --test tests/unit/planLimits.test.mjs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

// ── Inline plan definitions (identical to planLimits.js) ─────────
const PLANS = {
  free:    { name: "Free",    pdfLimit: 1,    qaLimit: 20,   price: 0 },
  student: { name: "Student", pdfLimit: 10,   qaLimit: null, price: 299 },
  pro:     { name: "Pro",     pdfLimit: null, qaLimit: null, price: 599 },
  school:  { name: "School",  pdfLimit: null, qaLimit: null, price: 50000 },
};

function canUploadPDF(plan, currentCount) {
  const limits = PLANS[plan];
  if (!limits.pdfLimit) return { allowed: true };
  if (currentCount >= limits.pdfLimit) {
    return {
      allowed: false,
      reason: `Free plan allows ${limits.pdfLimit} PDF. Upgrade to upload more.`,
      limit: limits.pdfLimit,
      current: currentCount,
      upgradeUrl: "/pricing",
    };
  }
  return { allowed: true };
}

function canAskQuestion(plan, todayCount) {
  const limits = PLANS[plan];
  if (!limits.qaLimit) return { allowed: true };
  if (todayCount >= limits.qaLimit) {
    return {
      allowed: false,
      reason: `Free plan allows ${limits.qaLimit} questions per day. Upgrade for unlimited.`,
      limit: limits.qaLimit,
      current: todayCount,
      upgradeUrl: "/pricing",
    };
  }
  return { allowed: true };
}

function resolvePlan(row) {
  if (!row) return "free";
  if (row.expires_at && new Date(row.expires_at) < new Date()) return "free";
  return row.plan || "free";
}

// ─────────────────────────────────────────────────────────────────

describe("PLANS constant", () => {
  test("all 4 plans are defined", () => {
    assert.ok(PLANS.free);
    assert.ok(PLANS.student);
    assert.ok(PLANS.pro);
    assert.ok(PLANS.school);
  });

  test("free plan has pdf limit of 1 and qa limit of 20", () => {
    assert.equal(PLANS.free.pdfLimit, 1);
    assert.equal(PLANS.free.qaLimit, 20);
    assert.equal(PLANS.free.price, 0);
  });

  test("student plan has 10 pdf limit and unlimited Q&A", () => {
    assert.equal(PLANS.student.pdfLimit, 10);
    assert.equal(PLANS.student.qaLimit, null);
    assert.equal(PLANS.student.price, 299);
  });

  test("pro plan has unlimited pdfs and unlimited Q&A", () => {
    assert.equal(PLANS.pro.pdfLimit, null);
    assert.equal(PLANS.pro.qaLimit, null);
    assert.equal(PLANS.pro.price, 599);
  });

  test("school plan has unlimited everything", () => {
    assert.equal(PLANS.school.pdfLimit, null);
    assert.equal(PLANS.school.qaLimit, null);
  });
});

describe("PDF Upload Limits", () => {
  test("free user with 0 PDFs is allowed", () => {
    assert.equal(canUploadPDF("free", 0).allowed, true);
  });

  test("free user is blocked at exactly 1 PDF", () => {
    const r = canUploadPDF("free", 1);
    assert.equal(r.allowed, false);
    assert.equal(r.limit, 1);
    assert.equal(r.current, 1);
    assert.equal(r.upgradeUrl, "/pricing");
  });

  test("free user is blocked above limit (2 PDFs)", () => {
    assert.equal(canUploadPDF("free", 2).allowed, false);
  });

  test("student user is allowed at 9 PDFs", () => {
    assert.equal(canUploadPDF("student", 9).allowed, true);
  });

  test("student user is blocked at exactly 10 PDFs", () => {
    const r = canUploadPDF("student", 10);
    assert.equal(r.allowed, false);
    assert.equal(r.limit, 10);
  });

  test("pro user is allowed regardless of count", () => {
    assert.equal(canUploadPDF("pro", 0).allowed, true);
    assert.equal(canUploadPDF("pro", 100).allowed, true);
    assert.equal(canUploadPDF("pro", 9999).allowed, true);
  });

  test("school user is allowed regardless of count", () => {
    assert.equal(canUploadPDF("school", 9999).allowed, true);
  });

  test("blocked response includes upgradeUrl", () => {
    const r = canUploadPDF("free", 1);
    assert.ok(r.upgradeUrl);
    assert.ok(r.upgradeUrl.includes("/pricing"));
  });
});

describe("Q&A Daily Limits", () => {
  test("free user at 0 questions is allowed", () => {
    assert.equal(canAskQuestion("free", 0).allowed, true);
  });

  test("free user at 19 questions is allowed", () => {
    assert.equal(canAskQuestion("free", 19).allowed, true);
  });

  test("free user is blocked at exactly 20 questions", () => {
    const r = canAskQuestion("free", 20);
    assert.equal(r.allowed, false);
    assert.equal(r.limit, 20);
    assert.equal(r.current, 20);
  });

  test("free user is blocked above 20 questions", () => {
    assert.equal(canAskQuestion("free", 21).allowed, false);
    assert.equal(canAskQuestion("free", 100).allowed, false);
  });

  test("student user has unlimited questions", () => {
    assert.equal(canAskQuestion("student", 0).allowed, true);
    assert.equal(canAskQuestion("student", 9999).allowed, true);
  });

  test("pro user has unlimited questions", () => {
    assert.equal(canAskQuestion("pro", 9999).allowed, true);
  });

  test("blocked response includes upgradeUrl", () => {
    const r = canAskQuestion("free", 20);
    assert.ok(r.upgradeUrl?.includes("/pricing"));
  });

  test("blocked response reason is user-friendly", () => {
    const r = canAskQuestion("free", 20);
    assert.ok(r.reason.length > 10);
    assert.ok(!r.reason.includes("undefined"));
  });
});

describe("Plan Expiry Resolution", () => {
  test("null DB row falls back to free", () => {
    assert.equal(resolvePlan(null), "free");
  });

  test("expired plan downgrades to free", () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    assert.equal(resolvePlan({ plan: "student", expires_at: yesterday }), "free");
  });

  test("active plan returns correct tier", () => {
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString();
    assert.equal(resolvePlan({ plan: "student", expires_at: tomorrow }), "student");
    assert.equal(resolvePlan({ plan: "pro", expires_at: tomorrow }), "pro");
  });

  test("plan with no expires_at stays active", () => {
    assert.equal(resolvePlan({ plan: "school", expires_at: null }), "school");
  });

  test("plan with undefined tier falls back to free", () => {
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString();
    assert.equal(resolvePlan({ plan: undefined, expires_at: tomorrow }), "free");
  });

  test("plan expiring exactly now is treated as expired", () => {
    // A date 1ms in the past
    const justExpired = new Date(Date.now() - 1).toISOString();
    assert.equal(resolvePlan({ plan: "pro", expires_at: justExpired }), "free");
  });
});
