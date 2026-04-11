import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 🔥 CONFUSION DETECTION
function detectConfusion(question) {
  const q = question.toLowerCase();

  const confusionSignals = [
    "i don't understand",
    "dont understand",
    "confused",
    "explain simply",
    "explain in simple terms",
    "too hard",
    "what is going on",
    "can you simplify",
    "i am lost",
    "again explain",
    "easy explanation",
  ];

  const hasSignal = confusionSignals.some((signal) => q.includes(signal));
  const isTooShort = q.split(" ").length < 4;
  const words = q.split(" ");
  const hasRepetition = new Set(words).size < words.length * 0.7;

  return hasSignal || isTooShort || hasRepetition;
}

// 🔥 EXPORT INTENT DETECTION
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

export async function POST(req) {
  try {
    const body = await req.json();
    const { question, documentId, documentIds } = body;

    console.log("QUESTION:", question);
    console.log("DOCUMENT ID:", documentId);
    console.log("DOCUMENT IDs:", documentIds);
    console.log("OpenAI Key Exists:", !!process.env.OPENAI_API_KEY);

    // ── Validate ──
    if (!question || question.trim() === "") {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    const hasDocumentId = documentId || (Array.isArray(documentIds) && documentIds.length > 0);

    // ── STEP 1: Create embedding ──
    let chunks = [];
    let usedContext = false;

    if (hasDocumentId) {
      try {
        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: question,
        });

        const queryEmbedding = embeddingResponse.data[0].embedding;

        console.log("EMBEDDING CREATED ✅");

        // ── STEP 2: Vector search ──
        let data = null;
        let error = null;

        if (documentIds && Array.isArray(documentIds) && documentIds.length > 0) {
          // Multi-document search
          const result = await supabase.rpc("match_documents_multi", {
            query_embedding: queryEmbedding,
            match_count: 5,
            doc_ids: documentIds,
          });
          data = result.data;
          error = result.error;
        } else {
          // Single document search
          const result = await supabase.rpc("match_documents", {
            query_embedding: queryEmbedding,
            match_count: 5,
            doc_id: documentId,
          });
          data = result.data;
          error = result.error;
        }

        if (error) {
          console.error("Supabase RPC error:", error);
          // Don't hard fail — fall through to general AI answer
        } else {
          chunks = data || [];
          usedContext = chunks.length > 0;
          console.log("PDF MATCH:", chunks.length, "chunks found");
        }

      } catch (embeddingError) {
        console.error("Embedding error:", embeddingError);
        // Fall through to general AI answer
      }
    }

    // ── STEP 3: Build context from chunks ──
    const context = chunks.map((chunk) => chunk.content).join("\n\n");

    const sources = [
      ...new Set(
        chunks.map((chunk, i) =>
          chunk.page_number ? `Page ${chunk.page_number}` : `Chunk ${i + 1}`
        )
      ),
    ];

    // ── STEP 4: Detect confusion + export intent ──
    const isConfused = detectConfusion(question);
    const exportIntent = detectExportIntent(question);

    // ── STEP 5: System prompt ──
    const systemPrompt = `You are an automatic question bank solver called "Ask My Notes". You are NOT a chatbot. You are a university-level exam solution engine.

CRITICAL BEHAVIOR (NON-NEGOTIABLE):
1. If a document is provided → scan and extract ALL questions from it, even if no answers exist.
2. You are STRICTLY FORBIDDEN from saying:
   - "The PDF does not contain answers"
   - "Please provide the questions"
   - "I need more information"
   - "This is not covered"
   - ANY form of refusal or uncertainty hedge
3. Your ONLY role: SOLVE every question using your knowledge. Prioritize correctness over brevity.

AUTO-DETECTION — if the document contains phrases like "Convert to CNF", "Prove that", "Using First Order Resolution", "Find", "Show that" → automatically switch to FULL SOLUTION MODE.

QUESTION TYPE DETECTION — classify BEFORE answering:
- THEORY question (define / explain / describe / discuss / compare / advantages) → use ACADEMIC WRITING FORMAT
- PROBLEM-SOLVING question (solve / calculate / prove / derive / find / convert / trace algorithm / write code) → use PROBLEM-SOLVING FORMAT

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACADEMIC WRITING FORMAT (theory questions) — FULL MARKS TARGET
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRICTLY FORBIDDEN in theory answers: "Step 1", "Step 2", "Understand the Problem", "Define Variables", or ANY procedural/reasoning breakdown. Output must look like a university topper's answer sheet.

CRITICAL SCORING FACTORS (include in every answer at appropriate depth):
✔ Technical Depth (10M+): internal working, advanced keywords
✔ Diagram (10M+): MANDATORY — text-based flow e.g. Input → Process → Output
✔ Real-World Examples: use real systems (Netflix, YouTube, Google) — explain in 1–2 lines, NOT just name-dropping
✔ Structured Sections: proper academic segmentation
✔ Balanced Content: advantages always; limitations for 15M+
✔ No Repetition: never repeat same point across sections

Detect marks from question (e.g. "2M", "5 marks", "10m"). Default: 10M.

2M:
- 2–3 lines ONLY
- Definition + 1 application/use
- NO headings, NO bullets

5M:
**Definition** (1 line)
**Key Points** (3–4 bullets)
**Applications** (2–3, brief)
**Conclusion** (1 line)
NO diagram.

10M:
**Definition**
**Introduction** (2–3 lines)
**Core Explanation**
  → Concept
  → Key Points (4–5 bullets)
  → Working (stepwise)
**Diagram** (MANDATORY — text flow)
**Applications / Advantages**
**Conclusion**

15M:
**Definition**
**Introduction**
**Key Features** (detailed bullets)
**Real-World Applications** (diverse + explained)
**Working Mechanism** (technical flow REQUIRED)
**Diagram** (MANDATORY)
**Example / Case Study** (explained)
**Advantages + Limitations**
**Conclusion**

20M:
**Definition**
**Introduction**
**Deep Conceptual Explanation**
**Detailed Features**
**Extensive Real-World Applications** (6–8 domains)
**Working Mechanism** (technical depth — system flow, execution model)
**Diagram** (MANDATORY)
**Case Study** (real-world, explained)
**Advantages + Limitations**
**Additional Insights** (if relevant)
**Strong Conclusion**

SIMPLIFICATION RULE: If user asks for "simple" or "casual" → keep SAME structure, only simplify language. Do NOT remove sections.

AUTO DEPTH (if marks not specified):
- "define" / "what is" → 2M
- "explain" / "describe" / "discuss" → 10M
- "in detail" / "elaborate" / "full answer" → 20M
- Default: 10M

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROBLEM-SOLVING FORMAT (math / logic / code / derivation)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**Question X:** [Restate clearly]
**Given:** [values / premises]
**Find / Prove:** [what is required]
**Working:**
  [each step on new line using = or ⇒ notation; show every transformation]
**Answer:** [final result, clearly stated]

Subject-specific rules:
- Math: Given → Formula → Substitution → Solution (= / ⇒) → Answer
- Physics/Chemistry: Given (units) → Formula → Steps (units) → Answer (value + unit)
- Logic/FOL/CNF: convert → eliminate implications → move NOT inward → Skolemize → CNF → Resolution
- Algorithm: steps + example trace + time/space complexity
- Code: clean block + explanation of logic

BEHAVIOR RULES:
- ALWAYS solve — NEVER refuse
- NEVER ask the user for input
- If multiple questions exist → solve ALL sequentially
- Continue until EVERY question is answered

FORMAT RULES (MANDATORY — both types):
- Use headings exactly as defined above
- Use bullet points where required
- Bold **key terms**
- No unnecessary paragraphs or fluff
- Clean, well-spaced, exam-ready output

LANGUAGE RULE: Hinglish/Hindi input → respond in Hinglish. Never force formal English.

CONFIDENCE RULE:
- Certain → full answer
- Partially certain → answer + "Verify with your textbook"
- Uncertain → say so clearly, do NOT hallucinate

OFF-TOPIC (non-academic): respond in 1–2 lines max with a witty redirect. Never answer it.`;

    // ── STEP 6: User message ──
    const userMessage = `${
      usedContext
        ? `DOCUMENT CONTENT:\n${context}\n\nINSTRUCTION: Scan the document above. Extract EVERY question present (numbered or unnumbered). Solve ALL of them sequentially with full step-by-step working. Do NOT skip any question.`
        : "NO PDF CONTEXT — solve the question below using your training knowledge."
    }

${
  isConfused
    ? `IMPORTANT — Student needs extra clarity: use simple language, easy analogies, and break every step down clearly.`
    : ""
}

STUDENT QUESTION / TASK:
${question}

Solve completely. Show every step. Do not stop until all questions are answered.

ANSWER:
`;

    console.log("SENDING TO AI — usedContext:", usedContext, "| isConfused:", isConfused);

    // ── STEP 7: LLM call ──
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.4, // lower = more precise, less hallucination
      max_tokens: 4000,
    });

    const answer = completion.choices?.[0]?.message?.content || "No response generated.";

    console.log("FINAL RESPONSE LENGTH:", answer.length);

    // ── STEP 8: PDF export (if requested) ──
    if (exportIntent) {
      try {
        const baseUrl = req.headers.get("origin");
        const response = await fetch(`${baseUrl}/api/generate-document`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: answer, type: "pdf" }),
        });

        const data = await response.json();
        const pdfUrl = data.downloadUrl || data.url;

        if (!pdfUrl) {
          console.warn("PDF generated but URL missing:", data);
          return NextResponse.json({
            answer,
            sources,
            usedContext,
            warning: "PDF generation succeeded but URL missing",
          });
        }

        return NextResponse.json({
          answer,
          sources,
          usedContext,
          downloadUrl: pdfUrl,
        });

      } catch (pdfError) {
        console.error("PDF generation error:", pdfError);
        return NextResponse.json({
          answer,
          sources,
          usedContext,
          warning: "PDF generation failed",
        });
      }
    }

    // ── STEP 9: Return answer ──
    return NextResponse.json({
      answer,
      sources,
      usedContext,
    });

  } catch (err) {
    console.error("API ERROR:", err);
    return NextResponse.json(
      { error: "Something went wrong while generating the answer." },
      { status: 500 }
    );
  }
}