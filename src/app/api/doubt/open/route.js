import { NextResponse } from "next/server";
import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";
import { FLAGS, flagDisabledResponse } from "@/lib/featureFlags";
import { buildParentKey, buildDoubtSystemPrompt, parseSuggestedDoubts, SUGGEST_DOUBTS_PROMPT } from "@/lib/doubt";
import { completeWithFallback } from "@/lib/llmFallback";
import { checkMonthlyBudget, recordAISpend, budgetExhaustedResponse, estimateCost } from "@/lib/aiSpend";
import { getUserPlan } from "@/lib/planLimits";
import { isInternalDev } from "@/lib/internalAccess";

/**
 * POST /api/doubt/open — body: { conversation_id, question, answer }.
 * Returns the existing thread for this exact Q&A (suggested_doubts cached,
 * NEVER regenerated) or creates one, generating suggestions from a context
 * of ONLY the parent Q&A.
 */
export async function POST(req) {
  if (!FLAGS.DOUBT_SIDEBAR) return flagDisabledResponse();

  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { conversation_id, question, answer } = body ?? {};
  if (
    typeof conversation_id !== "string" ||
    typeof question !== "string" || question.trim() === "" || question.length > 8000 ||
    typeof answer !== "string" || answer.trim() === "" || answer.length > 20000
  ) {
    return NextResponse.json({ error: "conversation_id, question and answer required" }, { status: 400 });
  }

  // Canonical check: the answer must actually exist in the user's own
  // conversation — a doubt thread can't be seeded with fabricated context.
  const { data: convo } = await supabaseAdmin
    .from("conversations")
    .select("id, user_id, messages")
    .eq("id", conversation_id)
    .maybeSingle();
  if (!convo || convo.user_id !== user.id) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }
  const inConversation = Array.isArray(convo.messages) &&
    convo.messages.some(m => m?.role === "assistant" && m?.content === answer);
  if (!inConversation) {
    return NextResponse.json({ error: "Answer not found in conversation" }, { status: 404 });
  }

  const parent_key = buildParentKey(question, answer);

  // Existing thread → return as-is with its own messages. No LLM call.
  const { data: existing } = await supabaseAdmin
    .from("doubt_threads")
    .select("id, parent_key, original_question, original_answer, suggested_doubts")
    .eq("user_id", user.id)
    .eq("conversation_id", conversation_id)
    .eq("parent_key", parent_key)
    .maybeSingle();

  if (existing) {
    const { data: messages } = await supabaseAdmin
      .from("doubt_thread_messages")
      .select("id, role, content, created_at")
      .eq("thread_id", existing.id)
      .order("created_at", { ascending: true });
    return NextResponse.json({ thread: existing, messages: messages ?? [] });
  }

  // New thread → one suggestion-generation call, cached forever in jsonb.
  if (!isInternalDev(user)) {
    const plan = await getUserPlan(user.id, user);
    const budgetCheck = await checkMonthlyBudget(user.id, plan);
    if (!budgetCheck.allowed) {
      return NextResponse.json(budgetExhaustedResponse(budgetCheck), { status: 429 });
    }
  }

  let suggested = [];
  try {
    const raw = await completeWithFallback({
      systemPrompt: buildDoubtSystemPrompt(question, answer),
      messages:     [{ role: "user", content: SUGGEST_DOUBTS_PROMPT }],
      model:        "gpt-4o-mini",
      maxTokens:    300,
      temperature:  0.7,
    });
    suggested = parseSuggestedDoubts(raw);
    const tokensIn  = Math.ceil((question.length + answer.length) / 4);
    const tokensOut = Math.ceil((raw?.length ?? 0) / 4);
    recordAISpend(user.id, {
      costUsd: estimateCost({ model: "gpt-4o-mini", tokensIn, tokensOut }),
      tokensIn, tokensOut,
    }).catch(() => {});
  } catch (err) {
    console.error("[doubt/open] suggestion generation failed:", err.message);
    // Non-fatal — thread still opens, just without suggestion cards.
  }

  const { data: created, error: insertErr } = await supabaseAdmin
    .from("doubt_threads")
    .insert({
      user_id:           user.id,
      conversation_id,
      parent_key,
      original_question: question,
      original_answer:   answer,
      suggested_doubts:  suggested,
    })
    .select("id, parent_key, original_question, original_answer, suggested_doubts")
    .single();

  if (insertErr) {
    // Unique violation → a parallel open won the race; return that thread.
    if (insertErr.code === "23505") {
      const { data: raced } = await supabaseAdmin
        .from("doubt_threads")
        .select("id, parent_key, original_question, original_answer, suggested_doubts")
        .eq("user_id", user.id)
        .eq("conversation_id", conversation_id)
        .eq("parent_key", parent_key)
        .single();
      return NextResponse.json({ thread: raced, messages: [] });
    }
    console.error("[doubt/open] insert failed:", insertErr.message);
    return NextResponse.json({ error: "Failed to open doubt thread" }, { status: 500 });
  }

  return NextResponse.json({ thread: created, messages: [] });
}
