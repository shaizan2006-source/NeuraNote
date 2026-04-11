import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai   = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// "nova" — warm, natural, excellent for tutoring / teaching
// tts-1 is optimised for low latency (real-time voice)
const VOICE = "nova";

export async function POST(req) {
  try {
    // Auth guard — prevents free TTS abuse
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return new Response("Unauthorized", { status: 401 });

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return new Response("Unauthorized", { status: 401 });

    const { text, speed = 1.0 } = await req.json();

    if (!text || !text.trim()) {
      return new Response("No text provided", { status: 400 });
    }

    const mp3 = await openai.audio.speech.create({
      model: "tts-1",   // tts-1 = lowest latency; swap to tts-1-hd for premium quality
      voice: VOICE,
      input: text.slice(0, 4096), // OpenAI TTS max input length
      speed: Math.min(Math.max(speed, 0.25), 4.0),
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());

    return new Response(buffer, {
      headers: {
        "Content-Type":   "audio/mpeg",
        "Content-Length": buffer.length.toString(),
        "Cache-Control":  "no-cache",
      },
    });
  } catch (err) {
    console.error("voice/speak error:", err);
    return new Response("TTS failed", { status: 500 });
  }
}
