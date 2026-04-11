import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { endCallSession } from "@/lib/voiceLimits";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { callId, durationSecs, messages } = await req.json();

    // Record session end
    if (callId) {
      await endCallSession(callId, durationSecs || 0, messages?.length || 0);
    }

    // Generate session summary only if there were real exchanges (>2 messages)
    let summary = null;
    if (messages && messages.length > 2) {
      try {
        const summaryRes = await openai.chat.completions.create({
          model:      "gpt-4o-mini",
          max_tokens: 220,
          messages: [
            {
              role:    "system",
              content: "You are a study assistant. Generate a brief, clear session summary. List the key concepts and topics covered as a numbered list. Maximum 5 points. Be concise — this will be shown to the student after the call.",
            },
            ...messages,
            { role: "user", content: "Summarize what we covered in this session." },
          ],
        });
        summary = summaryRes.choices[0].message.content.trim();
      } catch {
        // Summary is optional — never fail the end-call request
      }
    }

    return NextResponse.json({ success: true, summary });
  } catch (err) {
    console.error("voice/end error:", err);
    return NextResponse.json({ error: "Failed to end call" }, { status: 500 });
  }
}
