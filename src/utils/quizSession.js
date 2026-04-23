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

    // Build filtered questions first (Fix 1)
    const questions = parsed.questions.map((q) => ({
      id: sanitizeString(q.id),
      text: sanitizeString(q.text),
      marks: Math.max(1, Math.min(100, Number(q.marks) || 5)),
      hints: Array.isArray(q.hints) ? q.hints.map(sanitizeString) : [],
      sourceSnippet: sanitizeString(q.sourceSnippet),
    })).filter((q) => q.id && q.text);

    // Second guard: if all questions stripped by filter (Fix 1)
    if (questions.length === 0) {
      clearQuizSession();
      return null;
    }

    // Clamp currentIndex to filtered questions length (Fix 1)
    const currentIndex = Math.max(0, Math.min(
      Number(parsed.currentIndex) || 0,
      questions.length - 1
    ));

    // Sanitize and clamp fields
    return {
      selectedDocument: parsed.selectedDocument ?? null, // Fix 2: ?? instead of ||
      questions,
      currentIndex,
      answers: Object.fromEntries(
        Object.entries(parsed.answers || {})
          .filter(([k]) => typeof k === 'string' && k.length <= 200) // Fix 5: keys sanitization
          .map(([k, v]) => [k, sanitizeString(v)])
      ),
      evaluations: (parsed.evaluations && typeof parsed.evaluations === 'object' && !Array.isArray(parsed.evaluations)) // Fix 3: type guard
        ? parsed.evaluations
        : {},
      sessionSeconds: Math.max(0, Math.min(86400, Number(parsed.sessionSeconds) || 0)), // Fix 6: upper bound 86400
      performanceSignals: (() => { // Fix 4: sub-field validation
        const ps = parsed.performanceSignals;
        if (!ps || typeof ps !== 'object') return { questionTimes: {}, wrongAnswers: [], skippedQuestions: [], weakConcepts: {} };
        const tpq = ps.timePerQuestion;
        return {
          questionTimes: (ps.questionTimes && typeof ps.questionTimes === 'object' && !Array.isArray(ps.questionTimes)) ? ps.questionTimes : {},
          wrongAnswers: Array.isArray(ps.wrongAnswers) ? ps.wrongAnswers : [],
          skippedQuestions: Array.isArray(ps.skippedQuestions) ? ps.skippedQuestions : [],
          weakConcepts: (ps.weakConcepts && typeof ps.weakConcepts === 'object' && !Array.isArray(ps.weakConcepts)) ? ps.weakConcepts : {},
          timePerQuestion: (tpq && typeof tpq === 'object')
            ? {
                avg: Math.max(0, Number(tpq.avg) || 0),
                slowest: (tpq.slowest && typeof tpq.slowest === 'object')
                  ? { topic: String(tpq.slowest.topic || ''), seconds: Math.max(0, Number(tpq.slowest.seconds) || 0) }
                  : null,
              }
            : { avg: 0, slowest: null },
        };
      })(),
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
