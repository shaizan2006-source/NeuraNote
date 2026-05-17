import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/serverAuth";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function weekStarting() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay()); // Sunday
  return d.toISOString().slice(0, 10);
}

async function buildRecapContext(userId) {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);

  const [profileRes, streakRes, focusRes, masteryRes] = await Promise.all([
    supabaseAdmin.from("profiles").select("full_name, exam_type, exam_date, cohort_id").eq("id", userId).maybeSingle(),
    supabaseAdmin.from("study_streaks").select("streak_count, cumulative_study_days").eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("focus_progress").select("duration_minutes, session_date").eq("user_id", userId).gte("session_date", weekAgo),
    supabaseAdmin.from("mastery_topics").select("topic, mastery_score").eq("user_id", userId).gte("updated_at", `${weekAgo}T00:00:00Z`).limit(10),
  ]);

  const profile = profileRes.data;
  const streak = streakRes.data;
  const sessions = focusRes.data ?? [];
  const mastery = masteryRes.data ?? [];

  const totalMins = sessions.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0);
  const sessionDays = new Set(sessions.map(s => s.session_date)).size;
  const masteredTopics = mastery.filter(m => m.mastery_score >= 0.8).map(m => m.topic);

  const daysLeft = profile?.exam_date
    ? Math.max(0, Math.ceil((new Date(profile.exam_date) - new Date()) / 86_400_000))
    : null;

  return { profile, streak, totalMins, sessionDays, masteredTopics, daysLeft };
}

export async function generateWeeklyRecapForUser(userId) {
  const weekStr = weekStarting();

  const { data: existing } = await supabaseAdmin
    .from("weekly_recaps").select("id").eq("user_id", userId).eq("week_starting", weekStr).maybeSingle();
  if (existing) return { skipped: true };

  const ctx = await buildRecapContext(userId);
  const { profile, streak, totalMins, sessionDays, masteredTopics, daysLeft } = ctx;

  const prompt = `Write a warm, personal weekly study recap (120-150 words) for a JEE/NEET student.

Context:
- Name: ${profile?.full_name?.split(" ")[0] ?? "there"}
- Exam: ${profile?.exam_type?.replace(/_/g, " ").toUpperCase() ?? "upcoming exam"}
- Days to exam: ${daysLeft ?? "unknown"}
- Study time this week: ${Math.round(totalMins / 60 * 10) / 10} hours over ${sessionDays} days
- Current streak: ${streak?.streak_count ?? 0} days
- Topics mastered this week: ${masteredTopics.slice(0, 3).join(", ") || "none recorded"}

Rules:
- Warm and honest, not hypey.
- Acknowledge effort without inflating it.
- End with one specific thing to focus on next week.
- No generic phrases. Output only the recap text.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 250,
  });
  const transcript = completion.choices[0].message.content.trim();

  // TTS audio
  const audioResp = await openai.audio.speech.create({ model: "tts-1", voice: "nova", input: transcript });
  const audioBuffer = Buffer.from(await audioResp.arrayBuffer());
  const audioPath = `${userId}/${weekStr}.mp3`;
  await supabaseAdmin.storage.from("recaps").upload(audioPath, audioBuffer, { contentType: "audio/mpeg", upsert: true });
  const { data: signedData } = await supabaseAdmin.storage.from("recaps").createSignedUrl(audioPath, 86400 * 7);

  const keyStats = { total_mins: totalMins, session_days: sessionDays, mastered_topics: masteredTopics, streak: streak?.streak_count ?? 0 };

  await supabaseAdmin.from("weekly_recaps").insert({
    user_id: userId,
    week_starting: weekStr,
    audio_url: signedData?.signedUrl ?? null,
    transcript,
    key_stats: keyStats,
  });

  return { ok: true };
}
