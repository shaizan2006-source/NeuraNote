import { supabaseAdmin } from "@/lib/serverAuth";

// Returns the current exam transition phase for a user
// Phases: "normal" | "t30" | "t7" | "t1" | "t0" | "post_exam"
export async function getExamPhase(userId) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("exam_date, exam_type")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.exam_date) return { phase: "normal", days_left: null, exam_type: null };

  const examDate = new Date(profile.exam_date);
  const now = new Date();
  const daysLeft = Math.ceil((examDate - now) / 86400000);

  let phase;
  if (daysLeft < -7) phase = "post_exam";
  else if (daysLeft <= 0) phase = "t0";
  else if (daysLeft <= 1) phase = "t1";
  else if (daysLeft <= 7) phase = "t7";
  else if (daysLeft <= 30) phase = "t30";
  else phase = "normal";

  return { phase, days_left: daysLeft, exam_type: profile.exam_type, exam_date: profile.exam_date };
}

// Content adjustments for each phase
export const PHASE_CONFIG = {
  normal: {
    label: "Normal",
    study_ratio: { concepts: 0.5, practice: 0.3, revision: 0.2 },
    daily_target_hours: 6,
    show_mock_cta: false,
    notification_tone: "encouraging",
  },
  t30: {
    label: "T-30",
    study_ratio: { concepts: 0.3, practice: 0.4, revision: 0.3 },
    daily_target_hours: 7,
    show_mock_cta: true,
    notification_tone: "focused",
    banner: "30 days to go. Time to shift into high gear — more practice, less new concepts.",
  },
  t7: {
    label: "T-7",
    study_ratio: { concepts: 0.1, practice: 0.4, revision: 0.5 },
    daily_target_hours: 8,
    show_mock_cta: true,
    notification_tone: "calm",
    banner: "1 week left. Full revision mode. No new topics.",
  },
  t1: {
    label: "T-1",
    study_ratio: { concepts: 0, practice: 0.2, revision: 0.8 },
    daily_target_hours: 4,
    show_mock_cta: false,
    notification_tone: "calm",
    banner: "Exam is tomorrow. Light revision only. Sleep by 10pm.",
  },
  t0: {
    label: "Exam Day",
    study_ratio: { concepts: 0, practice: 0, revision: 1 },
    daily_target_hours: 2,
    show_mock_cta: false,
    notification_tone: "calm",
    banner: "Today is the day. You have prepared well. Trust yourself.",
  },
  post_exam: {
    label: "Post Exam",
    study_ratio: { concepts: 0.5, practice: 0.3, revision: 0.2 },
    daily_target_hours: 3,
    show_mock_cta: false,
    notification_tone: "celebratory",
    banner: "Exam over! Take a day off, then let's plan your next target.",
  },
};