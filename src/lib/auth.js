/**
 * Shared auth utilities — validation, rate limiting, password strength
 * Used by login, signup, forgot-password pages
 */

// ── Email validation ─────────────────────────────────────────
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export function validateEmail(email) {
  if (!email || !email.trim()) return "Email is required.";
  if (!EMAIL_REGEX.test(email.trim())) return "Enter a valid email address.";
  return null;
}

// ── Password validation ──────────────────────────────────────
export function validatePassword(password) {
  if (!password) return "Password is required.";
  if (password.length < 8) return "At least 8 characters required.";
  if (!/[A-Z]/.test(password)) return "Include at least one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Include at least one lowercase letter.";
  if (!/[0-9]/.test(password)) return "Include at least one number.";
  return null;
}

// ── Password strength score (0–4) ───────────────────────────
export function getPasswordStrength(password) {
  if (!password) return { score: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= 8)   score++;
  if (password.length >= 12)  score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const map = {
    0: { label: "",         color: "#374151" },
    1: { label: "Weak",     color: "#ef4444" },
    2: { label: "Fair",     color: "#f59e0b" },
    3: { label: "Good",     color: "#3b82f6" },
    4: { label: "Strong",   color: "#22c55e" },
    5: { label: "Strong",   color: "#22c55e" },
  };
  return { score, ...map[score] };
}

// ── Client-side rate limiter ─────────────────────────────────
// Tracks attempts per key in sessionStorage. Max 5 attempts → 30s lockout.
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 30_000; // 30 seconds

export function checkRateLimit(key) {
  const raw = sessionStorage.getItem(`rl_${key}`);
  const data = raw ? JSON.parse(raw) : { attempts: 0, lockedUntil: 0 };

  const now = Date.now();
  if (data.lockedUntil && now < data.lockedUntil) {
    const secsLeft = Math.ceil((data.lockedUntil - now) / 1000);
    return { blocked: true, message: `Too many attempts. Try again in ${secsLeft}s.` };
  }

  // Reset if lockout expired
  if (data.lockedUntil && now >= data.lockedUntil) {
    data.attempts = 0;
    data.lockedUntil = 0;
  }

  return { blocked: false, attempts: data.attempts };
}

export function recordFailedAttempt(key) {
  const raw = sessionStorage.getItem(`rl_${key}`);
  const data = raw ? JSON.parse(raw) : { attempts: 0, lockedUntil: 0 };
  data.attempts = (data.attempts || 0) + 1;
  if (data.attempts >= MAX_ATTEMPTS) {
    data.lockedUntil = Date.now() + LOCKOUT_MS;
  }
  sessionStorage.setItem(`rl_${key}`, JSON.stringify(data));
}

export function clearRateLimit(key) {
  sessionStorage.removeItem(`rl_${key}`);
}

// ── Safe error messages (never expose internals) ─────────────
export function safeAuthError(error) {
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

  // Generic fallback — don't expose raw Supabase/DB errors
  return "Authentication failed. Please try again.";
}
