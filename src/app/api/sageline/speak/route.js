import { FLAGS, flagDisabledResponse } from "@/lib/featureFlags";
import { recordAISpend, estimateCost } from "@/lib/aiSpend";
import { getUser, getOwnedSession } from "@/lib/sageline/server";
import { openai } from "@/lib/sageline/server";

const VOICE = "nova"; // warm, natural — good for tutoring

/** POST /api/sageline/speak — synthesize one sentence to MP3 (per-sentence pipelining). */
export async function POST(req) {
  if (!FLAGS.SAGELINE_V2) return flagDisabledResponse();

  const user = await getUser(req);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { text, session_id, speed = 1.0 } = await req.json().catch(() => ({}));
  if (!text || !text.trim()) return new Response("No text", { status: 400 });

  // Ownership check keeps TTS spend attributable and gated.
  const session = await getOwnedSession(session_id, user.id);
  if (!session) return new Response("Session not found", { status: 404 });

  try {
    const input = text.slice(0, 500); // one sentence per call
    const mp3 = await openai.audio.speech.create({
      model: "tts-1", voice: VOICE, input,
      speed: Math.min(Math.max(speed, 0.25), 4.0),
    });
    const buffer = Buffer.from(await mp3.arrayBuffer());
    recordAISpend(user.id, { costUsd: estimateCost({ model: "tts-1", chars: input.length }), ttsChars: input.length }).catch(() => {});
    return new Response(buffer, {
      headers: { "Content-Type": "audio/mpeg", "Content-Length": buffer.length.toString(), "Cache-Control": "no-cache" },
    });
  } catch (err) {
    console.error("[sageline/speak]", err.message);
    return new Response("TTS failed", { status: 500 });
  }
}
