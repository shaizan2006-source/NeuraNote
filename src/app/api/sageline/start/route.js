import { NextResponse } from "next/server";
import { FLAGS, flagDisabledResponse } from "@/lib/featureFlags";
import { canStartCall } from "@/lib/voiceLimits";
import { checkMonthlyBudget, budgetExhaustedResponse } from "@/lib/aiSpend";
import { getUserPlan } from "@/lib/planLimits";
import { isInternalDev } from "@/lib/internalAccess";
import { supabase, getUser } from "@/lib/sageline/server";

const RESUME_WINDOW_MIN = 90;

function greetingFor(docName) {
  const h = new Date().getHours();
  const tod = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  return docName
    ? `Hey! Good ${tod}. This is SageLine. Let's run through ${docName} together — I'll ask, you answer, and we'll catch anything shaky. Ready?`
    : `Hey! Good ${tod}. This is SageLine. Tell me what you're studying and I'll quiz you on it. What are we working on?`;
}

export async function POST(req) {
  if (!FLAGS.SAGELINE_V2) return flagDisabledResponse();

  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const check = await canStartCall(user.id, user);
  if (!check.allowed) {
    return NextResponse.json(
      { error: check.reason, upgradeUrl: check.upgradeUrl, limitReached: true },
      { status: 403 }
    );
  }

  if (!isInternalDev(user)) {
    const plan = await getUserPlan(user.id, user);
    const budgetCheck = await checkMonthlyBudget(user.id, plan);
    if (!budgetCheck.allowed) {
      return NextResponse.json({ ...budgetExhaustedResponse(budgetCheck), limitReached: true }, { status: 429 });
    }
  }

  const body = await req.json().catch(() => ({}));
  const documentId = typeof body?.document_id === "string" ? body.document_id : null;

  // Concurrency guard (spec §2.6.4): a second device / double-tap resumes the
  // live session instead of starting a second one (no double spend).
  const cutoff = new Date(Date.now() - RESUME_WINDOW_MIN * 60_000).toISOString();
  const { data: live } = await supabase
    .from("sageline_sessions")
    .select("*")
    .eq("user_id", user.id)
    .is("ended_at", null)
    .not("state", "in", "(ended,failed)")
    .gte("started_at", cutoff)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let docName = null;
  if (documentId) {
    const { data: doc } = await supabase.from("documents").select("name").eq("id", documentId).maybeSingle();
    docName = doc?.name ?? null;
  }

  if (live) {
    const { data: turns } = await supabase
      .from("sageline_transcript_turns")
      .select("role, content, turn_index")
      .eq("session_id", live.id)
      .order("turn_index", { ascending: true });
    return NextResponse.json({
      session: live, resumed: true, limits: check.limits, todayCount: check.todayCount,
      greetingText: greetingFor(docName), turns: turns ?? [],
    });
  }

  const { data: session, error } = await supabase
    .from("sageline_sessions")
    .insert({ user_id: user.id, document_id: documentId, state: "greeting" })
    .select("*")
    .single();
  if (error) {
    console.error("[sageline/start]", error.message);
    return NextResponse.json({ error: "Failed to start session" }, { status: 500 });
  }

  return NextResponse.json({
    session, resumed: false, limits: check.limits, todayCount: check.todayCount,
    greetingText: greetingFor(docName), turns: [],
  });
}
