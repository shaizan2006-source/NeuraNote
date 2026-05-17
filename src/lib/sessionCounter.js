"use client";

const KEY = "amn_session_count";
const DISMISSED_KEY = "amn_notif_prompt_dismissed_at";
const DISMISS_DAYS = 14;

export function incrementSession() {
  if (typeof localStorage === "undefined") return 0;
  const count = (parseInt(localStorage.getItem(KEY) ?? "0", 10) || 0) + 1;
  localStorage.setItem(KEY, String(count));
  return count;
}

export function getSessionCount() {
  if (typeof localStorage === "undefined") return 0;
  return parseInt(localStorage.getItem(KEY) ?? "0", 10) || 0;
}

export function dismissPrompt() {
  localStorage.setItem(DISMISSED_KEY, String(Date.now()));
}

export function isPromptSuppressed() {
  const ts = parseInt(localStorage.getItem(DISMISSED_KEY) ?? "0", 10);
  if (!ts) return false;
  return Date.now() - ts < DISMISS_DAYS * 86_400_000;
}
