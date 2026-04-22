// src/utils/quizSession.js

const SESSION_KEY = 'quiz_session';
const MAX_AGE_MS = 86_400_000; // 24 hours

// ── sanitizeString ─────────────────────────────────────────────────────────
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim().slice(0, 10000);
}

// ── saveQuizSession ────────────────────────────────────────────────────────
export function saveQuizSession(data) {
  try {
    const payload = JSON.stringify({ ...data, timestamp: Date.now() });
    localStorage.setItem(SESSION_KEY, payload);
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      localStorage.removeItem(SESSION_KEY);
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ ...data, timestamp: Date.now() }));
      } catch (_) {
        // Storage full — silently fail, quiz continues without save
      }
    }
  }
}

// ── loadQuizSession ────────────────────────────────────────────────────────
// Returns validated session data, or null if absent/corrupted/expired.
export function loadQuizSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    // Expire old sessions
    if (!parsed.timestamp || Date.now() - parsed.timestamp > MAX_AGE_MS) {
      clearQuizSession();
      return null;
    }

    // Require minimum valid shape
    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      clearQuizSession();
      return null;
    }

    // Sanitize and clamp fields
    return {
      selectedDocument: parsed.selectedDocument || null,
      questions: parsed.questions.map((q) => ({
        id: sanitizeString(q.id),
        text: sanitizeString(q.text),
        marks: Math.max(1, Math.min(100, Number(q.marks) || 5)),
        hints: Array.isArray(q.hints) ? q.hints.map(sanitizeString) : [],
        sourceSnippet: sanitizeString(q.sourceSnippet),
      })).filter((q) => q.id && q.text),
      currentIndex: Math.max(0, Math.min(
        Number(parsed.currentIndex) || 0,
        (parsed.questions || []).length - 1
      )),
      answers: Object.fromEntries(
        Object.entries(parsed.answers || {}).map(([k, v]) => [k, sanitizeString(v)])
      ),
      evaluations: parsed.evaluations || {},
      sessionSeconds: Math.max(0, Number(parsed.sessionSeconds) || 0),
      performanceSignals: parsed.performanceSignals || {
        questionTimes: {},
        wrongAnswers: [],
        skippedQuestions: [],
        weakConcepts: {},
      },
      timestamp: parsed.timestamp,
    };
  } catch (err) {
    clearQuizSession();
    return null;
  }
}

// ── clearQuizSession ───────────────────────────────────────────────────────
export function clearQuizSession() {
  localStorage.removeItem(SESSION_KEY);
}
