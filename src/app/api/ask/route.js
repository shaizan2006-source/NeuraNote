import { NextResponse } from "next/server";
import { createHash } from "crypto";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { canAskQuestion, recordQAUsage, getUserPlan } from "@/lib/planLimits";
import { checkMonthlyBudget, recordAISpend, budgetExhaustedResponse, estimateCost } from "@/lib/aiSpend";
import { isInternalDev } from "@/lib/internalAccess";
import { streamCompletion, completeWithFallback } from "@/lib/llmFallback";
import { sseMeta, sseToken, sseConv, SSE_HEADERS } from "@/lib/sseStream";
import { classifyQuery } from "@/lib/queryClassifier";
import { classifyWithLLM } from "@/lib/llmClassifier";
import { assemblePrompt } from "@/lib/promptAssembler";
import { COACH_SYSTEM_PROMPT } from "@/lib/prompts/coach";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 2, timeout: 45_000 });

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
      model = "gpt-4o-mini",    // "gpt-4o-mini" | "gpt-4o"
      // Continuation — set when user navigated from QuickChat "Open full chat"
      conversationId,            // existing conversation to append Q&A to
      priorMessages,             // [{role:"user"|"assistant", content:string}] history
    } = body;

    // Only allow known model IDs to prevent injection
    const safeModel = model === "gpt-4o" ? "gpt-4o" : "gpt-4o-mini";

    // ── Validate ─────────────────────────────────────────────
    if (typeof question !== "string" || question.trim() === "") {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }
    // F-032: cap input length before classify/embeddings/completion (cost/latency guard).
    if (question.length > 8000) {
      return NextResponse.json({ error: "Question is too long (max 8000 characters)." }, { status: 413 });
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
    // F-029: require authentication — a missing/expired token left userId null, which
    // skipped BOTH the rate-limit and budget cap → unauthenticated callers got unlimited
    // OpenAI usage (cost-abuse). All /api/ask callers are authenticated.
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // ── Monthly AI budget circuit breaker ────────────────────────────────
    if (userId && !isInternalDev(authUser)) {
      const plan        = await getUserPlan(userId, authUser);
      const budgetCheck = await checkMonthlyBudget(userId, plan);
      if (!budgetCheck.allowed) {
        return NextResponse.json(
          { ...budgetExhaustedResponse(budgetCheck), limitReached: true },
          { status: 429 }
        );
      }
    }

    // ── Coach mode: Socratic guidance, no RAG pipeline ────────
    if (mode === "coach") {
      const coachPrior = Array.isArray(priorMessages)
        ? priorMessages
            .filter(m => (m.role === "user" || m.role === "assistant") && m.content?.trim())
            .slice(-8)
        : [];

      const coachReadableStream = new ReadableStream({
        async start(controller) {
          try {
            controller.enqueue(sseMeta({
              sources:        [],
              usedContext:    false,
              classification: { domain: "coach", marks: 0, questionType: "theory", language: "en" },
            }));

            let fullAnswer = "";
            for await (const text of streamCompletion({
              systemPrompt: COACH_SYSTEM_PROMPT,
              messages:     [...coachPrior, { role: "user", content: question }],
              model:        safeModel,
              maxTokens:    700,
              temperature:  0.5,
            })) {
              fullAnswer += text;
              controller.enqueue(sseToken(text));
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
                  controller.enqueue(sseConv({ conversation_id: newConv.id }));
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

      return new Response(coachReadableStream, { headers: SSE_HEADERS });
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
        const cachedStream = new ReadableStream({
          start(controller) {
            controller.enqueue(sseMeta({
              sources:        [],
              usedContext:    false,
              fromCache:      true,
              classification: cached.classification ?? {
                domain:       classification.domain,
                marks:        classification.marks,
                questionType: classification.questionType,
                language:     classification.language,
              },
            }));
            controller.enqueue(sseToken(cached.answer));
            controller.close();
          },
        });

        return new Response(cachedStream, { headers: SSE_HEADERS });
      }
    }

    // ── Export intent — non-streaming path ────────────────────
    if (exportIntent) {
      const answer = await completeWithFallback({
        systemPrompt,
        messages:    [{ role: "user", content: userPrompt }],
        model:       safeModel,
        maxTokens,
        temperature,
      });

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

    // ── Streaming response (OpenAI → Anthropic fallback) ─────────────────
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          const classificationMeta = {
            domain:       classification.domain,
            marks:        classification.marks,
            questionType: classification.questionType,
            language:     classification.language,
          };

          // Send metadata first so the frontend can read domain/marks/etc.
          controller.enqueue(sseMeta({ sources, usedContext, classification: classificationMeta }));

          let fullAnswer = "";
          // streamCompletion handles OpenAI retry on 429/5xx transparently.
          for await (const text of streamCompletion({
            systemPrompt: systemPrompt,
            messages:     sanitisedPrior.concat([{ role: "user", content: userPrompt }]),
            model:        safeModel,
            maxTokens,
            temperature,
          })) {
            fullAnswer += text;
            controller.enqueue(sseToken(text));
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
                controller.enqueue(sseConv({ conversation_id: newConv.id }));
              }
            } catch (err) {
              console.error("new conversation create error:", err);
            }
          }

          controller.close();

          // ── Record AI spend (fire-and-forget) ────────────────────────
          // Estimate tokens from char count (rough: 1 token ≈ 4 chars).
          if (userId) {
            const estimatedTokensIn  = Math.ceil(userPrompt.length  / 4);
            const estimatedTokensOut = Math.ceil(fullAnswer.length   / 4);
            const costUsd = estimateCost({
              model:     safeModel,
              tokensIn:  estimatedTokensIn,
              tokensOut: estimatedTokensOut,
            });
            recordAISpend(userId, { costUsd, tokensIn: estimatedTokensIn, tokensOut: estimatedTokensOut })
              .catch(() => {});
          }

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

    return new Response(readableStream, { headers: SSE_HEADERS });

  } catch (err) {
    console.error("API ERROR:", err);
    return NextResponse.json(
      { error: "Something went wrong while generating the answer." },
      { status: 500 }
    );
  }
}
