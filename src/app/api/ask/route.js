import { NextResponse } from "next/server";
import { createHash } from "crypto";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { canAskQuestion, recordQAUsage } from "@/lib/planLimits";
import { classifyQuery } from "@/lib/queryClassifier";
import { classifyWithLLM } from "@/lib/llmClassifier";
import { assemblePrompt } from "@/lib/promptAssembler";

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

  // Increment hit counter fire-and-forget
  supabase
    .from("qa_cache")
    .update({ hit_count: supabase.rpc("qa_cache_hit_count_increment", { key: cacheKey }) })
    .eq("cache_key", cacheKey)
    .then(({ error }) => { if (error) console.error("cache hit increment failed:", error.message); });

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
    } = body;

    // ── Validate ─────────────────────────────────────────────
    if (!question || question.trim() === "") {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    // ── Auth + free tier Q&A limit ────────────────────────────
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    let userId = null;
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }
    if (userId) {
      const qaCheck = await canAskQuestion(userId);
      if (!qaCheck.allowed) {
        return NextResponse.json(
          { error: qaCheck.reason, upgradeUrl: qaCheck.upgradeUrl, limitReached: true },
          { status: 403 }
        );
      }
      recordQAUsage(userId).catch(() => {});
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

    // ── Streaming response ────────────────────────────────────
    const stream = await openai.chat.completions.create({
      model:       "gpt-4o-mini",
      temperature,
      max_tokens:  maxTokens,
      stream:      true,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt   },
      ],
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

          controller.close();

          // Store in cache if no PDF context was used
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
