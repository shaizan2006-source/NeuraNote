import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/serverAuth";
import { buildBriefingPrompt } from "./prompt";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function today() {
  return new Date().toISOString().slice(0, 10);
}

function estimateDuration(text) {
  // ~150 words per minute for TTS
  return Math.round((text.split(/\s+/).length / 150) * 60);
}

async function buildBriefingContext(userId) {
  const [profileRes, streakRes, weakRes] = await Promise.all([
    supabaseAdmin.from("profiles").select("full_name, exam_type, exam_date, cohort_id").eq("id", userId).maybeSingle(),
    supabaseAdmin.from("study_streaks").select("streak_count, cumulative_study_days").eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("weak_topics").select("topic").eq("user_id", userId).order("count", { ascending: false }).limit(3),
  ]);

  const profile = profileRes.data;
  const streak = streakRes.data;
  const weak = weakRes.data ?? [];

  const daysLeft = profile?.exam_date
    ? Math.max(0, Math.ceil((new Date(profile.exam_date) - new Date()) / 86_400_000))
    : null;

  const examLabel = profile?.exam_type?.replace(/_/g, " ").toUpperCase() ?? "your exam";

  return {
    userName: profile?.full_name?.split(" ")[0] ?? "there",
    examName: examLabel,
    daysLeft,
    streak: streak?.streak_count ?? 0,
    weakTopics: weak.map(w => w.topic),
    studyMinutesYesterday: 0,
  };
}

export async function generateBriefingForUser(userId) {
  const todayStr = today();

  // Skip if already generated today
  const { data: existing } = await supabaseAdmin
    .from("daily_briefings")
    .select("id")
    .eq("user_id", userId)
    .eq("briefing_date", todayStr)
    .maybeSingle();

  if (existing) return { skipped: true, reason: "already_generated" };

  const ctx = await buildBriefingContext(userId);
  const prompt = buildBriefingPrompt(ctx);

  // 1. Generate transcript
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 350,
  });
  const transcript = completion.choices[0].message.content.trim();

  // 2. Generate TTS audio
  const audioResponse = await openai.audio.speech.create({
    model: "tts-1",
    voice: "nova",
    input: transcript,
  });
  const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());

  // 3. Upload to storage
  const audioPath = `${userId}/${todayStr}.mp3`;
  await supabaseAdmin.storage.from("briefings").upload(audioPath, audioBuffer, {
    contentType: "audio/mpeg",
    upsert: true,
  });

  const { data: signedData } = await supabaseAdmin.storage
    .from("briefings")
    .createSignedUrl(audioPath, 86400 * 2); // 48h URL

  const audioUrl = signedData?.signedUrl ?? null;

  // 4. Estimate cost (TTS-1: $0.015/1K chars)
  const costUsd = (transcript.length / 1000) * 0.015 + (completion.usage?.total_tokens ?? 0) / 1_000_000 * 0.6;

  // 5. Insert row
  await supabaseAdmin.from("daily_briefings").insert({
    user_id: userId,
    briefing_date: todayStr,
    audio_url: audioUrl,
    transcript,
    duration_seconds: estimateDuration(transcript),
    generation_cost_usd: costUsd,
  });

  return { ok: true, duration: estimateDuration(transcript), costUsd };
}

export async function getActiveBriefingUsers() {
  // Active = streak >= 3 OR session in last 3 days
  const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);

  const { data: activeUsers } = await supabaseAdmin.rpc("get_active_briefing_users", {
    min_streak: 3,
    min_session_date: threeDaysAgo,
  }).catch(() => ({ data: null }));

  if (activeUsers) return activeUsers.map(u => u.user_id);

  // Fallback: users with streak >= 1
  const { data: streakUsers } = await supabaseAdmin
    .from("study_streaks")
    .select("user_id")
    .gte("streak_count", 1)
    .limit(500);

  return (streakUsers ?? []).map(u => u.user_id);
}
