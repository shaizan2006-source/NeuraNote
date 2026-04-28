import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const VALID_STATUSES = new Set(["active", "completed"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ── GET: fetch all exams, auto-mark expired ones ─────────
export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0];

    await supabase
      .from("exams")
      .update({ status: "completed" })
      .lt("exam_date", today)
      .eq("status", "active");

    const { data, error } = await supabase
      .from("exams")
      .select("*")
      .order("exam_date", { ascending: true });

    if (error) throw error;

    const active  = (data || []).filter((e) => e.status === "active");
    const history = (data || []).filter((e) => e.status === "completed");

    return NextResponse.json({ active, history });

  } catch (err) {
    console.error("GET /exam error:", err);
    return NextResponse.json({ active: [], history: [] });
  }
}

// ── POST: create new exam ────────────────────────────────
export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { name, exam_date } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (!exam_date || typeof exam_date !== "string") {
      return NextResponse.json({ error: "exam_date is required" }, { status: 400 });
    }
    if (!DATE_RE.test(exam_date)) {
      return NextResponse.json({ error: "exam_date must be YYYY-MM-DD" }, { status: 400 });
    }

    const cleanName = name.trim().slice(0, 100);
    const today = new Date().toISOString().split("T")[0];
    const status = exam_date >= today ? "active" : "completed";

    const { data, error } = await supabase
      .from("exams")
      .insert([{ name: cleanName, exam_date, status }])
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
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { id, status } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    if (!status || !VALID_STATUSES.has(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${[...VALID_STATUSES].join(", ")}` },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("exams")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    return NextResponse.json(data);

  } catch (err) {
    console.error("PATCH /exam error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
