import { NextResponse } from "next/server";
import { FLAGS, flagDisabledResponse } from "@/lib/featureFlags";
import { endCallSession } from "@/lib/voiceLimits";
import { recordAISpend, estimateCost } from "@/lib/aiSpend";
import { supabase, openai, getUser, getOwnedSession } from "@/lib/sageline/server";

/**
 * POST /api/sageline/end — body { session_id, failed?, reason? }.
 * Closes the session, generates a summary + misconceptions from the STORED
 * transcript (server data, not client-supplied), and pushes review items into
 * the FSRS queue (spaced_repetition_cards).
 */
export async function POST(req) {
  if (!FLAGS.SAGELINE_V2) return flagDisabledResponse();

  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { session_id, failed = false, reason = null } = await req.json().catch(() => ({}));
  const session = await getOwnedSession(session_id, user.id);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const duration = Math.max(0, Math.round((Date.now() - new Date(session.started_at).getTime()) / 1000));

  const { data: turns } = await supabase
    .from("sageline_transcript_turns")
    .select("role, content")
    .eq("session_id", session.id)
    .order("turn_index", { ascending: true });

  await supabase.from("sageline_sessions").update({
    state: failed ? "failed" : "ended",
    ended_at: new Date().toISOString(),
    duration_seconds: duration,
  }).eq("id", session.id);

  // Mirror the count into voice_calls-style tracking? No — sageline_sessions IS
  // the record. (voice_calls stays the old flow's ledger.)

  if (failed || !turns || turns.length < 3) {
    return NextResponse.json({ success: true, summary: null, misconceptions: [], cardsAdded: 0, reason });
  }

  // Single structured call over the stored transcript.
  let summary = null, misconceptions = [], reviewTopics = [];
  try {
    const transcriptText = turns.map(t => `${t.role === "student" ? "Student" : "SageLine"}: ${t.content}`).join("\n");
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 400,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `Summarize this tutoring call for the student. Reply with ONLY JSON: {"summary": "<2-3 sentence recap>", "misconceptions": ["<short phrase>", ...], "review_topics": ["<concise topic to revise>", ...]}. Max 5 misconceptions, max 5 review_topics. If none, use empty arrays.` },
        { role: "user", content: transcriptText },
      ],
    });
    const parsed = JSON.parse(res.choices[0].message.content);
    summary = typeof parsed.summary === "string" ? parsed.summary : null;
    misconceptions = Array.isArray(parsed.misconceptions) ? parsed.misconceptions.slice(0, 5).map(String) : [];
    reviewTopics = Array.isArray(parsed.review_topics) ? parsed.review_topics.slice(0, 5).map(String) : [];
    recordAISpend(user.id, {
      costUsd: estimateCost({ model: "gpt-4o-mini", tokensIn: Math.ceil(transcriptText.length / 4), tokensOut: 120 }),
      tokensIn: Math.ceil(transcriptText.length / 4), tokensOut: 120,
    }).catch(() => {});
  } catch (err) {
    console.error("[sageline/end] summary", err.message);
  }

  // Push review topics into the FSRS queue (immediately due — fsrs defaults).
  const cardIds = [];
  let docName = null;
  if (session.document_id) {
    const { data: doc } = await supabase.from("documents").select("name").eq("id", session.document_id).maybeSingle();
    docName = doc?.name ?? null;
  }
  for (const topic of reviewTopics) {
    const t = topic.trim().slice(0, 200);
    if (!t) continue;
    const { data: card } = await supabase
      .from("spaced_repetition_cards")
      .upsert(
        { user_id: user.id, topic: t, subject: docName, card_type: "sageline" },
        { onConflict: "user_id,topic", ignoreDuplicates: false }
      )
      .select("id")
      .maybeSingle();
    if (card?.id) cardIds.push(card.id);
  }

  await supabase.from("sageline_session_summaries").upsert({
    session_id: session.id,
    summary: summary ?? "Session complete.",
    misconceptions_caught: misconceptions,
    generated_srs_card_ids: cardIds,
  }, { onConflict: "session_id" });

  return NextResponse.json({
    success: true,
    summary,
    misconceptions,
    cardsAdded: cardIds.length,
  });
}
