import { createClient } from "@supabase/supabase-js";
import { embed } from "@/lib/llm/openai";
import logger from "@/lib/logger";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Retrieve the top-N most relevant document chunks for a query.
 * Returns "" on any failure — callers degrade gracefully (answer without context).
 *
 * Edge cases:
 * - Empty/blank query → return "" without wasting embedding quota
 * - Embedding call fails (429, 5xx) → retry via embed() wrapper → return "" on exhaustion
 * - match_documents RPC fails → log + return ""
 * - No matching chunks → return "" (not an error)
 * - data items missing content field → filtered out
 */
export async function getRelevantChunks(query, { matchCount = 5 } = {}) {
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return "";
  }

  try {
    const embeddingRes = await embed({
      model: "text-embedding-3-small",
      input: query.trim(),
    });

    const queryEmbedding = embeddingRes?.data?.[0]?.embedding;
    if (!queryEmbedding) {
      logger.warn("RAG: embedding response missing data", { query: query.slice(0, 80) });
      return "";
    }

    const { data, error } = await supabase.rpc("match_documents", {
      query_embedding: queryEmbedding,
      match_count:     matchCount,
    });

    if (error) {
      logger.error("RAG: match_documents failed", { error: error.message });
      return "";
    }

    return (data ?? [])
      .map(item => item?.content)
      .filter(Boolean)
      .join("\n\n---\n\n");

  } catch (err) {
    logger.error("RAG: unhandled error", { error: err });
    return "";
  }
}
