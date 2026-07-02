// SageLine conversation state machine + turn-decision + text helpers.
// Isolation of behavior: the state machine and prompt are testable without
// the voice pipeline (spec §2.3 — states are explicit, not implicit in prompt).

const TRANSITIONS = {
  connecting:  ["greeting", "failed"],
  greeting:    ["questioning", "ended", "failed"],
  questioning: ["clarifying", "wrapping_up", "ended", "failed"],
  clarifying:  ["questioning", "wrapping_up", "ended", "failed"],
  wrapping_up: ["ended", "failed"],
  ended:       [],
  failed:      [],
};

export function canTransition(from, to) {
  return (TRANSITIONS[from] ?? []).includes(to);
}

/**
 * Pure decision for the next state after a student turn.
 *   confused        → clarifying (re-teach)
 *   endIntent / budget exhausted → wrapping_up
 *   clarifying + resolved         → back to questioning
 *   greeting                      → questioning (first real turn)
 */
export function nextStateForTurn({ state, endIntent = false, confused = false, turnIndex = 0, maxTurns = 12 }) {
  if (state === "greeting") {
    return endIntent ? "wrapping_up" : "questioning";
  }
  if (endIntent || turnIndex >= maxTurns) return "wrapping_up";
  if (confused) return "clarifying";
  if (state === "clarifying") return "questioning";
  return "questioning";
}

// ── Sentence splitting for streamed TTS pipelining ──────────────────────────
// Yields complete sentences (so each can be synthesized while the next
// generates) and the trailing remainder. Guards against decimals.
const SENTENCE_RE = /[^.!?।]*[.!?।]/g;

export function splitSentences(buffer) {
  const sentences = [];
  let lastEnd = 0;
  let m;
  SENTENCE_RE.lastIndex = 0;
  while ((m = SENTENCE_RE.exec(buffer)) !== null) {
    const chunk = m[0];
    // Skip a decimal point: terminator is '.' with a digit on both sides.
    const endChar = chunk[chunk.length - 1];
    const afterIdx = m.index + chunk.length;
    if (endChar === "." && /\d$/.test(chunk.slice(0, -1)) && /^\d/.test(buffer.slice(afterIdx))) {
      continue;
    }
    const trimmed = chunk.trim();
    if (trimmed.length > 0) {
      sentences.push(trimmed);
      lastEnd = afterIdx;
    }
  }
  return { sentences, remainder: buffer.slice(lastEnd).trim() };
}

// ── End-of-call intent (multilingual) ───────────────────────────────────────
const END_PHRASES = [
  "that's all", "thats all", "that is all", "i'm done", "im done", "i am done",
  "no more", "nothing else", "goodbye", "bye", "thank you bye", "thanks bye",
  "end call", "stop", "that's it", "thats it",
  // Hindi / Hinglish
  "bas itna hi", "bas", "itna hi", "theek hai bye", "thik hai bye", "ho gaya",
  "aur nahi", "nahi aur", "khatam",
];

export function detectEndIntent(text) {
  if (typeof text !== "string") return false;
  const t = text.toLowerCase().trim();
  return END_PHRASES.some(p => t === p || t.includes(p));
}

// ── System prompt (Socratic-first, multilingual, RAG-grounded) ──────────────
export function buildSagelineSystemPrompt({ studentName, docName, ragContext, languageHint } = {}) {
  const name = studentName || "the student";
  const contextBlock = (ragContext && ragContext.trim())
    ? `\n\nWHAT THEY STUDIED (ground your questions in this — do not invent beyond it):\n"""${ragContext.trim()}"""`
    : "";
  const docLine = docName
    ? `You are quizzing ${name} orally on their notes: "${docName}".`
    : `You are quizzing ${name} orally on the topic they raise.`;
  const langLine = languageHint && languageHint !== "en"
    ? `They opened in ${languageHint === "hi" ? "Hindi/Hinglish" : languageHint}. `
    : "";

  return `You are SageLine — a warm, exam-aware voice tutor that picks up the phone and actually teaches. This is a live phone call, spoken aloud.

${docLine}

TEACHING METHOD — SOCRATIC FIRST (most important rule):
- Lead with a guiding QUESTION before you give any answer. Draw the reasoning out of ${name}.
- When they answer, react to what they actually said — catch the misconception, don't just move on.
- Only explain directly after they've tried, or when they're clearly stuck. Then keep it short and build intuition with a quick analogy.
- One idea per turn. This is a conversation, not a lecture.

VOICE & PACING:
- Open each reply with a brief natural acknowledgment ("Right—", "Okay, good", "Mmm, close") so it feels like a real call, not a bot.
- Spoken audio only: flowing sentences, no markdown, no bullet points, no symbols.
- Keep each turn to a few sentences — you'll lose them if you monologue.

LANGUAGE:
- ${langLine}Mirror the student's language and mix. If they speak Hinglish, reply in Hinglish. If they code-switch mid-sentence, follow them naturally. Never force a language toggle.

SESSION SHAPE:
- Warm opener → 5–10 minutes of oral questioning on the chosen material → a short wrap-up.
- When the student signals they're done, or you've covered enough, give a one-line encouraging wrap-up and end with [WRAP_UP].
- If they clearly want to hang up, end warmly with [END_CALL].${contextBlock}`;
}
