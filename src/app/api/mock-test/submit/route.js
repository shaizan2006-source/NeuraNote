import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";

export async function POST(req) {
  const user = await verifyAuth(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid JSON" }, { status: 400 });

  const { test_id, answers } = body;
  if (!test_id || typeof test_id !== "string") {
    return Response.json({ error: "test_id required" }, { status: 400 });
  }
  const safeAnswers = Array.isArray(answers) ? answers.slice(0, 200) : [];

  const { data: test, error: testErr } = await supabaseAdmin
    .from("mock_tests")
    .select("*")
    .eq("id", test_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (testErr || !test) return Response.json({ error: "Test not found" }, { status: 404 });
  if (test.status === "completed") return Response.json({ error: "Already submitted" }, { status: 400 });

  const storedQuestions = test.questions ?? [];
  const answerMap = new Map(safeAnswers.map(a => [a?.question_id, a?.answer]).filter(([k]) => k));

  let correctCount = 0;
  let incorrectCount = 0;
  let marksObtained = 0;
  const topicBreakdown = {};
  const examType = test.exam_type;

  for (const q of storedQuestions) {
    const userAnswer = answerMap.get(q.id);
    const isCorrect = userAnswer && userAnswer === q.correct_answer;
    const subject = q.subject ?? "Unknown";
    if (!topicBreakdown[subject]) topicBreakdown[subject] = { correct: 0, total: 0, marks: 0 };
    topicBreakdown[subject].total++;

    if (isCorrect) {
      correctCount++;
      const gain = q.mark_weight ?? 4;
      marksObtained += gain;
      topicBreakdown[subject].correct++;
      topicBreakdown[subject].marks += gain;
    } else if (userAnswer) {
      incorrectCount++;
      // -1 for JEE Main / NEET, 0 for unanswered
      const penalty = examType === "jee_advanced" ? 0 : -1;
      marksObtained += penalty;
      topicBreakdown[subject].marks += penalty;
    }
  }

  const totalMarks = test.total_marks ?? 300;
  const pct = totalMarks > 0 ? Math.round((marksObtained / totalMarks) * 100) : 0;

  // Rough rank estimate (JEE Main: ~10L students, NEET: ~23L students)
  const totalStudents = examType === "neet_ug" ? 2300000 : 1000000;
  const estimatedRank = Math.max(1, Math.round(totalStudents * (1 - pct / 100)));

  await supabaseAdmin
    .from("mock_tests")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      answers: safeAnswers,
      score: correctCount,
      marks_obtained: marksObtained,
      topic_breakdown: topicBreakdown,
      predicted_rank_range: [Math.round(estimatedRank * 0.8), Math.round(estimatedRank * 1.2)],
    })
    .eq("id", test_id);

  return Response.json({
    correct: correctCount,
    incorrect: incorrectCount,
    unanswered: storedQuestions.length - correctCount - incorrectCount,
    marks_obtained: marksObtained,
    total_marks: totalMarks,
    percentage: pct,
    predicted_rank_range: [Math.round(estimatedRank * 0.8), Math.round(estimatedRank * 1.2)],
    topic_breakdown: topicBreakdown,
  });
}