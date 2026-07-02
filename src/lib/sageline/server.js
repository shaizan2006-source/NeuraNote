import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 2, timeout: 45_000 });

/** Verify bearer token → user, or null. */
export async function getUser(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  return error ? null : user;
}

/** Fetch a session and confirm ownership. Returns the row or null. */
export async function getOwnedSession(sessionId, userId) {
  if (!sessionId) return null;
  const { data } = await supabase
    .from("sageline_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  return data && data.user_id === userId ? data : null;
}

/**
 * RAG context scoped to a single document (the session's chosen material),
 * following the /api/ask embedding pattern — match_documents with doc_id.
 */
export async function getSessionRagContext(question, documentId) {
  if (!documentId || !question?.trim()) return "";
  try {
    const emb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: question.trim(),
    });
    const { data, error } = await supabase.rpc("match_documents", {
      query_embedding: emb.data[0].embedding,
      match_count: 5,
      doc_id: documentId,
    });
    if (error) return "";
    return (data ?? []).map(c => c?.content).filter(Boolean).join("\n\n");
  } catch {
    return "";
  }
}
