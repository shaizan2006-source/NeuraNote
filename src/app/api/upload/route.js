import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import pdf from "pdf-parse";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const userId = formData.get("userId");

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // 📌 Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 📌 1. Upload file to storage
    const filePath = `${userId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, buffer, {
        contentType: "application/pdf",
      });

    if (uploadError) throw uploadError;

    // 📌 2. Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("documents")
      .getPublicUrl(filePath);

    const fileUrl = publicUrlData.publicUrl;

    // 📌 3. Save document metadata
    const { data: docData, error: dbError } = await supabase
      .from("documents")
      .insert({
        user_id: userId,
        name: file.name,
        file_url: fileUrl,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // 📄 4. Extract text from PDF
    const pdfData = await pdf(buffer);
    const text = pdfData.text;

    if (!text || text.trim().length === 0) {
      return NextResponse.json({
        error: "Could not extract text from PDF",
      });
    }

    // ✂️ 5. Split into chunks
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const chunks = await splitter.splitText(text);

    // 🧠 6. Create embeddings + store
    for (const chunk of chunks) {

      const embeddingRes = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk,
      });

      const embedding = embeddingRes.data[0].embedding;

      const { error: chunkError } = await supabase
        .from("document_chunks")
        .insert({
          document_id: docData.id,
          content: chunk,
          embedding,
        });

      if (chunkError) throw chunkError;
    }

    return NextResponse.json({
      success: true,
      document: docData,
      chunks: chunks.length,
    });

  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}