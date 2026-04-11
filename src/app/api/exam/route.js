import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── helpers ──────────────────────────────────────────────
function getDaysLeft(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam = new Date(dateStr + "T00:00:00");
  return Math.ceil((exam - today) / (1000 * 60 * 60 * 24));
}

// ── GET: fetch all exams, auto-mark expired ones ─────────
export async function GET() {
  try {
    // 1. Auto-move expired exams → completed
    const today = new Date().toISOString().split("T")[0];

    await supabase
      .from("exams")
      .update({ status: "completed" })
      .lt("exam_date", today)
      .eq("status", "active");

    // 2. Fetch all exams
    const { data, error } = await supabase
      .from("exams")
      .select("*")
      .order("exam_date", { ascending: true });

    if (error) throw error;

    // 3. Split into active + history in JS
    const active = (data || []).filter((e) => e.status === "active");
    const history = (data || []).filter((e) => e.status === "completed");

    console.log("ACTIVE EXAMS:", active);
    console.log("HISTORY:", history);

    return NextResponse.json({ active, history });

  } catch (err) {
    console.error("GET /exam error:", err);
    return NextResponse.json({ active: [], history: [] }, { status: 500 });
  }
}

// ── POST: create new exam ────────────────────────────────
export async function POST(req) {
  try {
    const { name, exam_date } = await req.json();

    if (!name || !exam_date) {
      return NextResponse.json(
        { error: "name and exam_date are required" },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split("T")[0];
    const status = exam_date >= today ? "active" : "completed";

    const { data, error } = await supabase
      .from("exams")
      .insert([{ name, exam_date, status }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);

  } catch (err) {
    console.error("POST /exam error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PATCH: mark exam completed manually ──────────────────
export async function PATCH(req) {
  try {
    const { id, status } = await req.json();

    const { data, error } = await supabase
      .from("exams")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);

  } catch (err) {
    console.error("PATCH /exam error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}