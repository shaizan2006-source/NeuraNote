import { NextResponse } from "next/server";
import { getMemory } from "@/lib/memory";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(req) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    // ========================
    // 1. GET MEMORY
    // ========================
    const memory = (await getMemory(userId)) || [];

    const weakTopics = memory
      .filter((m) => m.key === "weak_topic")
      .sort((a, b) => b.weight - a.weight);

    const interestTopics = memory
      .filter((m) => m.key === "interest_topic")
      .sort((a, b) => b.weight - a.weight);

    // ========================
    // 2. GET EXAM DATA
    // ========================
    let daysLeft = null;

    try {
      const { data } = await supabase
        .from("exam")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (data?.exam_date) {
        const examDate = new Date(data.exam_date);
        const today = new Date();
        const diff = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
        daysLeft = diff;
      }
    } catch (err) {
      console.warn("No exam data");
    }

    // ========================
    // 3. GET PROGRESS
    // ========================
    let progressScore = 0;

    try {
      const { data } = await supabase
        .from("progress")
        .select("*")
        .eq("user_id", userId)
        .single();

      progressScore = data?.score || 0;
    } catch (err) {
      console.warn("No progress data");
    }

    // ========================
    // 4. DECISION LOGIC
    // ========================
    let plan = [];

    // 🔥 PRIORITY 1: Weak topics
    if (weakTopics.length > 0) {
      const topWeak = weakTopics[0].value;

      plan.push(`🔥 Focus on weak topic: ${topWeak}`);
      plan.push(`Practice 5 problems on ${topWeak}`);
    }

    // 🔥 PRIORITY 2: Exam urgency
    if (daysLeft !== null) {
      if (daysLeft <= 3) {
        plan.push("⚠️ Exam very close: Do rapid revision");
      } else if (daysLeft <= 7) {
        plan.push("📚 Focus on high-weight topics");
      } else {
        plan.push("🧠 Build strong concepts gradually");
      }
    }

    // 🔥 PRIORITY 3: Interest
    if (interestTopics.length > 0) {
      const topInterest = interestTopics[0].value;
      plan.push(`💡 Explore: ${topInterest}`);
    }

    // 🔥 PRIORITY 4: Progress
    if (progressScore < 40) {
      plan.push("📉 Low score: Revise basics");
    } else if (progressScore > 80) {
      plan.push("🚀 You're doing great — attempt harder problems");
    }

    // ========================
    // 🔥 SPACED REPETITION (ADDED)
    // ========================
    try {
      const { data: revisionTopics } = await supabase
        .from("revision_topics")
        .select("*")
        .eq("user_id", userId)
        .lte("next_review", new Date().toISOString());

      if (revisionTopics && revisionTopics.length > 0) {
        plan.unshift(
          `🔁 Revise: ${revisionTopics.map(t => t.topic).join(", ")}`
        );
      }
    } catch (err) {
      console.warn("No revision topics");
    }

    // ========================
    // 5. INACTIVITY DETECTION
    // ========================
    let inactiveDays = 0;

    try {
      const { data } = await supabase
        .from("user_activity")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (data?.last_active) {
        const last = new Date(data.last_active);
        const now = new Date();
        inactiveDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));
      }
    } catch (err) {
      console.warn("No activity data");
    }

    // 🔥 AUTONOMOUS BEHAVIOR
    if (inactiveDays >= 5) {
      plan.unshift("🚨 Long inactivity detected — restart with basics + short quiz");
    } else if (inactiveDays >= 2) {
      plan.unshift("⚠️ You've been inactive — start with a light revision today");
    }

    // 🔥 ALWAYS INCLUDE
    plan.push("🧪 Take a quiz");
    plan.push("📝 Review mistakes");

    return NextResponse.json({ plan, daysLeft });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to generate plan" }, { status: 500 });
  }
}