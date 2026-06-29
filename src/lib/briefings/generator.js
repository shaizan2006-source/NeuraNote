import { supabaseAdmin } from "@/lib/serverAuth";
import { buildBriefingPrompt } from "./prompt";
import { todayIST, daysAgoIST } from "@/lib/format/date";
import { chatCompletion, textToSpeech } from "@/lib/llm/openai";

function estimateDuration(text) {
  // ~150 words per minute for TTS
  return Math.round((text.split(/\s+/).length / 150) * 60);
}

async function buildBriefingContext(userId) {
  const [profileRes, streakRes, weakRes, planRes] = await Promise.all([
    supabaseAdmin.from("profiles").select("full_name, exam_type, exam_date, cohort_id, preferred_language").eq("id", userId).maybeSingle(),
    supabaseAdmin.from("study_streaks").select("streak_count, cumulative_study_days").eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("weak_topics").select("topic").eq("user_id", userId).order("count", { ascending: false }).limit(3),
    // E5 fix: filter to plan='pro' so free-plan rows don't return a trial_ends_at
    supabaseAdmin.from("user_plans").select("trial_ends_at").eq("user_id", userId).eq("plan", "pro").eq("is_trial", true).maybeSingle(),
  ]);

  const profile = profileRes.data;
  const streak = streakRes.data;
  const weak = weakRes.data ?? [];

  const trialEndsAt = planRes.data?.trial_ends_at ?? null;
  const hoursToTrialEnd = trialEndsAt ? (new Date(trialEndsAt) - new Date()) / 3_600_000 : null;
  // Day 6 window: trial ends in 0–36 hours (covers timezone slop)
  const isTrialDay6 = hoursToTrialEnd !== null && hoursToTrialEnd > 0 && hoursToTrialEnd <= 36;

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
    isTrialDay6,
    preferredLanguage: profile?.preferred_language ?? "en",
  };
}

export async function generateBriefingForUser(userId) {
  // IST date — what the user considers "today's briefing"
  const todayStr = todayIST();

  // Skip if already generated today (idempotency check for cron double-fire).
  // TOCTOU note: two parallel invocations can both pass this check. The upsert
  // below is the actual race guard — only the first writer wins; the second is
  // a no-op (ignoreDuplicates). Worst case: two LLM calls, one storage upload
  // wins, no data corruption.
  const { data: existing } = await supabaseAdmin
    .from("daily_briefings")
    .select("id")
    .eq("user_id", userId)
    .eq("briefing_date", todayStr)
    .maybeSingle();

  if (existing) return { skipped: true, reason: "already_generated" };

  const ctx = await buildBriefingContext(userId);
  const prompt = buildBriefingPrompt(ctx);

  // 1. Generate transcript (retry + circuit breaker via chatCompletion wrapper)
  const completion = await chatCompletion({
    model:       "gpt-4o-mini",
    messages:    [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens:  350,
  });
  const transcript = completion.choices[0].message.content.trim();
  if (!transcript) throw new Error(`generateBriefingForUser: empty transcript for ${userId}`);

  const d6Prefix = ctx.isTrialDay6
    ? (ctx.preferredLanguage === "hi"
        ? "Tumhara trial kal khatam ho raha hai. Pro lo to queue continue rahegi. "
        : "Your trial ends tomorrow. Your queue continues with Pro. ")
    : "";
  const finalTranscript = d6Prefix + transcript;

  // 2. Generate TTS audio (retry + circuit breaker via textToSpeech wrapper)
  const audioResponse = await textToSpeech({
    model: "tts-1",
    voice: "nova",
    input: finalTranscript,
  });
  const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());

  // 3. Upload to storage (upsert — safe if invoked twice)
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
  const costUsd = (finalTranscript.length / 1000) * 0.015 + (completion.usage?.total_tokens ?? 0) / 1_000_000 * 0.6;

  // 5. Upsert row — safe against race: if two invocations both reach here,
  // the first insert wins; the second hits the (user_id, briefing_date)
  // unique constraint and is silently discarded (ignoreDuplicates: true).
  const { error: insertError } = await supabaseAdmin
    .from("daily_briefings")
    .insert({
      user_id: userId,
      briefing_date: todayStr,
      audio_url: audioUrl,
      transcript: finalTranscript,
      duration_seconds: estimateDuration(finalTranscript),
      generation_cost_usd: costUsd,
    }, { ignoreDuplicates: true });

  if (insertError) {
    // If ignoreDuplicates didn't suppress it, re-throw so the cron logs it
    throw new Error(`briefing insert failed for ${userId}: ${insertError.message}`);
  }

  return { ok: true, duration: estimateDuration(finalTranscript), costUsd };
}

export async function getActiveBriefingUsers() {
  // Active = streak >= 3 OR session in last 3 IST days
  const threeDaysAgo = daysAgoIST(3);

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
