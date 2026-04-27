/**
 * artifactGenerator.js — Generates flashcards and micro-quizzes from weak clusters.
 * Calls OpenAI API with structured prompts.
 */

const FLASHCARD_PROMPT = (topics, avgMastery) => `You are an expert tutor creating flashcards for students struggling with specific topics.

Topics to cover (current mastery: ${avgMastery}%):
${topics.map((t, i) => `${i + 1}. ${t}`).join("\n")}

Generate EXACTLY 5 flashcards. Each flashcard must be concise, focused, and progressive in difficulty.
Format as JSON array:

[
  {
    "front": "Question or prompt (15-25 words)",
    "back": "Detailed answer with key insight (30-60 words)",
    "topic": "Which of the listed topics does this cover"
  }
]

Requirements:
- Front side: clear, unambiguous question
- Back side: include memory hooks, analogies, or why it matters
- Progress from foundational to applied concepts
- Avoid yes/no questions; use open-ended prompts
- Back side must explain the concept, not just define it

Return ONLY the JSON array, no markdown.`;

const QUIZ_PROMPT = (topics, avgMastery) => `You are an expert tutor creating a micro-quiz for self-assessment.

Topics to cover (current mastery: ${avgMastery}%):
${topics.map((t, i) => `${i + 1}. ${t}`).join("\n")}

Generate EXACTLY 4 multiple-choice questions covering these topics.
Format as JSON array:

[
  {
    "question": "Clear, single-concept question (20-30 words)",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "explanation": "Why this is correct and why other options are wrong (40-60 words)",
    "topic": "Which of the listed topics does this test"
  }
]

Requirements:
- Each question tests one clear concept
- Correct answer at index 0, 1, 2, or 3 (randomize placement)
- Explanations must teach, not just confirm the answer
- Options should be plausible but distinct
- Cover breadth of topics (don't cluster all Q's on one topic)

Return ONLY the JSON array, no markdown.`;

/**
 * generateFlashcards — calls OpenAI API to generate flashcards.
 *
 * @param {object} cluster { label, topics: [], avgScore }
 * @param {object} openai OpenAI client (from new OpenAI())
 * @returns {Promise<array>} Array of { front, back, topic }
 */
export async function generateFlashcards(cluster, openai) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: FLASHCARD_PROMPT(cluster.topics, cluster.avgScore),
        },
      ],
    });

    const text = response.choices[0]?.message?.content || "";
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error("Expected array");
    return parsed;
  } catch (err) {
    console.error(`[artifactGenerator] flashcard generation failed:`, err.message);
    throw err;
  }
}

/**
 * generateQuiz — calls OpenAI API to generate a micro-quiz.
 *
 * @param {object} cluster { label, topics: [], avgScore }
 * @param {object} openai OpenAI client
 * @returns {Promise<array>} Array of { question, options, correct, explanation, topic }
 */
export async function generateQuiz(cluster, openai) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: QUIZ_PROMPT(cluster.topics, cluster.avgScore),
        },
      ],
    });

    const text = response.choices[0]?.message?.content || "";
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error("Expected array");
    return parsed;
  } catch (err) {
    console.error(`[artifactGenerator] quiz generation failed:`, err.message);
    throw err;
  }
}

/**
 * clusterToId — converts cluster label to safe identifier.
 * e.g., "Thermodynamics" → "thermodynamics_cluster"
 */
export function clusterToId(label) {
  return label
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .concat("_cluster");
}
