import { NextResponse, after } from "next/server";
import pdf from "pdf-parse";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { canUploadPDF } from "@/lib/planLimits";
import { extractConcepts } from "@/lib/ingest/extractConcepts";
import { validateConcepts } from "@/lib/ingest/validateConcepts";
import { writeConceptGraph } from "@/lib/ingest/persistGraph";
import { generateCards } from "@/lib/ingest/generateCards";
import { persistCards } from "@/lib/ingest/persistCards";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    // Authenticate user
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;

    // Free tier: check PDF upload limit (dev accounts bypass automatically).
    const uploadCheck = await canUploadPDF(userId, user);
    if (!uploadCheck.allowed) {
      return NextResponse.json(
        { error: uploadCheck.reason, upgradeUrl: uploadCheck.upgradeUrl, limitReached: true },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Extract text from PDF
    const pdfData = await pdf(buffer);
    let text = pdfData.text;
    let wasOCR = false;

    // ── OCR fallback for scanned PDFs via OpenAI Vision ──
    if (!text || text.trim().length < 50) {
      wasOCR = true;
      console.log("PDF appears scanned. Running OCR via OpenAI...");
      const base64 = buffer.toString("base64");
      const ocrResponse = await openai.responses.create({
        model: "gpt-4o",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_file",
                filename: file.name,
                file_data: `data:application/pdf;base64,${base64}`,
              },
              {
                type: "input_text",
                text: "Extract all readable text from this document. Return only the raw text content with no commentary or formatting.",
              },
            ],
          },
        ],
      });
      text = ocrResponse.output_text;
      console.log("OCR complete. Characters extracted:", text?.length ?? 0);
    }

    if (!text || text.trim() === "") {
      return NextResponse.json({
        error: "PDF has no readable text",
      });
    }

    // ===============================
    // 🔥 PARALLEL: SUBJECT + TOPICS
    // ===============================
    console.log("PROCESSING START");

    const [subjectRes, topicRes] = await Promise.all([
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an academic classifier. Identify the subject of this content in 1-2 words (e.g., Algorithms, AI, Web Technologies, OS, ML, Biology). Return ONLY the subject name, nothing else.",
          },
          {
            role: "user",
            content: text.slice(0, 3000),
          },
        ],
      }),
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Extract a clean bullet list of syllabus topics from this academic text. Keep it concise. Maximum 20 topics.",
          },
          {
            role: "user",
            content: text.slice(0, 5000),
          },
        ],
      }),
    ]);

    // ── Single source of truth for subject ──
    const detectedSubject = subjectRes.choices[0].message.content
      .trim()
      .toLowerCase()
      .replace(/[^a-zA-Z ]/g, "");

    console.log("AI Detected Subject:", detectedSubject);

    // ── Clean topic list, capped at 20 ──
    const topics = topicRes.choices[0].message.content
      .split("\n")
      .map((t) => t.replace(/[-•*]/g, "").trim())
      .filter((t) => t.length > 3)
      .slice(0, 20);

    console.log("Extracted Topics:", topics);

    // ===============================
    // 🔥 SPLIT TEXT INTO CHUNKS
    // ===============================
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const chunks = await splitter.splitText(text);

    if (chunks.length === 0) {
      return NextResponse.json({
        error: "No chunks created from PDF",
      });
    }

    // ===============================
    // 🔥 PARALLEL: EMBEDDINGS + TOPIC INSERTS
    // ===============================
    console.log("UPLOAD START");

    const [embeddingResponse] = await Promise.all([
      // Embeddings for all chunks
      openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunks,
      }),

      // Save syllabus topics to DB (fire in parallel)
      (async () => {
        for (const topic of topics) {
          const { error } = await supabase.from("syllabus_topics").insert({
            user_id: userId,
            subject: detectedSubject,
            topic: topic,
          });

          if (error) {
            console.error("Topic Insert Error:", error);
          } else {
            console.log("Inserted topic:", topic);
          }
        }
      })(),
    ]);

    const embeddings = embeddingResponse.data;

    // Create document ID
    const documentId = crypto.randomUUID();

    // ===============================
    // 🔥 SAVE DOCUMENT METADATA
    // ===============================
    await supabase.from("documents").insert({
      id: documentId,
      name: file.name,
      subject: detectedSubject,
      user_id: userId,
    });

    // ===============================
    // 🔥 INSERT CHUNKS
    // ===============================
    const rows = chunks.map((chunk, i) => ({
      document_id: documentId,
      content: chunk,
      embedding: embeddings[i].embedding,
      page_number: Math.floor(i / 3) + 1,
    }));

    const { data: insertedChunks, error } = await supabase
      .from("document_chunks")
      .insert(rows)
      .select("id, page_number");

    if (error) {
      console.error(error);
      return NextResponse.json({
        error: "Database insert failed",
      });
    }

    console.log("UPLOAD COMPLETE");
    console.log("PROCESSING DONE");

    // ===============================
    // 🔥 CONCEPT GRAPH EXTRACTION (post-response)
    // ===============================
    // Runs AFTER the response flushes so the upload stays fast.
    // OCR'd docs are skipped — their text quality is too noisy for grounding.
    after(async () => {
      if (wasOCR) {
        await supabase
          .from("documents")
          .update({
            concept_extraction_status: "skipped_ocr",
            concept_extraction_finished_at: new Date().toISOString(),
          })
          .eq("id", documentId);
        return;
      }

      try {
        await supabase
          .from("documents")
          .update({
            concept_extraction_status: "running",
            concept_extraction_started_at: new Date().toISOString(),
          })
          .eq("id", documentId);

        // Label chunks so the LLM references them by short id (c1, c2…)
        const labelledChunks = chunks.map((content, i) => ({
          label:   `c${i + 1}`,
          content,
          page:    Math.floor(i / 3) + 1,
        }));

        // Map label → { DB uuid, page } for persistGraph.source_refs
        const chunkMap = new Map(
          insertedChunks.map((c, i) => [
            `c${i + 1}`,
            { id: c.id, page: c.page_number },
          ]),
        );

        const raw = await extractConcepts({
          chunks:     labelledChunks,
          docTitle:   file.name,
          docSubject: detectedSubject,
        });

        const validated = validateConcepts({
          concepts: raw.concepts,
          edges:    raw.edges,
          chunks:   labelledChunks,
        });

        const persistStats = await writeConceptGraph({
          supabase,
          userId,
          documentId,
          concepts: validated.concepts,
          edges:    validated.edges,
          chunkMap,
        });

        const cards = generateCards({ concepts: validated.concepts, edges: validated.edges });
        const cardStats = await persistCards({
          supabase,
          userId,
          documentId,
          cards,
          tempToRealId: persistStats.tempToRealId,
        });

        await supabase
          .from("documents")
          .update({
            concept_extraction_status: "done",
            concept_extraction_finished_at: new Date().toISOString(),
            concepts_count: persistStats.inserted + persistStats.updated,
          })
          .eq("id", documentId);

        console.log("CONCEPT EXTRACTION DONE", {
          documentId,
          validator: validated.stats,
          persist:   persistStats,
          cards:     cardStats,
        });
      } catch (err) {
        console.error("CONCEPT EXTRACTION FAILED:", err);
        await supabase
          .from("documents")
          .update({
            concept_extraction_status: "failed",
            concept_extraction_error: String(err?.message ?? err).slice(0, 500),
            concept_extraction_finished_at: new Date().toISOString(),
          })
          .eq("id", documentId);
      }
    });

    return NextResponse.json({
      message: "PDF processed successfully",
      chunksStored: rows.length,
      documentId: documentId,
    });

  } catch (err) {
    console.error("PDF PROCESS ERROR:", err);

    return NextResponse.json({
      error: "PDF processing failed",
    }, { status: 500 });   // F-031: error must not return HTTP 200
  }
}