import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: "high" } },
          { type: "text", text: VISION_PROMPT },
        ],
      },
    ],
    max_tokens: 400,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0].message.content;
  return JSON.parse(raw);
}
