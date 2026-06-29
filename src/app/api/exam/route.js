import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// service_role bypasses RLS, so every handler MUST derive the user from the JWT and
// scope by user_id — otherwise it leaks/edits every user's exams (was an S0 leak).
async function getUser(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data } = await supabase.auth.getUser(token);
  return data?.user || null;
}

const VALID_STATUSES = new Set(["active", "completed"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ── GET: fetch all exams, auto-mark expired ones ─────────
export async function GET(req) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const today = new Date().toISOString().split("T")[0];

    await supabase
      .from("exams")
      .update({ status: "completed" })
      .eq("user_id", user.id)
      .lt("exam_date", today)
      .eq("status", "active");

    const { data, error } = await supabase
      .from("exams")
      .select("*")
      .eq("user_id", user.id)
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
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { name, exam_date, subject } = body;

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
    const trimmedSubject = subject && typeof subject === "string" ? subject.trim() : "";
    const cleanSubject = trimmedSubject.length > 0
      ? trimmedSubject.toLowerCase().slice(0, 60)
      : null;
    const today = new Date().toISOString().split("T")[0];
    const status = exam_date >= today ? "active" : "completed";

    const { data, error } = await supabase
      .from("exams")
      .insert([{ user_id: user.id, name: cleanName, exam_date, status, subject: cleanSubject }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);

  } catch (err) {
    console.error("POST /exam error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PATCH: update exam fields (status and/or subject) ────
export async function PATCH(req) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { id, status, subject } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const patch = {};
    if (status !== undefined) {
      if (!VALID_STATUSES.has(status)) {
        return NextResponse.json(
          { error: `status must be one of: ${[...VALID_STATUSES].join(", ")}` },
          { status: 400 }
        );
      }
      patch.status = status;
    }
    if (subject !== undefined) {
      const trimmedSub = (subject && typeof subject === "string") ? subject.trim() : "";
      patch.subject = trimmedSub.length > 0 ? trimmedSub.toLowerCase().slice(0, 60) : null;
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("exams")
      .update(patch)
      .eq("id", id)
      .eq("user_id", user.id)
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
