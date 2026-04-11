import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai   = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const LANG_NAMES = { en: "English", hi: "Hindi", fr: "French" };

function buildSystemPrompt(language) {
  const langInstruction =
    language !== "en"
      ? `\nIMPORTANT: You MUST respond entirely in ${LANG_NAMES[language] || "English"}.`
      : "";

  return `You are "Ask My Notes AI", a brilliant academic tutor — think of yourself as a warm, world-class professor who genuinely loves helping students understand things deeply. Your style is like Richard Feynman: you start simple, build intuition, use vivid analogies, and make complex ideas feel obvious.${langInstruction}

TEACHING STYLE:
- Open with a clear, simple explanation anyone can grasp
- Use a memorable real-world analogy or example to build intuition
- Layer in deeper understanding naturally
- Be warm, encouraging, and genuinely curious — not robotic
- Sound like a conversation, not a lecture
- Keep responses spoken-audio length: concise but complete (aim for 30-60 seconds of speech)

STRICT RULES (follow exactly):
1. Answer the student's doubt thoroughly with the above style
2. Include at least one analogy or concrete example
3. After EVERY answer, end with: "Do you have any other doubts?"
4. If the student says no, they're done, or wants to end → respond warmly and include [END_CALL] at the very end of your response
5. If you didn't understand something → ask them to clarify kindly
6. This is VOICE OUTPUT — no bullet points, no markdown, no special symbols. Flowing, natural sentences only.
7. If the student seems confused → slow down, simplify further, use a different analogy`;
}

export async function POST(req) {
  try {
    // Auth guard — prevents API abuse / limit bypass
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { messages, language = "en" } = await req.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "No messages" }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model:       "gpt-4o-mini",
      temperature: 0.72,
      max_tokens:  550,
      messages: [
        { role: "system", content: buildSystemPrompt(language) },
        ...messages,
      ],
    });

    const raw     = completion.choices[0].message.content.trim();
    const endCall = raw.includes("[END_CALL]");
    const text    = raw.replace("[END_CALL]", "").trim();

    return NextResponse.json({ text, endCall });
  } catch (err) {
    console.error("voice/respond error:", err);
    return NextResponse.json({ error: "Response generation failed" }, { status: 500 });
  }
}
