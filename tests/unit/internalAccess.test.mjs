/**
 * Unit tests for the internal developer access system.
 * Covers: isInternalDev detection, bypass behavior, normal user isolation,
 * privilege escalation prevention, and kill-switch behavior.
 *
 * Run: node --test tests/unit/internalAccess.test.mjs
 */

import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

// ── Inline replicas (identical logic to src/lib/internalAccess.js) ──────────
// Tests are self-contained so they don't depend on Supabase env being available.

function isInternalDev(user, killSwitch = false) {
  if (!user) return false;
  if (killSwitch) return false;   // DISABLE_INTERNAL_DEV_OVERRIDE=true
  return user.app_metadata?.role === "internal_dev";
}

const DEV_ALLOWED = Object.freeze({ allowed: true, _devOverride: true });
const DEV_PLAN    = "school";

// ── Inline plan check replicas ───────────────────────────────────────────────

const PLANS = {
  free:    { pdfLimit: 1,    qaLimit: 20 },
  student: { pdfLimit: 10,   qaLimit: null },
  pro:     { pdfLimit: null, qaLimit: null },
  school:  { pdfLimit: null, qaLimit: null },
};

const VOICE_LIMITS = {
  free:    { callsPerDay: 2,    maxDurationSecs: 600 },
  student: { callsPerDay: 5,    maxDurationSecs: 1200 },
  pro:     { callsPerDay: 15,   maxDurationSecs: 2400 },
  school:  { callsPerDay: null, maxDurationSecs: 3600 },
};

function canUploadPDF(user, currentCount, killSwitch = false) {
  if (isInternalDev(user, killSwitch)) return DEV_ALLOWED;
  const plan = "free";   // simulate free plan for normal users in these tests
  const limits = PLANS[plan];
  if (!limits.pdfLimit) return { allowed: true };
  if (currentCount >= limits.pdfLimit) return { allowed: false, reason: "limit", upgradeUrl: "/pricing" };
  return { allowed: true };
}

function canAskQuestion(user, todayCount, killSwitch = false) {
  if (isInternalDev(user, killSwitch)) return DEV_ALLOWED;
  const plan = "free";
  const limits = PLANS[plan];
  if (!limits.qaLimit) return { allowed: true };
  if (todayCount >= limits.qaLimit) return { allowed: false, reason: "limit", upgradeUrl: "/pricing" };
  return { allowed: true };
}

function canStartCall(user, todayCount, killSwitch = false) {
  if (isInternalDev(user, killSwitch)) {
    return { allowed: true, plan: DEV_PLAN, limits: VOICE_LIMITS.school, todayCount: 0, _devOverride: true };
  }
  const limits = VOICE_LIMITS.free;
  if (todayCount >= limits.callsPerDay) return { allowed: false, reason: "limit", upgradeUrl: "/pricing" };
  return { allowed: true, plan: "free", limits, todayCount };
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

const devUser = {
  id: "dev-uuid-1",
  email: "test@example.com",
  app_metadata: { role: "internal_dev" },
  user_metadata: { full_name: "Dev Account 1" },
};

const devUser2 = {
  id: "dev-uuid-2",
  email: "test1@example.com",
  app_metadata: { role: "internal_dev" },
  user_metadata: { full_name: "Dev Account 2" },
};

const freeUser = {
  id: "free-uuid",
  email: "student@university.edu",
  app_metadata: {},
  user_metadata: {},
};

const proUser = {
  id: "pro-uuid",
  email: "paying@university.edu",
  app_metadata: { role: "pro" },   // not internal_dev
  user_metadata: {},
};

const selfEscalatedUser = {
  id: "hacker-uuid",
  email: "malicious@evil.com",
  // Attempt: put internal_dev in user_metadata (user-writable), NOT app_metadata.
  user_metadata:  { role: "internal_dev" },
  app_metadata:   {},
};

// ─────────────────────────────────────────────────────────────────────────────

describe("isInternalDev — detection", () => {
  test("returns true for dev account 1", () => {
    assert.equal(isInternalDev(devUser), true);
  });

  test("returns true for dev account 2", () => {
    assert.equal(isInternalDev(devUser2), true);
  });

  test("returns false for normal free user", () => {
    assert.equal(isInternalDev(freeUser), false);
  });

  test("returns false for pro-plan user (not internal_dev)", () => {
    assert.equal(isInternalDev(proUser), false);
  });

  test("returns false for null user", () => {
    assert.equal(isInternalDev(null), false);
  });

  test("returns false for undefined user", () => {
    assert.equal(isInternalDev(undefined), false);
  });

  test("returns false when app_metadata is missing entirely", () => {
    assert.equal(isInternalDev({ id: "x" }), false);
  });

  test("returns false when app_metadata.role is undefined", () => {
    assert.equal(isInternalDev({ app_metadata: {} }), false);
  });

  test("returns false for empty string role", () => {
    assert.equal(isInternalDev({ app_metadata: { role: "" } }), false);
  });
});

describe("isInternalDev — privilege escalation prevention", () => {
  test("user_metadata.role='internal_dev' does NOT grant access", () => {
    // user_metadata is user-writable; only app_metadata (admin-only) counts.
    assert.equal(isInternalDev(selfEscalatedUser), false);
  });

  test("role must match exactly 'internal_dev' (case sensitive)", () => {
    assert.equal(isInternalDev({ app_metadata: { role: "Internal_Dev" } }), false);
    assert.equal(isInternalDev({ app_metadata: { role: "INTERNAL_DEV" } }), false);
    assert.equal(isInternalDev({ app_metadata: { role: "internal-dev" } }), false);
  });

  test("'admin' role does not trigger dev bypass", () => {
    assert.equal(isInternalDev({ app_metadata: { role: "admin" } }), false);
  });

  test("'school' plan role does not trigger dev bypass", () => {
    assert.equal(isInternalDev({ app_metadata: { role: "school" } }), false);
  });
});

describe("isInternalDev — kill switch", () => {
  test("kill switch disables bypass for dev account 1", () => {
    assert.equal(isInternalDev(devUser, true), false);
  });

  test("kill switch disables bypass for dev account 2", () => {
    assert.equal(isInternalDev(devUser2, true), false);
  });

  test("kill switch doesn't affect normal user result (still false)", () => {
    assert.equal(isInternalDev(freeUser, true), false);
  });
});

describe("canUploadPDF — dev bypass", () => {
  test("dev account 1 can upload with 0 existing PDFs", () => {
    assert.equal(canUploadPDF(devUser, 0).allowed, true);
  });

  test("dev account 1 can upload even at free plan limit (1)", () => {
    assert.equal(canUploadPDF(devUser, 1).allowed, true);
  });

  test("dev account can upload with 999 PDFs (no cap)", () => {
    assert.equal(canUploadPDF(devUser, 999).allowed, true);
  });

  test("dev bypass response is marked with _devOverride", () => {
    assert.equal(canUploadPDF(devUser, 999)._devOverride, true);
  });

  test("dev account 2 also bypasses", () => {
    assert.equal(canUploadPDF(devUser2, 999).allowed, true);
  });
});

describe("canUploadPDF — normal user isolation", () => {
  test("free user is blocked at 1 PDF", () => {
    assert.equal(canUploadPDF(freeUser, 1).allowed, false);
  });

  test("free user is blocked above limit", () => {
    assert.equal(canUploadPDF(freeUser, 5).allowed, false);
  });

  test("free user with 0 PDFs is still allowed", () => {
    assert.equal(canUploadPDF(freeUser, 0).allowed, true);
  });

  test("pro user (not dev) follows normal plan logic", () => {
    // proUser has app_metadata.role='pro' — not 'internal_dev', goes through normal flow
    // In our test simulation they're on 'free' plan for simplicity
    assert.equal(isInternalDev(proUser), false);
  });

  test("kill switch re-enables limit for dev account", () => {
    // With kill switch ON, dev account 1 is blocked just like any free user.
    assert.equal(canUploadPDF(devUser, 1, true).allowed, false);
  });
});

describe("canAskQuestion — dev bypass", () => {
  test("dev account bypasses daily Q&A cap at 0", () => {
    assert.equal(canAskQuestion(devUser, 0).allowed, true);
  });

  test("dev account bypasses at daily limit (20)", () => {
    assert.equal(canAskQuestion(devUser, 20).allowed, true);
  });

  test("dev account bypasses well above limit (500)", () => {
    assert.equal(canAskQuestion(devUser, 500).allowed, true);
  });

  test("dev bypass is marked with _devOverride", () => {
    assert.equal(canAskQuestion(devUser, 500)._devOverride, true);
  });
});

describe("canAskQuestion — normal user isolation", () => {
  test("free user blocked at exactly 20 questions", () => {
    assert.equal(canAskQuestion(freeUser, 20).allowed, false);
  });

  test("free user at 19 questions is allowed", () => {
    assert.equal(canAskQuestion(freeUser, 19).allowed, true);
  });

  test("free user blocked response has upgradeUrl", () => {
    assert.ok(canAskQuestion(freeUser, 20).upgradeUrl);
  });

  test("null user is not treated as dev", () => {
    // null goes through normal path — canAskQuestion(null) with 0 would be allowed on free
    assert.equal(canAskQuestion(null, 0).allowed, true);
    assert.equal(canAskQuestion(null, 20).allowed, false);
  });
});

describe("canStartCall — dev bypass", () => {
  test("dev account bypasses voice call limit at 0 calls", () => {
    assert.equal(canStartCall(devUser, 0).allowed, true);
  });

  test("dev account bypasses at free limit (2 calls)", () => {
    assert.equal(canStartCall(devUser, 2).allowed, true);
  });

  test("dev bypass response has unlimited school-tier limits", () => {
    const res = canStartCall(devUser, 99);
    assert.equal(res.allowed, true);
    assert.equal(res.plan, "school");
    assert.equal(res.limits.callsPerDay, null);   // unlimited
    assert.equal(res.limits.maxDurationSecs, 3600);
    assert.equal(res._devOverride, true);
  });

  test("normal user is blocked at free limit (2 calls)", () => {
    assert.equal(canStartCall(freeUser, 2).allowed, false);
  });

  test("normal user at 1 call is still allowed", () => {
    assert.equal(canStartCall(freeUser, 1).allowed, true);
  });
});

describe("no privilege leakage between users", () => {
  test("dev session does not affect subsequent normal user call", () => {
    const devResult    = canUploadPDF(devUser, 999);
    const normalResult = canUploadPDF(freeUser, 1);
    assert.equal(devResult.allowed, true);
    assert.equal(normalResult.allowed, false);
  });

  test("DEV_ALLOWED object is frozen (cannot be mutated by callers)", () => {
    assert.throws(
      () => { DEV_ALLOWED.allowed = false; },
      /Cannot assign to read only property/,
    );
  });

  test("checking isInternalDev does not mutate the user object", () => {
    const user = { id: "x", app_metadata: {} };
    isInternalDev(user);
    assert.deepEqual(user.app_metadata, {});
  });
});
