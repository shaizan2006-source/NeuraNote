import { NextResponse } from "next/server";
import { createHash } from "crypto";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { canAskQuestion, recordQAUsage } from "@/lib/planLimits";
import { classifyQuery } from "@/lib/queryClassifier";
import { classifyWithLLM } from "@/lib/llmClassifier";
import { assemblePrompt } from "@/lib/promptAssembler";
import { COACH_SYSTEM_PROMPT } from "@/lib/prompts/coach";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Cache helpers ────────────────────────────────────────────
const CACHE_TTL_DAYS = 7;

function buildCacheKey(question, domain, marks) {
  const raw = `${question.trim().toLowerCase()}|${domain}|${marks}`;
  return createHash("sha256").update(raw).digest("hex");
}

async function getCachedAnswer(cacheKey) {
  const { data, error } = await supabase
    .from("qa_cache")
    .select("answer, classification")
    .eq("cache_key", cacheKey)
    .gt("created_at", new Date(Date.now() - CACHE_TTL_DAYS * 86400_000).toISOString())
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

async function storeCachedAnswer(cacheKey, question, classification, answer) {
  try {
    const { error } = await supabase.from("qa_cache").upsert({
      cache_key:      cacheKey,
      question,
      domain:         classification.domain,
      marks:          classification.marks,
      answer,
      classification,
      created_at:     new Date().toISOString(),
    }, { onConflict: "cache_key", ignoreDuplicates: true });
    if (error) console.error("cache upsert failed:", error.message);
  } catch (err) {
    console.error("cache upsert unexpected error:", err);
  }
}

// ── Confusion detection ──────────────────────────────────────
function detectConfusion(question) {
  const q = question.toLowerCase();
  const signals = [
    "i don't understand", "dont understand", "confused",
    "explain simply", "explain in simple terms", "too hard",
    "what is going on", "can you simplify", "i am lost",
    "again explain", "easy explanation", "samajh nahi", "samajhao",
  ];
  return signals.some((s) => q.includes(s));
}

// ── Export intent detection ──────────────────────────────────
function detectExportIntent(question) {
  const q = question.toLowerCase();
  return (
    q.includes("generate pdf") ||
    q.includes("download") ||
    q.includes("export") ||
    q.includes("save as pdf") ||
    q.includes("create pdf")
  );
}

// ════════════════════════════════════════════════════════════
// POST — Streaming handler
// ════════════════════════════════════════════════════════════
export async function POST(req) {
  try {
    const body = await req.json();
    const {
      question,
      documentId,
      documentIds,
      subject,                   // optional: from UI subject selector
      marks: metaMarks,          // optional: from UI marks selector
      mode = "answering",        // "answering" | "coach"
      // Continuation — set when user navigated from QuickChat "Open full chat"
      conversationId,            // existing conversation to append Q&A to
      priorMessages,             // [{role:"user"|"assistant", content:string}] history
    } = body;

    // ── Validate ─────────────────────────────────────────────
    if (!question || question.trim() === "") {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    // ── Auth + free tier Q&A limit (dev accounts bypass automatically) ──
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    let userId = null;
    let authUser = null;
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token);
      userId   = user?.id || null;
      authUser = user || null;
    }
    // Coach mode bypasses the Q&A rate-limit (conversational turns, not factual answers)
    if (userId && mode !== "coach") {
      const qaCheck = await canAskQuestion(userId, authUser);
      if (!qaCheck.allowed) {
        return NextResponse.json(
          { error: qaCheck.reason, upgradeUrl: qaCheck.upgradeUrl, limitReached: true },
          { status: 403 }
        );
      }
      recordQAUsage(userId).catch(() => {});
    }

    // ── Coach mode: Socratic guidance, no RAG pipeline ────────
    if (mode === "coach") {
      const coachPrior = Array.isArray(priorMessages)
        ? priorMessages
            .filter(m => (m.role === "user" || m.role === "assistant") && m.content?.trim())
            .slice(-8)
        : [];

      const coachMessages = [
        { role: "system", content: COACH_SYSTEM_PROMPT },
        ...coachPrior,
        { role: "user", content: question },
      ];

      const coachStream = await openai.chat.completions.create({
        model:       "gpt-4o-mini",
        temperature: 0.5,
        max_tokens:  700,
        stream:      true,
        messages:    coachMessages,
      });

      const coachReadableStream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          try {
            const meta = JSON.stringify({
              sources:        [],
              usedContext:    false,
              classification: { domain: "coach", marks: 0, questionType: "theory", language: "en" },
            }) + "\n";
            controller.enqueue(encoder.encode(`__META__${meta}`));

            let fullAnswer = "";
            for await (const chunk of coachStream) {
              const text = chunk.choices[0]?.delta?.content || "";
              if (text) {
                fullAnswer += text;
                controller.enqueue(encoder.encode(text));
              }
            }

            const ts = new Date().toISOString();

            if (conversationId && fullAnswer) {
              try {
                const { data: conv } = await supabase
                  .from("conversations")
                  .select("messages")
                  .eq("id", conversationId)
                  .single();
                const existing = Array.isArray(conv?.messages) ? conv.messages : [];
                await supabase
                  .from("conversations")
                  .update({
                    messages:   [...existing,
                      { role: "user",      content: question,   ts },
                      { role: "assistant", content: fullAnswer, ts },
                    ],
                    updated_at: ts,
                  })
                  .eq("id", conversationId);
              } catch (saveErr) {
                console.error("coach conversation save error:", saveErr);
              }
            } else if (!conversationId && userId && fullAnswer) {
              try {
                const title = question.trim().slice(0, 80) || "Coach Session";
                const { data: newConv } = await supabase
                  .from("conversations")
                  .insert({
                    user_id:    userId,
                    title,
                    messages:   [
                      { role: "user",      content: question,   ts },
                      { role: "assistant", content: fullAnswer, ts },
                    ],
                    created_at: ts,
                    updated_at: ts,
                  })
                  .select("id")
                  .single();
                if (newConv?.id) {
                  controller.enqueue(
                    encoder.encode(`\n__CONV__${JSON.stringify({ conversation_id: newConv.id })}`)
                  );
                }
              } catch (err) {
                console.error("coach new conversation create error:", err);
              }
            }

            controller.close();
          } catch (err) {
            console.error("Coach stream error:", err);
            controller.error(err);
          }
        },
      });

      return new Response(coachReadableStream, {
        headers: {
          "Content-Type":           "text/plain; charset=utf-8",
          "X-Content-Type-Options": "nosniff",
          "Cache-Control":          "no-cache",
          "X-Sources":              "[]",
          "X-Used-Context":         "false",
          "X-From-Cache":           "false",
        },
      });
    }

    // ── Classify query ────────────────────────────────────────
    let classification = classifyQuery(question, {
      domain: subject || null,
      marks:  metaMarks ? parseInt(metaMarks) : null,
    });

    // LLM fallback for low/none confidence (only when no explicit metadata)
    if (!subject && (classification.confidence === "low" || classification.confidence === "none")) {
      const llmResult = await classifyWithLLM(question, openai);
      if (llmResult) {
        classification = {
          ...classification,
          domain:       llmResult.domain       ?? classification.domain,
          marks:        llmResult.marks        ?? classification.marks,
          questionType: llmResult.questionType ?? classification.questionType,
          confidence:   "llm",
        };
      }
    }

    const isConfused    = detectConfusion(question);
    const exportIntent  = detectExportIntent(question);

    const hasDocumentId =
      documentId ||
      (Array.isArray(documentIds) && documentIds.length > 0);

    // ── Vector search for PDF context ─────────────────────────
    let chunks     = [];
    let usedContext = false;

    if (hasDocumentId) {
      try {
        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: question,
        });
        const queryEmbedding = embeddingResponse.data[0].embedding;

        let data = null, error = null;

        if (Array.isArray(documentIds) && documentIds.length > 0) {
          ({ data, error } = await supabase.rpc("match_documents_multi", {
            query_embedding: queryEmbedding,
            match_count: 5,
            doc_ids: documentIds,
          }));
        } else {
          ({ data, error } = await supabase.rpc("match_documents", {
            query_embedding: queryEmbedding,
            match_count: 5,
            doc_id: documentId,
          }));
        }

        if (!error) {
          chunks      = data || [];
          usedContext = chunks.length > 0;
        } else {
          console.error("Supabase RPC error:", error);
        }
      } catch (embeddingError) {
        console.error("Embedding error:", embeddingError);
      }
    }
    // No PDF selected → usedContext stays false; answer uses training knowledge

    const context = chunks.map((c) => c.content).join("\n\n");
    const sources = [
      ...new Set(
        chunks.map((c, i) =>
          c.page_number ? `Page ${c.page_number}` : `Chunk ${i + 1}`
        )
      ),
    ];

    // ── Assemble prompt ───────────────────────────────────────
    const { systemPrompt, userPrompt, temperature, maxTokens } = assemblePrompt({
      classification,
      context,
      isConfused,
    });

    // ── Cache check (only for general-knowledge answers, no PDF context) ──
    const cacheKey = buildCacheKey(question, classification.domain, classification.marks);
    if (!usedContext && !exportIntent) {
      const cached = await getCachedAnswer(cacheKey);
      if (cached) {
        const metaChunk = JSON.stringify({
          sources: [],
          usedContext: false,
          fromCache: true,
          classification: cached.classification ?? {
            domain:       classification.domain,
            marks:        classification.marks,
            questionType: classification.questionType,
            language:     classification.language,
          },
        }) + "\n";

        const encoder = new TextEncoder();
        const cachedStream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`__META__${metaChunk}`));
            controller.enqueue(encoder.encode(cached.answer));
            controller.close();
          },
        });

        return new Response(cachedStream, {
          headers: {
            "Content-Type":           "text/plain; charset=utf-8",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control":          "no-cache",
            "X-Sources":              "[]",
            "X-Used-Context":         "false",
            "X-From-Cache":           "true",
          },
        });
      }
    }

    // ── Export intent — non-streaming path ────────────────────
    if (exportIntent) {
      const completion = await openai.chat.completions.create({
        model:       "gpt-4o-mini",
        temperature,
        max_tokens:  maxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt   },
        ],
      });

      const answer = completion.choices[0].message.content;

      try {
        const baseUrl = req.headers.get("origin");
        const res = await fetch(`${baseUrl}/api/generate-document`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ content: answer, type: "pdf" }),
        });
        const data     = await res.json();
        const pdfUrl   = data.downloadUrl || data.url;
        return NextResponse.json({ answer, sources, usedContext, downloadUrl: pdfUrl });
      } catch {
        return NextResponse.json({ answer, sources, usedContext });
      }
    }

    // ── Build OpenAI messages array ───────────────────────────
    // When continuing a QuickChat conversation, inject prior turns between
    // the system prompt and the current user question so the model has context.
    const sanitisedPrior = Array.isArray(priorMessages)
      ? priorMessages
          .filter(m => (m.role === "user" || m.role === "assistant") && m.content?.trim())
          .slice(-8)
      : [];

    const openAIMessages = [
      { role: "system", content: systemPrompt },
      ...sanitisedPrior,
      { role: "user",   content: userPrompt   },
    ];

    // ── Streaming response ────────────────────────────────────
    const stream = await openai.chat.completions.create({
      model:       "gpt-4o-mini",
      temperature,
      max_tokens:  maxTokens,
      stream:      true,
      messages:    openAIMessages,
    });

    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          const classificationMeta = {
            domain:       classification.domain,
            marks:        classification.marks,
            questionType: classification.questionType,
            language:     classification.language,
          };

          // Send metadata first so the frontend can read domain/marks/etc.
          const meta = JSON.stringify({
            sources,
            usedContext,
            classification: classificationMeta,
          }) + "\n";
          controller.enqueue(encoder.encode(`__META__${meta}`));

          let fullAnswer = "";
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || "";
            if (text) {
              fullAnswer += text;
              controller.enqueue(encoder.encode(text));
            }
          }

          const ts = new Date().toISOString();

          if (conversationId && fullAnswer) {
            // ── Append Q&A to existing conversation ────────────────
            try {
              const { data: conv } = await supabase
                .from("conversations")
                .select("messages")
                .eq("id", conversationId)
                .single();
              const existing = Array.isArray(conv?.messages) ? conv.messages : [];
              await supabase
                .from("conversations")
                .update({
                  messages:   [...existing,
                    { role: "user",      content: question,   ts },
                    { role: "assistant", content: fullAnswer, ts },
                  ],
                  updated_at: ts,
                })
                .eq("id", conversationId);
            } catch (saveErr) {
              console.error("conversation save error:", saveErr);
            }
          } else if (!conversationId && userId && fullAnswer) {
            // ── Create new conversation (Ask AI direct path) ────────
            try {
              const title = question.trim().slice(0, 80) || "New Chat";
              const { data: newConv } = await supabase
                .from("conversations")
                .insert({
                  user_id:    userId,
                  title,
                  messages:   [
                    { role: "user",      content: question,   ts },
                    { role: "assistant", content: fullAnswer, ts },
                  ],
                  created_at: ts,
                  updated_at: ts,
                })
                .select("id")
                .single();
              if (newConv?.id) {
                // Signal the client with the new conversation ID
                controller.enqueue(
                  encoder.encode(`\n__CONV__${JSON.stringify({ conversation_id: newConv.id })}`)
                );
              }
            } catch (err) {
              console.error("new conversation create error:", err);
            }
          }

          controller.close();

          // Store in cache (fire-and-forget, after stream ends)
          if (!usedContext && fullAnswer.length > 50) {
            storeCachedAnswer(cacheKey, question, classificationMeta, fullAnswer);
          }
        } catch (err) {
          console.error("Stream error:", err);
          controller.error(err);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type":           "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control":          "no-cache",
        "X-Sources":              JSON.stringify(sources),
        "X-Used-Context":         String(usedContext),
      },
    });

  } catch (err) {
    console.error("API ERROR:", err);
    return NextResponse.json(
      { error: "Something went wrong while generating the answer." },
      { status: 500 }
    );
  }
}
