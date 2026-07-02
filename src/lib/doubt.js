import { createHash } from "crypto";

// NUL separator (built at runtime so no control bytes live in this file).
const SEP = String.fromCharCode(0);

// Content-addressed thread key: same Q&A pair → same thread across refreshes;
// a regenerated (different) answer → a different thread. The separator
// prevents boundary collisions between question and answer.
export function buildParentKey(question, answer) {
  return createHash("sha256")
    .update(question + SEP + answer)
    .digest("hex")
    .slice(0, 32);
}

// The ONLY context a doubt thread's LLM calls ever receive is built here:
// the parent Q&A plus that thread's own messages. Isolation is enforced by
// which rows are fetched, not by prompt instructions.
export function buildDoubtSystemPrompt(question, answer) {
  return `You are Sage, helping a university student clear a doubt about one specific answer.

The student originally asked:
"""${question}"""

You answered:
"""${answer}"""

Answer their follow-up doubts about this answer only. Be clear and concise. If a doubt is unrelated to this answer, gently suggest asking it as a new question in the main chat.`;
}

export const SUGGEST_DOUBTS_PROMPT = `List 2-3 short follow-up doubts a university student might genuinely have after reading this answer. Reply with ONLY a JSON array: [{"label": "<max 8 words>", "prompt": "<the full doubt question>"}]`;

export function parseSuggestedDoubts(raw) {
  if (typeof raw !== "string") return [];
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const arr = JSON.parse(match[0]);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(d => d && typeof d.label === "string" && typeof d.prompt === "string")
      .map(d => ({ label: d.label.slice(0, 80), prompt: d.prompt.slice(0, 500) }))
      .slice(0, 3);
  } catch {
    return [];
  }
}

const HEX32 = /^[0-9a-f]{32}$/;
const UUID  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validEditTarget(targetType, targetKey) {
  if (targetType === "main_answer")   return HEX32.test(targetKey ?? "");
  if (targetType === "doubt_message") return UUID.test(targetKey ?? "");
  return false;
}
