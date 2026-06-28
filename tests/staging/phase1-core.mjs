#!/usr/bin/env node
/**
 * phase1-core.mjs — Phase 1 correctness tests (staging only, no OpenAI cost).
 *
 *  - F-005 live proof: an expired-trial user at the free QA cap is BLOCKED by
 *    /api/ask (403) after the getUserPlan fix — i.e. treated as free, not pro.
 *    (The limit check returns 403 before any OpenAI call, so this costs nothing.)
 *  - Mock-test scoring (TV-7): all-correct / all-wrong / partial / skipped, with
 *    marks computed independently and compared to /api/mock-test/submit.
 *
 * Env (source .env.staging): STAGING_SUPABASE_URL/_ANON_KEY/_SERVICE_ROLE_KEY.
 * App must run at APP (default http://localhost:3000) against staging.
 */
import crypto from "node:crypto"; // (unused but handy if extended)

const APP = process.env.APP || "http://localhost:3000";
const SUPA = process.env.STAGING_SUPABASE_URL;
const ANON = process.env.STAGING_SUPABASE_ANON_KEY;
const SR = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
for (const [k, v] of Object.entries({ SUPA, ANON, SR })) if (!v) { console.error(`missing env ${k}`); process.exit(1); }

const PASSWORD = "StagingPass!23";
let pass = 0, fail = 0;
const findings = [];
const ok = (n, c, d = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${d ? " — " + d : ""}`); c ? pass++ : fail++; };

const sb = (path, opts = {}) => fetch(`${SUPA}${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, "Content-Type": "application/json", ...(opts.headers || {}) } });
async function login(email) {
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email, password: PASSWORD }) });
  const j = await r.json(); if (!j.access_token) throw new Error("login failed " + email); return { token: j.access_token, uid: j.user.id };
}
const isoNow = () => new Date().toISOString();

(async () => {
  // ───────────────────────── F-005 live proof ─────────────────────────
  console.log("== F-005: expired trial is blocked by free QA limit ==");
  const { token: expToken, uid: expUid } = await login("expired@staging.askmynotes.test");
  // Fill expired persona's qa_usage to the free cap (20 rows today).
  await sb(`/rest/v1/qa_usage?user_id=eq.${expUid}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  await sb(`/rest/v1/qa_usage`, { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(Array.from({ length: 20 }, () => ({ user_id: expUid, created_at: isoNow() }))) });
  const askRes = await fetch(`${APP}/api/ask`, { method: "POST", headers: { Authorization: `Bearer ${expToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ question: "qa probe" }) });
  const askBody = await askRes.json().catch(() => ({}));
  const blocked = askRes.status === 403 && askBody.limitReached === true;
  ok("expired-trial user blocked at free cap (403 limitReached)", blocked, `status=${askRes.status} body=${JSON.stringify(askBody).slice(0, 90)}`);
  if (!blocked && askRes.status === 200) findings.push("F-005 STILL OPEN: expired trial served as pro (not free-limited).");
  await sb(`/rest/v1/qa_usage?user_id=eq.${expUid}`, { method: "DELETE", headers: { Prefer: "return=minimal" } }); // cleanup

  // ───────────────────────── Mock-test scoring (TV-7) ─────────────────────────
  console.log("\n== seed jee_main PYQs ==");
  const subjects = { Physics: ["a", "b"], Chemistry: ["c", "d"], Mathematics: ["a", "b"] };
  const pyqs = [];
  for (const [subject, answers] of Object.entries(subjects)) {
    answers.forEach((ans, i) => pyqs.push({
      slug: `seed-jee_main-${subject.toLowerCase()}-${i + 1}`, exam_type: "jee_main", exam_year: 2026,
      subject, chapter: "Test", question_text: `${subject} Q${i + 1}`,
      options: { a: "A", b: "B", c: "C", d: "D" }, correct_answer: ans,
      difficulty: "medium", question_type: "mcq", mark_weight: 4, source_attribution: "seed", updated_at: isoNow(),
    }));
  }
  const seedRes = await sb(`/rest/v1/pyqs?on_conflict=slug`, { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(pyqs) });
  ok("seeded 6 jee_main PYQs", seedRes.ok, `status=${seedRes.status}`);

  const { token } = await login("pro@staging.askmynotes.test");
  const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const wrong = (correct) => ["a", "b", "c", "d"].find((o) => o !== correct);

  async function runScenario(name, pick) {
    // pick(q, idx) → answer string OR null to skip
    const cRes = await fetch(`${APP}/api/mock-test/create`, { method: "POST", headers: auth, body: JSON.stringify({ exam_type: "jee_main" }) });
    const c = await cRes.json();
    if (!c.test_id) { ok(`${name}: create`, false, JSON.stringify(c).slice(0, 100)); return; }
    const stored = (await (await sb(`/rest/v1/mock_tests?id=eq.${c.test_id}&select=questions`)).json())[0]?.questions ?? [];
    let expCorrect = 0, expIncorrect = 0, expMarks = 0;
    const answers = [];
    stored.forEach((q, idx) => {
      const a = pick(q, idx);
      if (a == null) return;                 // skipped → unanswered
      answers.push({ question_id: q.id, answer: a });
      if (a === q.correct_answer) { expCorrect++; expMarks += (q.mark_weight ?? 4); }
      else { expIncorrect++; expMarks += -1; }   // jee_main penalty
    });
    const sRes = await fetch(`${APP}/api/mock-test/submit`, { method: "POST", headers: auth, body: JSON.stringify({ test_id: c.test_id, answers }) });
    const s = await sRes.json();
    const good = s.correct === expCorrect && s.incorrect === expIncorrect && s.marks_obtained === expMarks &&
                 s.unanswered === (stored.length - expCorrect - expIncorrect);
    ok(`${name}: scoring correct`, good, `got c=${s.correct}/i=${s.incorrect}/m=${s.marks_obtained}/u=${s.unanswered} exp c=${expCorrect}/i=${expIncorrect}/m=${expMarks}`);
    await sb(`/rest/v1/mock_tests?id=eq.${c.test_id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } }); // cleanup
  }

  console.log("\n== mock-test scoring scenarios ==");
  await runScenario("all-correct", (q) => q.correct_answer);
  await runScenario("all-wrong", (q) => wrong(q.correct_answer));
  await runScenario("partial (alt correct/wrong)", (q, i) => (i % 2 === 0 ? q.correct_answer : wrong(q.correct_answer)));
  await runScenario("skipped (no answers)", () => null);
  await runScenario("timed-out (first half only)", (q, i) => (i < 3 ? q.correct_answer : null));

  console.log(`\n=== ${pass} pass, ${fail} fail ===`);
  if (findings.length) { console.log("FINDINGS:"); findings.forEach((f) => console.log("  - " + f)); }
})().catch((e) => { console.error("harness error:", e.message); process.exit(1); });
