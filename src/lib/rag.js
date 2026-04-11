import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ✅ IMPORTANT: EXPORT THIS FUNCTION
export async function getRelevantChunks(query) {
  try {
    // 🔹 1. Create embedding
    const embeddingRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });

    const queryEmbedding = embeddingRes.data[0].embedding;

    // 🔹 2. Search in Supabase
    const { data, error } = await supabase.rpc("match_documents", {
      query_embedding: queryEmbedding,
      match_count: 5,
    });

    if (error) {
      console.error("RAG Error:", error);
      return "";
    }

    // 🔹 3. Format context
    const context = data
      ?.map((item) => item.content)
      .join("\n\n---\n\n");

    return context || "";

  } catch (err) {
    console.error("Embedding Error:", err);
    return "";
  }
}