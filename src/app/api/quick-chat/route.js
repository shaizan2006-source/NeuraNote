import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";
import { verifyAuth } from "@/lib/serverAuth";
import { streamCompletion } from "@/lib/llmFallback";
import { recordAISpend, estimateCost } from "@/lib/aiSpend";
import { sseToken, sseConv, SSE_HEADERS } from "@/lib/sseStream";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 2, timeout: 45_000 });
const RAG_THRESHOLD = parseFloat(process.env.RAG_CONFIDENCE_THRESHOLD || "0.75");

export async function POST(req) {
  try {
    const authUser = await verifyAuth(req);
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // user_id from session — body value is ignored to prevent spoofing
    const user_id = authUser.id;

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { question, document_id, conversation_id } = body ?? {};
    if (!question || typeof question !== "string" || !question.trim()) {
      return NextResponse.json({ error: "question required" }, { status: 400 });
    }
    const safeQuestion = question.slice(0, 2000);

    // 1. RAG lookup (only if document_id provided)
    let ragText = "";
    let usedRag = false;
    let ragSourceNote = null;

    if (document_id) {
      try {
        const embRes = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: safeQuestion,
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
        .eq("user_id", user_id)  // ownership enforced
        .single();
      priorMessages = conv?.messages ?? [];
    }

    const messagesForAI = [
      { role: "system", content: systemPrompt },
      ...priorMessages.slice(-8).map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: safeQuestion },
    ];

    // 3. Stream (with OpenAI → fallback retry on 429/5xx)
    const [systemMsg, ...userMessages] = messagesForAI;
    let accumulated = "";

    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Prepend RAG source note if applicable
          if (ragSourceNote) {
            const prefix = `${ragSourceNote}\n\n`;
            accumulated += prefix;
            controller.enqueue(sseToken(prefix));
          }

          for await (const text of streamCompletion({
            systemPrompt: systemMsg.content,
            messages:     userMessages,
            model:        "gpt-4o-mini",
            maxTokens:    600,
          })) {
            accumulated += text;
            controller.enqueue(sseToken(text));
          }

          // Persist conversation to Supabase after stream completes
          const newUserMsg = { role: "user", content: safeQuestion, ts: new Date().toISOString() };
          const newAiMsg   = { role: "assistant", content: accumulated, ts: new Date().toISOString(), used_rag: usedRag };
          const updatedMessages = [...priorMessages, newUserMsg, newAiMsg];

          let convId = conversation_id;
          if (!convId) {
            convId = uuidv4();
            await supabase.from("conversations").insert({
              id:       convId,
              user_id,
              title:    safeQuestion.slice(0, 60),
              messages: updatedMessages,
            });
          } else {
            await supabase.from("conversations")
              .update({ messages: updatedMessages, updated_at: new Date().toISOString() })
              .eq("id", convId)
              .eq("user_id", user_id);
          }

          // Track question server-side (fires even if client tab closes mid-stream)
          supabase.from("learning_events").insert({
            user_id:    user_id,
            event_type: "question_asked",
            surface:    "ask_ai",
            metadata:   {
              mode:         "answer",
              threadId:     convId,
              depth:        priorMessages.length,
              charCount:    safeQuestion.length,
              used_rag:     usedRag,
              questionText: safeQuestion.slice(0, 400),
            },
          }).then(() => {}).catch(() => {});

          // Record AI spend (fire-and-forget)
          const promptLen     = userMessages.reduce((n, m) => n + (m.content?.length ?? 0), 0);
          const estimatedIn   = Math.ceil((systemMsg.content.length + promptLen) / 4);
          const estimatedOut  = Math.ceil(accumulated.length / 4);
          recordAISpend(user_id, {
            costUsd:   estimateCost({ model: "gpt-4o-mini", tokensIn: estimatedIn, tokensOut: estimatedOut }),
            tokensIn:  estimatedIn,
            tokensOut: estimatedOut,
          }).catch(() => {});

          // Send conversation metadata to client — parsed by QuickChatDrawer
          controller.enqueue(sseConv({ conversation_id: convId, used_rag: usedRag }));
        } catch (err) {
          console.error("quick-chat stream error:", err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, { headers: SSE_HEADERS });
  } catch (err) {
    console.error("quick-chat error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
