import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subject, hoursPerDay, target, deadline, level, preference, optimize } = await req.json();

  if (!subject?.trim() || !hoursPerDay || !target?.trim() || !level || !preference) {
    return NextResponse.json({ error: "Missing required fields: subject, hoursPerDay, target, level, preference" }, { status: 400 });
  }

  const hours = Math.min(Math.max(Number(hoursPerDay), 1), 12);
  const sessionsPerDay = hours <= 2 ? 1 : hours <= 4 ? 2 : 3;
  const hoursPerSession = Math.round((hours / sessionsPerDay) * 10) / 10;

  // Calculate days left if deadline given
  let daysNote = "No deadline provided — plan for 7 days.";
  let urgencyNote = "";
  if (deadline) {
    const daysLeft = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 0) {
      return NextResponse.json({ error: "Deadline must be in the future" }, { status: 400 });
    }
    const planDays = Math.min(daysLeft, 7);
    daysNote = `Deadline in ${daysLeft} days — plan exactly ${planDays} days.`;
    if (daysLeft <= 3) urgencyNote = "URGENT: Prioritize revision and practice. Minimize new concepts.";
    else if (daysLeft <= 7) urgencyNote = "Exam approaching: Balance concepts and revision heavily.";
  }

  const optimizeNote = optimize
    ? "\nThis is a REGENERATION — vary session order, topic depth, time slots, and distribution meaningfully from before."
    : "";

  const prompt = `You are a study planner for Indian students (JEE/NEET/University exams).

Student inputs:
- Subject: ${subject}
- Daily study time: ${hours} hours/day → ${sessionsPerDay} session(s)/day, ${hoursPerSession}h each
- Target: ${target}
- Current level: ${level}
- Study preference: ${preference}
- ${daysNote}
${urgencyNote}${optimizeNote}

Generate a personalized, day-wise study plan. Return ONLY valid JSON (no markdown, no text outside JSON):

{
  "summary": "One sentence describing this plan's focus",
  "totalDays": <integer 1-7>,
  "days": [
    {
      "day": 1,
      "label": "Day 1 – <short theme>",
      "sessions": [
        {
          "time": "10:00–12:00",
          "topic": "<specific topic from ${subject}>",
          "type": "learn|revise|practice",
          "priority": "high|medium|low"
        }
      ]
    }
  ]
}

Rules (strictly enforce):
1. Every topic must belong to "${subject}" — never include unrelated subjects
2. Progress: foundational topics first, advanced topics later
3. Preference "Revision-Heavy": 60% revise, 40% learn/practice
4. Preference "Concept Learning": 70% learn, 30% practice
5. Preference "Mixed": roughly equal distribution
6. Level "Beginner": only introductory and core topics, no advanced content
7. Level "Intermediate": mix of core and mid-level topics
8. Level "Advanced": deep dives, edge cases, hard problems
9. Exactly ${sessionsPerDay} session(s) per day — no more, no less
10. Time slots must be realistic (e.g., 09:00–11:00, 14:00–16:00, 19:00–20:00)
11. Topics must be specific (e.g., "Newton's Laws of Motion", not just "Physics")`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: optimize ? 0.9 : 0.7,
      max_tokens: 2000,
    });

    const raw = response.choices[0].message.content.trim();

    let plan;
    try {
      plan = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Invalid JSON from model");
      plan = JSON.parse(match[0]);
    }

    return NextResponse.json(plan);
  } catch (err) {
    console.error("[study-plan/generate]", err);
    return NextResponse.json({ error: "Failed to generate plan" }, { status: 500 });
  }
}
