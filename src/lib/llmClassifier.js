// ──────────────────────────────────────────────────────────────
// LLM Fallback Classifier — called when keyword scoring is low-confidence
// Uses gpt-4o-mini structured output (~$0.00003 / call)
// ──────────────────────────────────────────────────────────────

const VALID_DOMAINS      = ["cs","physics","chemistry","math","biology","law","finance","mechanical","electrical","medical","business","general"];
const VALID_MARKS        = [2, 5, 10, 15, 20];
const VALID_QTYPES       = ["theory","problem","derivation","code","comparison","diagram","definition","case-study"];

const SYSTEM_PROMPT = `You are an academic question classifier. Given a student question, return ONLY a JSON object with these exact keys:
- "domain": one of [cs, physics, chemistry, math, biology, law, finance, mechanical, electrical, medical, business, general]
  medical = MBBS/clinical sciences (anatomy, physiology, pharmacology, pathology, diseases, drugs, surgery)
  business = BBA/MBA management (HRM, marketing, strategy, OB, operations, entrepreneurship)
- "marks": one of [2, 5, 10, 15, 20] — infer from question phrasing (define/list=2, explain=10, discuss in detail=15)
- "questionType": one of [theory, problem, derivation, code, comparison, diagram, definition, case-study]

No explanation. No markdown. Only the JSON object.`;

/**
 * classifyWithLLM(question, openai)
 * Returns partial classification: { domain, marks, questionType, confidence: "llm" }
 * Returns null on failure — caller should fall back to keyword result.
 */
export async function classifyWithLLM(question, openai) {
  try {
    const response = await openai.chat.completions.create({
      model:       "gpt-4o-mini",
      temperature: 0,
      max_tokens:  60,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: question.slice(0, 500) }, // cap to avoid token waste
      ],
    });

    const raw = response.choices[0]?.message?.content?.trim();
    if (!raw) return null;

    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    // Validate fields
    const domain       = VALID_DOMAINS.includes(parsed.domain) ? parsed.domain : null;
    const marks        = VALID_MARKS.includes(Number(parsed.marks)) ? Number(parsed.marks) : null;
    const questionType = VALID_QTYPES.includes(parsed.questionType) ? parsed.questionType : null;

    if (!domain) return null;

    return { domain, marks, questionType, confidence: "llm" };
  } catch (err) {
    console.warn("classifyWithLLM parse failed:", err.message);
    return null;
  }
}
