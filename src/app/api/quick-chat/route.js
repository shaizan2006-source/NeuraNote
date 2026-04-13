import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const RAG_THRESHOLD = parseFloat(process.env.RAG_CONFIDENCE_THRESHOLD || "0.75");

export async function POST(req) {
  try {
    const { question, user_id, document_id, conversation_id } = await req.json();
    if (!question || !user_id) {
      return NextResponse.json({ error: "Missing question or user_id" }, { status: 400 });
    }

    // 1. RAG lookup (only if document_id provided)
    let ragText = "";
    let usedRag = false;
    let ragSourceNote = null;

    if (document_id) {
      try {
        const embRes = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: question,
        });
        const embedding = embRes.data[0].embedding;
        const { data: chunks } = await supabase.rpc("match_documents", {
          query_embedding: embedding,
          match_count: 5,
          doc_id: document_id,
        });
        const goodChunks = (chunks || []).filter(c => (c.similarity ?? 1) >= RAG_THRESHOLD);
        if (goodChunks.length > 0) {
          ragText = goodChunks.map(c => c.content).join("\n\n");
          usedRag = true;
        } else {
          // Fetch PDF name for the "not found" note
          const { data: pdf } = await supabase
            .from("pdfs_metadata")
            .select("name")
            .eq("id", document_id)
            .single();
          ragSourceNote = `Not found in ${pdf?.name ?? "your PDF"}, here's general knowledge:`;
        }
      } catch {
        // embedding failed, fall through to general AI
      }
    }

    // 2. Build messages
    let systemPrompt = "You are an AI study assistant. Answer clearly and concisely.";
    if (ragText) systemPrompt += `\n\nPDF Context:\n${ragText}`;

    // Load existing conversation messages for multi-turn
    let priorMessages = [];
    if (conversation_id) {
      const { data: conv } = await supabase
        .from("conversations")
        .select("messages")
        .eq("id", conversation_id)
        .eq("user_id", user_id)
        .single();
      priorMessages = conv?.messages ?? [];
    }

    const messagesForAI = [
      { role: "system", content: systemPrompt },
      ...priorMessages.slice(-8).map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: question },
    ];

    // 3. Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messagesForAI,
      max_tokens: 600,
    });
    const aiAnswer = completion.choices[0].message.content;

    // 4. Persist conversation
    const newUserMsg = { role: "user", content: question, ts: new Date().toISOString() };
    const newAiMsg   = { role: "assistant", content: aiAnswer, ts: new Date().toISOString(), used_rag: usedRag };

    const updatedMessages = [...priorMessages, newUserMsg, newAiMsg];
    let convId = conversation_id;

    if (!convId) {
      convId = uuidv4();
      await supabase.from("conversations").insert({
        id:       convId,
        user_id,
        title:    question.slice(0, 60),
        messages: updatedMessages,
      });
    } else {
      await supabase.from("conversations")
        .update({ messages: updatedMessages, updated_at: new Date().toISOString() })
        .eq("id", convId)
        .eq("user_id", user_id);
    }

    return NextResponse.json({
      answer:          ragSourceNote ? `${ragSourceNote}\n\n${aiAnswer}` : aiAnswer,
      conversation_id: convId,
      used_rag:        usedRag,
    });
  } catch (err) {
    console.error("quick-chat error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
