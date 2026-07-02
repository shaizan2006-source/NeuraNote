import { NextResponse } from "next/server";
import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";
import { FLAGS, flagDisabledResponse } from "@/lib/featureFlags";
import { buildDoubtSystemPrompt } from "@/lib/doubt";
import { streamCompletion } from "@/lib/llmFallback";
import { sseMeta, sseToken, sseEvent, SSE_HEADERS } from "@/lib/sseStream";
import { canAskQuestion, recordQAUsage, getUserPlan } from "@/lib/planLimits";
import { checkMonthlyBudget, recordAISpend, budgetExhaustedResponse, estimateCost } from "@/lib/aiSpend";
import { isInternalDev } from "@/lib/internalAccess";

/**
 * POST /api/doubt/message — body: { thread_id, content }.
 * Streams the assistant reply. The LLM context is built from EXACTLY:
 * the thread's parent Q&A + this thread's own messages. Nothing from main
 * chat, other threads, or other subjects can enter — isolation by row fetch.
 */
export async function POST(req) {
  if (!FLAGS.DOUBT_SIDEBAR) return flagDisabledResponse();

  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { thread_id, content } = body ?? {};
  if (typeof thread_id !== "string" || typeof content !== "string" ||
      content.trim() === "" || content.length > 4000) {
    return NextResponse.json({ error: "thread_id and content required" }, { status: 400 });
  }

  const { data: thread } = await supabaseAdmin
    .from("doubt_threads")
    .select("id, user_id, original_question, original_answer")
    .eq("id", thread_id)
    .maybeSingle();
  if (!thread || thread.user_id !== user.id) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  // Same cost controls as a main-chat question.
  const qaCheck = await canAskQuestion(user.id, user);
  if (!qaCheck.allowed) {
    return NextResponse.json(
      { error: qaCheck.reason, upgradeUrl: qaCheck.upgradeUrl, limitReached: true },
      { status: 403 }
    );
  }
  recordQAUsage(user.id).catch(() => {});

  if (!isInternalDev(user)) {
    const plan = await getUserPlan(user.id, user);
    const budgetCheck = await checkMonthlyBudget(user.id, plan);
    if (!budgetCheck.allowed) {
      return NextResponse.json(
        { ...budgetExhaustedResponse(budgetCheck), limitReached: true },
        { status: 429 }
      );
    }
  }

  // This thread's history — the ONLY conversational context.
  const { data: historyRows } = await supabaseAdmin
    .from("doubt_thread_messages")
    .select("role, content")
    .eq("thread_id", thread.id)
    .order("created_at", { ascending: true });
  const history = (historyRows ?? []).slice(-12);

  await supabaseAdmin.from("doubt_thread_messages").insert({
    thread_id: thread.id,
    role:      "user",
    content:   content.trim(),
  });

  const systemPrompt = buildDoubtSystemPrompt(thread.original_question, thread.original_answer);
  // Adversarial audit line: confirms exactly which rows entered the payload.
  console.log("[doubt] llm context", { thread: thread.id, priorMsgs: history.length });

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(sseMeta({
          sources:        [],
          usedContext:    false,
          classification: { domain: "doubt", marks: 0, questionType: "theory", language: "en" },
        }));

        let fullAnswer = "";
        for await (const text of streamCompletion({
          systemPrompt,
          messages:    [...history, { role: "user", content: content.trim() }],
          model:       "gpt-4o-mini",
          maxTokens:   700,
          temperature: 0.5,
        })) {
          fullAnswer += text;
          controller.enqueue(sseToken(text));
        }

        if (fullAnswer) {
          const { data: saved } = await supabaseAdmin
            .from("doubt_thread_messages")
            .insert({ thread_id: thread.id, role: "assistant", content: fullAnswer })
            .select("id")
            .single();
          // Hand the client the stored message id (needed for edit targeting).
          if (saved?.id) {
            controller.enqueue(sseEvent({ type: "doubt_msg", message_id: saved.id }));
          }

          const tokensIn  = Math.ceil((systemPrompt.length + content.length) / 4);
          const tokensOut = Math.ceil(fullAnswer.length / 4);
          recordAISpend(user.id, {
            costUsd: estimateCost({ model: "gpt-4o-mini", tokensIn, tokensOut }),
            tokensIn, tokensOut,
          }).catch(() => {});
        }

        controller.close();
      } catch (err) {
        console.error("[doubt/message] stream error:", err);
        controller.error(err);
      }
    },
  });

  return new Response(readableStream, { headers: SSE_HEADERS });
}
