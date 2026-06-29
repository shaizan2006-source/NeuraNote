import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";

// JEE Main: 90 questions, 3h, Physics+Chemistry+Maths (30 each), +4/-1
// JEE Advanced: 54 questions, 3h, P+C+M (18 each), variable marking
// NEET: 180 questions, 3h 20min, P+C+Bio (45+45+90), +4/-1

const EXAM_CONFIGS = {
  jee_main: {
    duration_seconds: 10800,
    total_marks: 300,
    subjects: [
      { name: "Physics", count: 30 },
      { name: "Chemistry", count: 30 },
      { name: "Mathematics", count: 30 },
    ],
  },
  jee_advanced: {
    duration_seconds: 10800,
    total_marks: 180,
    subjects: [
      { name: "Physics", count: 18 },
      { name: "Chemistry", count: 18 },
      { name: "Mathematics", count: 18 },
    ],
  },
  neet_ug: {
    duration_seconds: 12000,
    total_marks: 720,
    subjects: [
      { name: "Physics", count: 45 },
      { name: "Chemistry", count: 45 },
      { name: "Biology", count: 90 },
    ],
  },
};

export async function POST(req) {
  const user = await verifyAuth(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { exam_type } = await req.json();
  // F-033: reject non-string exam_type (an array like ["jee_main"] would coerce to the key).
  if (typeof exam_type !== "string") return Response.json({ error: "Invalid exam_type" }, { status: 400 });
  const config = EXAM_CONFIGS[exam_type];
  if (!config) return Response.json({ error: "Invalid exam_type" }, { status: 400 });

  // Fetch questions per subject
  const questionSlots = [];
  for (const subj of config.subjects) {
    const { data } = await supabaseAdmin
      .from("pyqs")
      .select("id,slug,subject,chapter,question_text,options,correct_answer,difficulty,mark_weight")
      .eq("exam_type", exam_type)
      .eq("subject", subj.name)
      .limit(subj.count * 3);

    // Shuffle (Fisher-Yates — uniform) and take this subject's quota (or all available).
    const pool = [...(data ?? [])];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    for (const q of pool.slice(0, subj.count)) questionSlots.push(q);
  }

  if (questionSlots.length === 0) {
    return Response.json({ error: "Not enough questions in database for this exam" }, { status: 422 });
  }

  // total_marks = sum of the actual paper's mark_weights, so the score % stays fair even when
  // the bank can't yet fill every subject quota, and so it matches the +mark_weight scoring in
  // /submit (the static config total was inconsistent with the per-question marks).
  const totalMarks = questionSlots.reduce((sum, q) => sum + (q.mark_weight ?? 4), 0);

  // Strip correct answers before sending to client
  const questions = questionSlots.map(({ correct_answer: _, ...rest }) => rest);

  const { data: test, error } = await supabaseAdmin
    .from("mock_tests")
    .insert({
      user_id: user.id,
      exam_type,
      total_questions: questions.length,
      total_marks: totalMarks,
      duration_seconds: config.duration_seconds,
      questions: questionSlots,  // stored with answers server-side
      status: "active",
    })
    .select("id,duration_seconds,total_marks")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({
    test_id: test.id,
    duration_seconds: test.duration_seconds,
    total_marks: test.total_marks,
    questions,
  });
}