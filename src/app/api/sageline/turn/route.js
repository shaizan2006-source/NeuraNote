import { NextResponse } from "next/server";
import { FLAGS, flagDisabledResponse } from "@/lib/featureFlags";
import { recordAISpend, estimateCost } from "@/lib/aiSpend";
import { VOICE_LIMITS } from "@/lib/voiceLimits";
import { getUserPlan } from "@/lib/planLimits";
import { sseEvent, SSE_HEADERS } from "@/lib/sseStream";
import {
  canTransition, nextStateForTurn, splitSentences, detectEndIntent, buildSagelineSystemPrompt,
} from "@/lib/sageline/stateMachine";
import { supabase, openai, getUser, getOwnedSession, getSessionRagContext } from "@/lib/sageline/server";

const MAX_TURNS = 14;

function detectConfusion(text) {
  const t = (text || "").toLowerCase();
  return ["i don't", "dont know", "not sure", "confused", "samajh nahi", "pata nahi", "explain", "matlab"]
    .some(s => t.includes(s));
}

export async function POST(req) {
  if (!FLAGS.SAGELINE_V2) return flagDisabledResponse();

  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const audio = form.get("audio");
  const sessionId = form.get("session_id");
  const clientLatency = parseInt(form.get("client_latency_ms") ?? "", 10);

  const session = await getOwnedSession(sessionId, user.id);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.state === "ended" || session.state === "failed") {
    return NextResponse.json({ error: "session_ended" }, { status: 410 });
  }

  // Server-side max-duration enforcement (can't be bypassed by the client).
  const plan = await getUserPlan(user.id, user);
  const limits = VOICE_LIMITS[plan] || VOICE_LIMITS.free;
  const elapsed = (Date.now() - new Date(session.started_at).getTime()) / 1000;
  if (limits.maxDurationSecs && elapsed >= limits.maxDurationSecs) {
    return NextResponse.json({ error: "max_duration_reached" }, { status: 410 });
  }
  if (!audio) return NextResponse.json({ error: "No audio" }, { status: 400 });

  // ── 1. STT — auto-detect language (no pin → Hinglish code-switch friendly) ──
  let studentText = "";
  let detectedLang = "en";
  try {
    const file = new File([audio], "turn.webm", { type: audio.type || "audio/webm" });
    const tr = await openai.audio.transcriptions.create({ file, model: "whisper-1", response_format: "verbose_json" });
    studentText = (tr.text || "").trim();
    detectedLang = tr.language || "en";
    const secs = Math.max(1, (audio.size ?? 0) / 2000);
    recordAISpend(user.id, { costUsd: estimateCost({ model: "whisper-1", durationSecs: secs }), whisperSecs: secs }).catch(() => {});
  } catch (err) {
    console.error("[sageline/turn] stt", err.message);
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
  }
  if (studentText.length < 2) return NextResponse.json({ error: "empty_transcript" }, { status: 422 });

  // Track languages actually used, for QA/analytics.
  if (!(session.language_detected ?? []).includes(detectedLang)) {
    supabase.from("sageline_sessions")
      .update({ language_detected: [...(session.language_detected ?? []), detectedLang] })
      .eq("id", session.id).then(() => {}, () => {});
  }

  // ── 2. Persist student turn (with prior-turn audio latency) ──
  const { data: priorTurns } = await supabase
    .from("sageline_transcript_turns")
    .select("role, content, turn_index")
    .eq("session_id", session.id)
    .order("turn_index", { ascending: true });
  const history = priorTurns ?? [];
  const nextIndex = history.length;

  await supabase.from("sageline_transcript_turns").insert({
    session_id: session.id, role: "student", content: studentText,
    turn_index: nextIndex, audio_latency_ms: Number.isFinite(clientLatency) ? clientLatency : null,
  });

  // ── 3. State machine + RAG ──
  const endIntent = detectEndIntent(studentText);
  const confused = detectConfusion(studentText);
  const target = nextStateForTurn({ state: session.state, endIntent, confused, turnIndex: nextIndex, maxTurns: MAX_TURNS });
  const newState = canTransition(session.state, target) ? target : session.state;
  if (newState !== session.state) {
    supabase.from("sageline_sessions").update({ state: newState }).eq("id", session.id).then(() => {}, () => {});
  }

  const ragContext = await getSessionRagContext(studentText, session.document_id);
  let docName = null;
  if (session.document_id) {
    const { data: doc } = await supabase.from("documents").select("name").eq("id", session.document_id).maybeSingle();
    docName = doc?.name ?? null;
  }
  const systemPrompt = buildSagelineSystemPrompt({
    studentName: user.user_metadata?.full_name?.split(" ")[0] || null,
    docName, ragContext, languageHint: detectedLang,
  });
  const chatMessages = history.map(t => ({ role: t.role === "student" ? "user" : "assistant", content: t.content }));
  chatMessages.push({ role: "user", content: studentText });

  // ── 4. Stream: transcript → state → tokens → sentence events → done ──
  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(sseEvent({ type: "transcript", text: studentText, language: detectedLang }));
        controller.enqueue(sseEvent({ type: "state", state: newState }));

        let full = "";
        let buffer = "";
        let sentIndex = 0;
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini", temperature: 0.6, max_tokens: 300, stream: true,
          messages: [{ role: "system", content: systemPrompt }, ...chatMessages],
        });
        for await (const chunk of completion) {
          const delta = chunk.choices[0]?.delta?.content || "";
          if (!delta) continue;
          full += delta;
          buffer += delta;
          controller.enqueue(sseEvent({ type: "token", text: delta }));
          const { sentences, remainder } = splitSentences(buffer);
          for (const s of sentences) {
            const clean = s.replace(/\[(WRAP_UP|END_CALL)\]/g, "").trim();
            if (clean) controller.enqueue(sseEvent({ type: "sentence", text: clean, index: sentIndex++ }));
          }
          buffer = remainder;
        }
        // Flush trailing remainder as a final sentence.
        const tail = buffer.replace(/\[(WRAP_UP|END_CALL)\]/g, "").trim();
        if (tail) controller.enqueue(sseEvent({ type: "sentence", text: tail, index: sentIndex++ }));

        const wrapUp = full.includes("[WRAP_UP]") || full.includes("[END_CALL]") || newState === "wrapping_up";
        const cleanFull = full.replace(/\[(WRAP_UP|END_CALL)\]/g, "").trim();

        await supabase.from("sageline_transcript_turns").insert({
          session_id: session.id, role: "sageline", content: cleanFull, turn_index: nextIndex + 1,
        });

        const inLen = (systemPrompt.length + chatMessages.reduce((n, m) => n + m.content.length, 0)) / 4;
        recordAISpend(user.id, {
          costUsd: estimateCost({ model: "gpt-4o-mini", tokensIn: Math.ceil(inLen), tokensOut: Math.ceil(cleanFull.length / 4) }),
          tokensIn: Math.ceil(inLen), tokensOut: Math.ceil(cleanFull.length / 4),
        }).catch(() => {});

        controller.enqueue(sseEvent({ type: "turn_done", endCall: wrapUp, state: wrapUp ? "wrapping_up" : newState }));
        controller.close();
      } catch (err) {
        console.error("[sageline/turn] stream", err);
        controller.error(err);
      }
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
