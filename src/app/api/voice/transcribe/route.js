import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai   = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Map language codes to Whisper-supported BCP-47 codes
const LANG_MAP = { en: "en", hi: "hi", fr: "fr" };

// Map MIME type → file extension for Whisper
function getExtension(mimeType = "") {
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "mp4";
  if (mimeType.includes("ogg"))  return "ogg";
  if (mimeType.includes("wav"))  return "wav";
  return "webm"; // default — Chrome/Firefox
}

export async function POST(req) {
  try {
    // Auth guard — prevents Whisper API abuse
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const audio    = formData.get("audio");
    const language = LANG_MAP[formData.get("language")] || "en";
    const mimeType = formData.get("mimeType") || "audio/webm";

    if (!audio) {
      return NextResponse.json({ error: "No audio provided" }, { status: 400 });
    }

    // Whisper needs a filename with the correct extension
    const ext  = getExtension(mimeType);
    const file = new File([audio], `audio.${ext}`, { type: mimeType });

    const transcript = await openai.audio.transcriptions.create({
      file,
      model:    "whisper-1",
      language,
    });

    const text = transcript.text?.trim() || "";
    return NextResponse.json({ text });
  } catch (err) {
    console.error("transcribe error:", err);
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
  }
}
