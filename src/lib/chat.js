import { createClient } from "@supabase/supabase-js";
import { getRelevantChunks } from "./rag";
import OpenAI from "openai";

// 🔹 Init clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🔹 MAIN FUNCTION
export async function handleChat({ user_id, message }) {
  try {
    // -----------------------------------
    // 1. SAVE USER MESSAGE
    // -----------------------------------
    await supabase.from("chat_messages").insert([
      {
        user_id,
        role: "user",
        content: message,
      },
    ]);

    // -----------------------------------
    // 2. FETCH LAST 5 MESSAGES (CONTEXT)
    // -----------------------------------
    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(5);

    // Reverse so oldest → newest
    const recentMessages = (history || []).reverse();

    // -----------------------------------
    // 3. FETCH RAG CONTEXT (REUSE YOUR SYSTEM)
    // -----------------------------------
    const ragContext = await getRelevantChunks(message); 
    // ⚠️ IMPORTANT: This function should already exist in your RAG system
    // It should return relevant PDF text chunks

    // -----------------------------------
    // 4. BUILD PROMPT
    // -----------------------------------
    const systemPrompt = `
You are an AI study assistant.

Use the provided context to answer clearly and concisely.
If the user is confused, explain simply.

Context:
${ragContext}
`;

    const messages = [
      { role: "system", content: systemPrompt },

      ...recentMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),

      { role: "user", content: message },
    ];

    // -----------------------------------
    // 5. CALL OPENAI
    // -----------------------------------
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // cheap + fast
      messages,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0].message.content;

    // -----------------------------------
    // 6. SAVE AI RESPONSE
    // -----------------------------------
    await supabase.from("chat_messages").insert([
      {
        user_id,
        role: "assistant",
        content: aiResponse,
      },
    ]);

    // -----------------------------------
    // 7. RETURN RESPONSE
    // -----------------------------------
    return aiResponse;

  } catch (error) {
    console.error("Chat Error:", error);
    return "Something went wrong. Please try again.";
  }
}