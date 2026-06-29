import pdf from "pdf-parse";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 2, timeout: 45_000 });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Parses an already-stored document: fetches from storage, creates embeddings + chunks.
 * Idempotent: returns early if chunks already exist.
 *
 * @param {string} documentId
 * @param {string} userId  – must already be verified as the document owner by the caller
 * @returns {{ success: boolean, chunksStored?: number, alreadyProcessed?: boolean }}
 * @throws on unrecoverable errors (storage fetch failure, DB write failure)
 */
export async function parsePdfDocument(documentId, userId) {
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("id, name, file_url")
    .eq("id", documentId)
    .eq("user_id", userId)
    .single();

  if (docError || !doc) throw Object.assign(new Error("Document not found"), { code: "pdf_not_found", status: 404 });
  if (!doc.file_url) throw Object.assign(new Error("No file_url on document"), { code: "pdf_no_url", status: 422 });

  // Idempotency: skip if already processed
  const { count } = await supabase
    .from("document_chunks")
    .select("id", { count: "exact", head: true })
    .eq("document_id", documentId);

  if (count > 0) return { success: true, alreadyProcessed: true };

  // Fetch file from storage
  const fileRes = await fetch(doc.file_url);
  if (!fileRes.ok) throw new Error(`Failed to fetch PDF from storage: ${fileRes.status}`);
  const buffer = Buffer.from(await fileRes.arrayBuffer());

  // Extract text
  const pdfData = await pdf(buffer);
  let text = pdfData.text;

  // OCR fallback for scanned PDFs
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
    throw Object.assign(new Error("PDF has no readable text"), { code: "pdf_empty", status: 422 });
  }

  // Normalize common PDF extraction artifacts
  text = text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([.!?:;,])([A-Za-z0-9])/g, "$1 $2")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
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

  // Split into chunks
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
  const chunks = await splitter.splitText(text);
  if (chunks.length === 0) {
    throw Object.assign(new Error("No chunks created from PDF"), { code: "pdf_no_chunks", status: 422 });
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

  await supabase.from("documents").update({ subject: detectedSubject }).eq("id", documentId);

  const rows = chunks.map((chunk, i) => ({
    document_id: documentId,
    content: chunk,
    embedding: embeddingResponse.data[i].embedding,
    page_number: Math.floor(i / 3) + 1,
  }));

  const { error: chunksError } = await supabase.from("document_chunks").insert(rows);
  if (chunksError) throw chunksError;

  return { success: true, chunksStored: rows.length };
}
