/**
 * Unit tests for src/lib/auth.js
 * Uses Node.js built-in test runner — no external deps required.
 * Run: node --test tests/unit/auth.test.mjs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

// ── Inline auth functions (identical to src/lib/auth.js) ─────────
// We inline instead of importing to avoid Next.js module resolution
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

function validateEmail(email) {
  if (!email || !email.trim()) return "Email is required.";
  if (!EMAIL_REGEX.test(email.trim())) return "Enter a valid email address.";
  return null;
}

function validatePassword(password) {
  if (!password) return "Password is required.";
  if (password.length < 8) return "At least 8 characters required.";
  if (!/[A-Z]/.test(password)) return "Include at least one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Include at least one lowercase letter.";
  if (!/[0-9]/.test(password)) return "Include at least one number.";
  return null;
}

function getPasswordStrength(password) {
  if (!password) return { score: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= 8)  score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const map = {
    0: { label: "",       color: "#374151" },
    1: { label: "Weak",   color: "#ef4444" },
    2: { label: "Fair",   color: "#f59e0b" },
    3: { label: "Good",   color: "#3b82f6" },
    4: { label: "Strong", color: "#22c55e" },
    5: { label: "Strong", color: "#22c55e" },
  };
  return { score, ...map[score] };
}

// In-memory rate limiter (mirrors sessionStorage logic)
const store = {};
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 30_000;

function checkRateLimit(key) {
  const data = store[key] || { attempts: 0, lockedUntil: 0 };
  const now  = Date.now();
  if (data.lockedUntil && now < data.lockedUntil) {
    const secsLeft = Math.ceil((data.lockedUntil - now) / 1000);
    return { blocked: true, message: `Too many attempts. Try again in ${secsLeft}s.` };
  }
  if (data.lockedUntil && now >= data.lockedUntil) {
    data.attempts = 0;
    data.lockedUntil = 0;
    store[key] = data;
  }
  return { blocked: false, attempts: data.attempts };
}

function recordFailedAttempt(key) {
  const data = store[key] || { attempts: 0, lockedUntil: 0 };
  data.attempts = (data.attempts || 0) + 1;
  if (data.attempts >= MAX_ATTEMPTS) {
    data.lockedUntil = Date.now() + LOCKOUT_MS;
  }
  store[key] = data;
}

function clearRateLimit(key) {
  delete store[key];
}

function safeAuthError(error) {
  if (!error) return "Something went wrong. Please try again.";
  const msg = error.message?.toLowerCase() || "";
  if (msg.includes("invalid login") || msg.includes("invalid credentials"))
    return "Incorrect email or password.";
  if (msg.includes("email not confirmed"))
    return "Please confirm your email before logging in.";
  if (msg.includes("user already registered"))
    return "An account with this email already exists.";
  if (msg.includes("rate limit") || msg.includes("too many"))
    return "Too many attempts. Please wait a moment and try again.";
  if (msg.includes("network") || msg.includes("fetch"))
    return "Network error. Check your connection and try again.";
  if (msg.includes("timed out"))
    return "Login timed out. Please try again.";
  return "Authentication failed. Please try again.";
}

// ─────────────────────────────────────────────────────────────────

describe("validateEmail", () => {
  test("accepts standard valid emails", () => {
    assert.equal(validateEmail("user@example.com"), null);
    assert.equal(validateEmail("test.user@domain.co.in"), null);
    assert.equal(validateEmail("user+tag@sub.domain.org"), null);
  });

  test("accepts email with trailing whitespace (trimmed)", () => {
    assert.equal(validateEmail("  user@example.com  "), null);
  });

  test("rejects empty string", () => {
    assert.ok(validateEmail(""));
    assert.ok(validateEmail("   "));
  });

  test("rejects null/undefined", () => {
    assert.ok(validateEmail(null));
    assert.ok(validateEmail(undefined));
  });

  test("rejects missing @ symbol", () => {
    assert.ok(validateEmail("notanemail"));
    assert.ok(validateEmail("userexample.com"));
  });

  test("rejects missing domain", () => {
    assert.ok(validateEmail("user@"));
    assert.ok(validateEmail("user@domain"));
  });

  test("rejects missing TLD", () => {
    assert.ok(validateEmail("user@domain."));
  });

  test("rejects missing local part", () => {
    assert.ok(validateEmail("@domain.com"));
  });
});

describe("validatePassword", () => {
  test("accepts valid passwords meeting all rules", () => {
    assert.equal(validatePassword("StrongPass1"), null);
    assert.equal(validatePassword("MyPass123"),   null);
    assert.equal(validatePassword("Abcdefg1"),    null);
    assert.equal(validatePassword("Secure!1Pwd"), null);
  });

  test("rejects null/undefined", () => {
    assert.ok(validatePassword(null));
    assert.ok(validatePassword(undefined));
  });

  test("rejects passwords shorter than 8 characters", () => {
    assert.ok(validatePassword("Ab1"));
    assert.ok(validatePassword("Short1"));
  });

  test("rejects password with no uppercase letter", () => {
    assert.ok(validatePassword("lowercase1password"));
  });

  test("rejects password with no lowercase letter", () => {
    assert.ok(validatePassword("UPPERCASE1PASSWORD"));
  });

  test("rejects password with no digit", () => {
    assert.ok(validatePassword("NoNumbers!Pass"));
  });

  test("error messages are descriptive", () => {
    const err = validatePassword("short");
    assert.ok(err.includes("8") || err.includes("character"), `Expected length message, got: ${err}`);
  });
});

describe("getPasswordStrength", () => {
  test("returns score 0 for empty input", () => {
    assert.equal(getPasswordStrength("").score, 0);
    assert.equal(getPasswordStrength(null).score, 0);
  });

  test("very short password (< 8 chars) scores 0", () => {
    const r = getPasswordStrength("abc");
    assert.equal(r.score, 0); // below 8 chars, no points earned
    assert.equal(r.label, "");
  });

  test("8-char all-lowercase password scores 1 (Weak)", () => {
    const r = getPasswordStrength("abcdefgh"); // only length >= 8 scores
    assert.equal(r.score, 1);
    assert.equal(r.label, "Weak");
  });

  test("8-char password with upper+lower+number scores 3 (Good)", () => {
    const r = getPasswordStrength("Abcdef1g");
    assert.ok(r.score >= 3);
  });

  test("long password with upper+lower+number+special scores Strong (4-5)", () => {
    const r = getPasswordStrength("MyStr0ng!Pass123");
    assert.ok(r.score >= 4);
    assert.equal(r.label, "Strong");
  });

  test("special characters increase score", () => {
    const r1 = getPasswordStrength("LongPass1");
    const r2 = getPasswordStrength("LongPass1!");
    assert.ok(r2.score > r1.score);
  });

  test("each score maps to a valid color", () => {
    for (let i = 0; i <= 5; i++) {
      const pw = "A".repeat(i > 0 ? i * 2 : 1);
      const r = getPasswordStrength(pw);
      assert.ok(r.color.startsWith("#"), `score ${r.score} has no hex color`);
    }
  });
});

describe("Rate Limiter", () => {
  test("first attempt is never blocked", () => {
    clearRateLimit("fresh");
    const r = checkRateLimit("fresh");
    assert.equal(r.blocked, false);
  });

  test("allows up to 4 failed attempts without blocking", () => {
    clearRateLimit("allow4");
    for (let i = 0; i < 4; i++) {
      const r = checkRateLimit("allow4");
      assert.equal(r.blocked, false, `Should not be blocked at attempt ${i + 1}`);
      recordFailedAttempt("allow4");
    }
  });

  test("blocks after exactly 5 failed attempts", () => {
    clearRateLimit("block5");
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt("block5");
    }
    const r = checkRateLimit("block5");
    assert.equal(r.blocked, true);
    assert.ok(r.message.includes("Too many attempts"));
  });

  test("blocked message includes seconds remaining", () => {
    clearRateLimit("timer");
    for (let i = 0; i < 5; i++) recordFailedAttempt("timer");
    const r = checkRateLimit("timer");
    assert.ok(/\d+s/.test(r.message), `Expected seconds in message: ${r.message}`);
  });

  test("clearRateLimit resets the counter", () => {
    clearRateLimit("reset_me");
    for (let i = 0; i < 5; i++) recordFailedAttempt("reset_me");
    clearRateLimit("reset_me");
    const r = checkRateLimit("reset_me");
    assert.equal(r.blocked, false);
    assert.equal(r.attempts, 0);
  });

  test("different keys are independent", () => {
    clearRateLimit("key_a");
    clearRateLimit("key_b");
    for (let i = 0; i < 5; i++) recordFailedAttempt("key_a");
    const r = checkRateLimit("key_b");
    assert.equal(r.blocked, false);
  });
});

describe("safeAuthError", () => {
  test("maps invalid credentials error", () => {
    const msg = safeAuthError({ message: "Invalid login credentials" });
    assert.equal(msg, "Incorrect email or password.");
  });

  test("maps email not confirmed error", () => {
    const msg = safeAuthError({ message: "Email not confirmed" });
    assert.equal(msg, "Please confirm your email before logging in.");
  });

  test("maps user already registered error", () => {
    const msg = safeAuthError({ message: "User already registered" });
    assert.equal(msg, "An account with this email already exists.");
  });

  test("maps rate limit error", () => {
    const msg = safeAuthError({ message: "Too many requests" });
    assert.equal(msg, "Too many attempts. Please wait a moment and try again.");
  });

  test("maps network error", () => {
    const msg = safeAuthError({ message: "fetch error" });
    assert.equal(msg, "Network error. Check your connection and try again.");
  });

  test("maps timeout error", () => {
    const msg = safeAuthError({ message: "timed out" });
    assert.equal(msg, "Login timed out. Please try again.");
  });

  test("returns generic message for unknown errors", () => {
    const msg = safeAuthError({ message: "some unexpected db error 500" });
    assert.equal(msg, "Authentication failed. Please try again.");
  });

  test("handles null error gracefully", () => {
    const msg = safeAuthError(null);
    assert.ok(msg.length > 0);
  });
});
