import { NextResponse } from "next/server";
import pdf from "pdf-parse";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Parses an already-stored document: fetches from storage, creates embeddings + chunks.
// Idempotent: if chunks already exist, returns early without duplicating.
// Called lazily when the user clicks/activates a PDF in the sidebar.
export async function POST(req) {
  try {
    const { documentId, userId } = await req.json();
    if (!documentId || !userId) {
      return NextResponse.json({ error: "Missing documentId or userId" }, { status: 400 });
    }

    // Verify document belongs to user and get file_url
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("id, name, file_url")
      .eq("id", documentId)
      .eq("user_id", userId)
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (!doc.file_url) {
      return NextResponse.json({ error: "No file_url on document — cannot parse" }, { status: 422 });
    }

    // Idempotency: skip if already processed
    const { count } = await supabase
      .from("document_chunks")
      .select("id", { count: "exact", head: true })
      .eq("document_id", documentId);

    if (count > 0) {
      return NextResponse.json({ success: true, alreadyProcessed: true });
    }

    // Fetch file from storage
    const fileRes = await fetch(doc.file_url);
    if (!fileRes.ok) throw new Error(`Failed to fetch PDF from storage: ${fileRes.status}`);
    const buffer = Buffer.from(await fileRes.arrayBuffer());

    // Extract text
    const pdfData = await pdf(buffer);
    let text = pdfData.text;

    // OCR fallback for scanned PDFs or PDFs where spaces are missing
    const spaceRatio = text.length > 0 ? (text.match(/ /g) || []).length / text.length : 0;
    if (!text || text.trim().length < 50 || spaceRatio < 0.03) {
      const base64 = buffer.toString("base64");
      const ocrResponse = await openai.responses.create({
        model: "gpt-4o",
        input: [{
          role: "user",
          content: [
            { type: "input_file", filename: doc.name, file_data: `data:application/pdf;base64,${base64}` },
            { type: "input_text", text: "Extract all readable text from this document. Return only the raw text content with no commentary or formatting." },
          ],
        }],
      });
      text = ocrResponse.output_text;
    }

    if (!text || text.trim() === "") {
      return NextResponse.json({ error: "PDF has no readable text" }, { status: 422 });
    }

    // Normalize common PDF extraction artifacts: missing spaces between words
    text = text
      .replace(/([a-z])([A-Z])/g, '$1 $2')       // camelCase word boundaries
      .replace(/([.!?:;,])([A-Za-z0-9])/g, '$1 $2') // missing space after punctuation
      .replace(/[ \t]+/g, ' ')                    // collapse duplicate spaces
      .replace(/\n{3,}/g, '\n\n')                 // collapse excessive blank lines
      .trim();

    // Detect subject + extract topics in parallel
    const [subjectRes, topicRes] = await Promise.all([
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Identify the subject of this content in 1-2 words. Return ONLY the subject name." },
          { role: "user", content: text.slice(0, 3000) },
        ],
      }),
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Extract a clean bullet list of syllabus topics from this academic text. Keep it concise. Maximum 20 topics." },
          { role: "user", content: text.slice(0, 5000) },
        ],
      }),
    ]);

    const detectedSubject = subjectRes.choices[0].message.content
      .trim().toLowerCase().replace(/[^a-zA-Z ]/g, "");

    const topics = topicRes.choices[0].message.content
      .split("\n")
      .map(t => t.replace(/[-•*]/g, "").trim())
      .filter(t => t.length > 3)
      .slice(0, 20);

    // Split text into chunks
    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
    const chunks = await splitter.splitText(text);

    if (chunks.length === 0) {
      return NextResponse.json({ error: "No chunks created from PDF" }, { status: 422 });
    }

    // Create embeddings + insert topics in parallel
    const [embeddingResponse] = await Promise.all([
      openai.embeddings.create({ model: "text-embedding-3-small", input: chunks }),
      (async () => {
        for (const topic of topics) {
          await supabase.from("syllabus_topics").insert({ user_id: userId, subject: detectedSubject, topic });
        }
      })(),
    ]);

    // Update document with detected subject
    await supabase.from("documents").update({ subject: detectedSubject }).eq("id", documentId);

    // Insert chunks with embeddings
    const rows = chunks.map((chunk, i) => ({
      document_id: documentId,
      content: chunk,
      embedding: embeddingResponse.data[i].embedding,
      page_number: Math.floor(i / 3) + 1,
    }));

    const { error: chunksError } = await supabase.from("document_chunks").insert(rows);
    if (chunksError) throw chunksError;

    return NextResponse.json({ success: true, chunksStored: rows.length });
  } catch (err) {
    console.error("PARSE PDF ERROR:", err);
    return NextResponse.json({ error: "PDF parsing failed" }, { status: 500 });
  }
}
