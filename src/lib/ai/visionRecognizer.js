import { visionChat } from "@/lib/llm/openai";

const VISION_PROMPT = `You are an expert at reading academic questions from photos taken by students.

Analyze this image and extract:
1. The full question text (verbatim, as written)
2. Subject (physics / chemistry / mathematics / biology / other)
3. Topic (e.g., "Rotational Motion", "Electrochemistry")
4. Difficulty (easy / medium / hard)
5. Clarity (clear / unclear)

If the image is unclear, blurry, or not a question, set clarity to "unclear".

Respond ONLY with valid JSON:
{
  "question_text": "...",
  "subject": "...",
  "topic": "...",
  "difficulty": "easy|medium|hard",
  "clarity": "clear|unclear"
}`;

export async function recognizeQuestion(imageBase64, mimeType = "image/jpeg") {
  if (!imageBase64) throw new Error("recognizeQuestion: imageBase64 is required");

  const raw = await visionChat(imageBase64, mimeType, VISION_PROMPT, {
    max_tokens: 400,
    response_format: { type: "json_object" },
  });

  // Guard: model returned empty content
  if (!raw) throw new Error("recognizeQuestion: empty response from vision model");

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`recognizeQuestion: model returned invalid JSON: ${raw.slice(0, 100)}`);
  }
}
