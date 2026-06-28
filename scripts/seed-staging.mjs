#!/usr/bin/env node
/**
 * seed-staging.mjs — Phase 0 staging artifact (QA)
 *
 * Seeds deterministic test data into a STAGING Supabase project so the core
 * learning + revenue flows can be exercised without touching real users.
 *
 * Personas (all @staging.askmynotes.test, password "StagingPass!23"):
 *   free@      — plan=free (downgraded/free state)        exam: JEE
 *   trial@     — plan=pro, is_trial, trial active (+5d)    exam: NEET
 *   student@   — paid ₹199 'student', expires +30d         exam: UPSC
 *   pro@       — paid ₹399 'pro', expires +30d              exam: GATE
 *   family@    — paid ₹4,499/yr 'family', expires +365d     exam: CA
 *   expired@   — RAW LAPSED TRIAL: plan=pro, is_trial=true,
 *                trial_ends_at in the past, expires_at=NULL  exam: JEE
 *                (Deliberately reproduces the lapsed state. getUserPlan() only
 *                 checks expires_at, not trial_ends_at, so this persona reveals
 *                 whether trial-expiry actually revokes entitlements — TV-13.)
 *
 * Also seeds, per persona: profile + cohort, study_streak, daily_progress,
 * a document (metadata), due FSRS cards (spaced_repetition_cards), and one
 * completed mock_test for the paid personas; plus GLOBAL sample PYQs per exam.
 *
 * SAFETY (this is a live product — never seed prod):
 *   - Requires STAGING_SUPABASE_URL + STAGING_SUPABASE_SERVICE_ROLE_KEY
 *     (distinct names from the app's prod NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).
 *   - REFUSES to run if STAGING_SUPABASE_URL === the app's configured prod URL.
 *   - REFUSES unless ALLOW_SEED=1 is set.
 *   - All writes are scoped to the fake @staging.askmynotes.test users and
 *     'seed-' PYQ slugs; per-user content is delete-then-insert for that user_id only.
 *
 * Usage:
 *   STAGING_SUPABASE_URL=https://<ref>.supabase.co \
 *   STAGING_SUPABASE_SERVICE_ROLE_KEY=<service_role> \
 *   ALLOW_SEED=1 node scripts/seed-staging.mjs
 *
 * NOTE: This script cannot be validated until a staging project exists. Column
 * targets follow the Phase 0 canonical schema (docs/qa/STAGING_SETUP.md §5).
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

// ── Safety gate ─────────────────────────────────────────────────────────────
const URL = process.env.STAGING_SUPABASE_URL;
const KEY = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
const PROD_URL = process.env.NEXT_PUBLIC_SUPABASE_URL; // app's prod, if present in env

function die(msg) { console.error(`\n[seed] ABORT: ${msg}\n`); process.exit(1); }

if (!URL || !KEY) {
  die("set STAGING_SUPABASE_URL and STAGING_SUPABASE_SERVICE_ROLE_KEY (staging only).");
}
if (PROD_URL && URL.trim() === PROD_URL.trim()) {
  die("STAGING_SUPABASE_URL equals the app's NEXT_PUBLIC_SUPABASE_URL (prod). Refusing.");
}
if (process.env.ALLOW_SEED !== "1") {
  die('refusing without ALLOW_SEED=1 (guards against accidental runs).');
}

console.log(`[seed] target: ${URL}`);
console.log(`[seed] writing test data for @staging.askmynotes.test users…`);

const sb = createClient(URL, KEY, { auth: { persistSession: false } });

const PASSWORD = "StagingPass!23";
const now = new Date();
const iso = (d) => new Date(d).toISOString();
const daysFromNow = (n) => iso(now.getTime() + n * 86_400_000);
const todayDate = iso(now).slice(0, 10);

// ── Personas ────────────────────────────────────────────────────────────────
const PERSONAS = [
  { key: "free",    email: "free@staging.askmynotes.test",    exam_type: "JEE Main 2027",   region: "North", class_level: "12",
    plan: { plan: "free", is_trial: false, billing_cycle: "monthly" } },
  { key: "trial",   email: "trial@staging.askmynotes.test",   exam_type: "NEET 2027",       region: "South", class_level: "12",
    plan: { plan: "pro", is_trial: true, trial_started_at: daysFromNow(-2), trial_ends_at: daysFromNow(5), billing_cycle: "monthly" } },
  { key: "student", email: "student@staging.askmynotes.test", exam_type: "UPSC CSE 2027",   region: "West",  class_level: "grad",
    plan: { plan: "student", is_trial: false, billing_cycle: "monthly", payment_id: "pay_seedStudent001", expires_at: daysFromNow(30) } },
  { key: "pro",     email: "pro@staging.askmynotes.test",     exam_type: "GATE CSE 2027",   region: "South", class_level: "grad",
    plan: { plan: "pro", is_trial: false, billing_cycle: "monthly", payment_id: "pay_seedPro001", expires_at: daysFromNow(30) } },
  { key: "family",  email: "family@staging.askmynotes.test",  exam_type: "CA Foundation 2027", region: "West", class_level: "grad",
    plan: { plan: "family", is_trial: false, billing_cycle: "annual", payment_id: "pay_seedFamily001", expires_at: daysFromNow(365) } },
  { key: "expired", email: "expired@staging.askmynotes.test", exam_type: "JEE Main 2027",   region: "East",  class_level: "12",
    // RAW LAPSED TRIAL — trial_ends_at in past, NO expires_at. See header / TV-13.
    plan: { plan: "pro", is_trial: true, trial_started_at: daysFromNow(-12), trial_ends_at: daysFromNow(-5), billing_cycle: "monthly" } },
];

const SUBJECT_BY_EXAM = {
  "JEE Main 2027": "Physics",
  "NEET 2027": "Biology",
  "UPSC CSE 2027": "Polity",
  "GATE CSE 2027": "Algorithms",
  "CA Foundation 2027": "Accounting",
};

const examYear = (t) => (t.match(/(\d{4})$/) ? parseInt(t.match(/(\d{4})$/)[1]) : null);
const cohortId = (p) =>
  [p.exam_type, examYear(p.exam_type), p.region, p.class_level]
    .filter(Boolean).join("_").toLowerCase().replace(/\s+/g, "_");

// ── User get-or-create (idempotent) ──────────────────────────────────────────
async function getOrCreateUser(email) {
  const { data: created, error } = await sb.auth.admin.createUser({
    email, password: PASSWORD, email_confirm: true,
  });
  if (!error && created?.user) return created.user.id;

  // Already exists → find via paginated listing.
  for (let page = 1; page <= 20; page++) {
    const { data, error: listErr } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (listErr) throw listErr;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit.id;
    if (data.users.length < 200) break;
  }
  throw new Error(`could not create or find user ${email}: ${error?.message}`);
}

async function safe(label, fn) {
  try { await fn(); console.log(`  ok   ${label}`); }
  catch (e) { console.warn(`  WARN ${label}: ${e.message || e}`); }
}

// ── Per-persona seed ──────────────────────────────────────────────────────────
async function seedPersona(p) {
  console.log(`\n[seed] ${p.key} (${p.email})`);
  const uid = await getOrCreateUser(p.email);
  const subject = SUBJECT_BY_EXAM[p.exam_type] || "General";
  const cid = cohortId(p);

  await safe("profile", async () => {
    const { error } = await sb.from("profiles").upsert({
      id: uid, email: p.email, full_name: `Seed ${p.key}`,
      exam_type: p.exam_type, exam_year: examYear(p.exam_type),
      exam_date: daysFromNow(120), class_level: p.class_level,
      region: p.region, cohort_id: cid, preferred_language: "en",
      updated_at: iso(now),
    }, { onConflict: "id" });
    if (error) throw error;
  });

  await safe("cohort + membership", async () => {
    await sb.from("cohorts").upsert({
      id: cid, exam_type: p.exam_type, exam_year: examYear(p.exam_type),
      region: p.region, class_level: p.class_level, updated_at: iso(now),
    }, { onConflict: "id" });
    await sb.from("cohort_members").upsert({
      cohort_id: cid, user_id: uid, display_handle: `seed_${p.key}`,
    }, { onConflict: "cohort_id,user_id" });
  });

  await safe("user_plan", async () => {
    // delete-then-insert keeps the plan row authoritative per persona
    await sb.from("user_plans").delete().eq("user_id", uid);
    const { error } = await sb.from("user_plans").insert({ user_id: uid, ...p.plan });
    if (error) throw error;
  });

  await safe("study_streak", async () => {
    // study_streaks has PK(id) + FK(user_id) but NO unique on user_id → can't upsert
    // on user_id. delete-then-insert keeps one authoritative row per seeded user.
    await sb.from("study_streaks").delete().eq("user_id", uid);
    const { error } = await sb.from("study_streaks").insert({
      user_id: uid, streak_count: 5, longest_streak: 7,
      last_active_date: todayDate, last_evaluated_date: todayDate,
      freezes_available: 1, freezes_used: 0, cumulative_study_days: 12, updated_at: iso(now),
    });
    if (error) throw error;
  });

  await safe("daily_progress", async () => {
    await sb.from("daily_progress").delete().eq("user_id", uid).eq("date", todayDate);
    const { error } = await sb.from("daily_progress").insert({
      user_id: uid, date: todayDate, questions: 3, study_minutes: 25,
    });
    if (error) throw error;
  });

  // Free persona: seed qa_usage rows near the daily limit (18/20) to test the paywall.
  if (p.key === "free") {
    await safe("qa_usage (18 rows, near free cap)", async () => {
      await sb.from("qa_usage").delete().eq("user_id", uid);
      const rows = Array.from({ length: 18 }, () => ({ user_id: uid, created_at: iso(now) }));
      const { error } = await sb.from("qa_usage").insert(rows);
      if (error) throw error;
    });
  }

  await safe("document (metadata)", async () => {
    await sb.from("documents").delete().eq("user_id", uid);
    const { error } = await sb.from("documents").insert({
      user_id: uid, name: `Seed Notes — ${subject}`, subject,
      content: `Sample ${subject} study content for ${p.exam_type}. (Seeded; no embeddings — run /api/process-pdf with a real OpenAI key for RAG.)`,
      page_count: 3, concept_count: 0, processing_status: "complete", updated_at: iso(now),
    });
    if (error) throw error;
  });

  await safe("due FSRS cards (3)", async () => {
    const topics = [`${subject} — Topic A`, `${subject} — Topic B`, `${subject} — Topic C`];
    const rows = topics.map((topic, i) => ({
      user_id: uid, topic, subject, card_type: "concept",
      fsrs_state: i === 0 ? "New" : "Review",
      fsrs_stability: 2.5, fsrs_difficulty: 5.0,
      fsrs_due: daysFromNow(-1), fsrs_lapses: 0, fsrs_elapsed_days: 2,
      ease_factor: 2.5, interval_days: 1, repetition: i === 0 ? 0 : 2,
      last_review_at: daysFromNow(-2), next_due_at: daysFromNow(-1), updated_at: iso(now),
    }));
    const { error } = await sb.from("spaced_repetition_cards")
      .upsert(rows, { onConflict: "user_id,topic" });
    if (error) throw error;
  });

  // Completed mock test for paid personas → /mock-test history renders.
  if (["student", "pro", "family"].includes(p.key)) {
    await safe("completed mock_test", async () => {
      await sb.from("mock_tests").delete().eq("user_id", uid).eq("status", "completed");
      const questions = [
        { id: "q1", question: `${subject} sample Q1`, options: { a: "A", b: "B", c: "C", d: "D" }, correct: "a", subject },
        { id: "q2", question: `${subject} sample Q2`, options: { a: "A", b: "B", c: "C", d: "D" }, correct: "c", subject },
      ];
      const { error } = await sb.from("mock_tests").insert({
        user_id: uid, exam_type: p.exam_type.split(" ")[0],
        total_questions: 2, questions, answers: { q1: "a", q2: "b" },
        score: 50, marks_obtained: 4, total_marks: 8,
        topic_breakdown: { [subject]: { correct: 1, total: 2 } },
        predicted_rank_range: [5000, 8000], status: "completed",
        duration_seconds: 1800, started_at: daysFromNow(-1), completed_at: daysFromNow(-1),
      });
      if (error) throw error;
    });
  }

  return uid;
}

// ── Global PYQs (public read) ────────────────────────────────────────────────
async function seedPyqs() {
  console.log(`\n[seed] global PYQs`);
  const items = [
    { exam: "JEE",  subject: "Physics",    chapter: "Kinematics",   q: "A body moves with uniform acceleration. Which graph is linear?", correct: "b" },
    { exam: "NEET", subject: "Biology",    chapter: "Cell Biology", q: "Which organelle is the powerhouse of the cell?",                 correct: "a" },
    { exam: "UPSC", subject: "Polity",     chapter: "Constitution", q: "Which Article deals with the Right to Equality?",                correct: "c" },
    { exam: "GATE", subject: "Algorithms", chapter: "Sorting",      q: "Worst-case time complexity of quicksort?",                       correct: "d" },
    { exam: "CA",   subject: "Accounting", chapter: "Journals",     q: "A debit to an asset account represents?",                        correct: "a" },
  ];
  await safe(`upsert ${items.length} PYQs`, async () => {
    const rows = items.map((it, i) => ({
      slug: `seed-${it.exam.toLowerCase()}-${i + 1}`,
      exam_type: it.exam, exam_year: 2026, subject: it.subject, chapter: it.chapter,
      question_text: it.q,
      options: { a: "Option A", b: "Option B", c: "Option C", d: "Option D" },
      correct_answer: it.correct,
      solution_text: "Seeded solution explanation.",
      difficulty: "medium", question_type: "mcq", mark_weight: 4,
      source_attribution: "seed", updated_at: iso(now),
    }));
    const { error } = await sb.from("pyqs").upsert(rows, { onConflict: "slug" });
    if (error) throw error;
  });
}

// ── Run ───────────────────────────────────────────────────────────────────────
(async () => {
  const summary = [];
  for (const p of PERSONAS) {
    const uid = await seedPersona(p);
    summary.push({ persona: p.key, email: p.email, user_id: uid, plan: p.plan.plan });
  }
  await seedPyqs();

  console.log(`\n[seed] DONE. Personas (password "${PASSWORD}"):`);
  console.table(summary);
  console.log("\nNext: capture the baseline with  node scripts/capture-baseline.mjs  (or npx playwright test tests/e2e/baseline-capture.spec.js)");
})().catch((e) => die(e.message || String(e)));
