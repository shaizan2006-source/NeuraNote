import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 2, timeout: 45_000 });

const CLASSIFY_PROMPT = (question, subject, exam) => `
You are an expert at classifying JEE/NEET exam questions.

Classify this ${exam?.toUpperCase()} question in ${subject}:
"${question.slice(0, 500)}"

Return JSON only:
{
  "chapter": "exact chapter name (e.g. Rotational Motion, Electrochemistry)",
  "concepts": ["concept1", "concept2", "concept3"],
  "difficulty": "easy|medium|hard",
  "question_type": "mcq|numerical|assertion_reason"
}`;

export async function autoClassifyPyq(pyq) {
  if (pyq.chapter && pyq.concepts?.length) return pyq;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: CLASSIFY_PROMPT(pyq.question_text, pyq.subject, pyq.exam_type) }],
      temperature: 0.2,
      max_tokens: 200,
      response_format: { type: "json_object" },
    });
    const result = JSON.parse(completion.choices[0].message.content);
    return {
      ...pyq,
      chapter: pyq.chapter || result.chapter,
      concepts: pyq.concepts?.length ? pyq.concepts : (result.concepts ?? []),
      difficulty: pyq.difficulty || result.difficulty,
      question_type: pyq.question_type || result.question_type || "mcq",
    };
  } catch {
    return pyq;
  }
}
