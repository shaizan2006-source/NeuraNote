#!/usr/bin/env node
/**
 * phase3-db.mjs — Phase 3 DB breakage / concurrency (staging, no OpenAI).
 *   - mock-test double-submit (sequential + concurrent) idempotency / TOCTOU
 *   - concurrent streak POST race (no over-increment / corruption)
 *   - connection-pool burst (graceful vs raw 500s/hangs)
 * Env: source .env.staging. App at APP (default http://localhost:3000).
 */
const APP = process.env.APP || "http://localhost:3000";
const SUPA = process.env.STAGING_SUPABASE_URL, ANON = process.env.STAGING_SUPABASE_ANON_KEY, SR = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
for (const [k, v] of Object.entries({ SUPA, ANON, SR })) if (!v) { console.error("missing " + k); process.exit(1); }
let pass = 0, fail = 0; const findings = [];
const ok = (n, c, d = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${d ? " — " + d : ""}`); c ? pass++ : fail++; };
const sb = (p, o = {}) => fetch(`${SUPA}${p}`, { ...o, headers: { apikey: SR, Authorization: `Bearer ${SR}`, "Content-Type": "application/json", ...(o.headers || {}) } });
async function login(email) { const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "StagingPass!23" }) }); const j = await r.json(); if (!j.access_token) throw new Error("login " + email); return { token: j.access_token, uid: j.user.id }; }
const istYesterday = () => new Date(Date.now() - 86_400_000 + 5.5 * 3600 * 1000).toISOString().slice(0, 10);

(async () => {
  const { token, uid } = await login("student@staging.askmynotes.test");
  const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // ── 1. mock-test double-submit ──────────────────────────────────────────────
  console.log("== mock-test double-submit idempotency ==");
  async function freshTest() {
    const c = await (await fetch(`${APP}/api/mock-test/create`, { method: "POST", headers: auth, body: JSON.stringify({ exam_type: "jee_main" }) })).json();
    if (!c.test_id) return null;
    const stored = (await (await sb(`/rest/v1/mock_tests?id=eq.${c.test_id}&select=questions`)).json())[0]?.questions ?? [];
    const answers = stored.map((q) => ({ question_id: q.id, answer: q.correct_answer }));
    return { test_id: c.test_id, answers };
  }
  const t1 = await freshTest();
  if (!t1) { ok("mock create (jee_main seeded?)", false, "no test_id — seed seed-jee_main-* PYQs"); }
  else {
    // sequential: submit, then submit again
    const s1 = await (await fetch(`${APP}/api/mock-test/submit`, { method: "POST", headers: auth, body: JSON.stringify(t1) })).json();
    const s2 = await (await fetch(`${APP}/api/mock-test/submit`, { method: "POST", headers: auth, body: JSON.stringify(t1) })).json();
    ok("sequential re-submit rejected ('Already submitted')", s1.correct !== undefined && /already/i.test(s2.error || ""), `s1=${JSON.stringify(s1).slice(0,40)} s2=${JSON.stringify(s2).slice(0,40)}`);

    // concurrent: two submits on a fresh test at once (TOCTOU)
    const t2 = await freshTest();
    const [c1, c2] = await Promise.all([
      fetch(`${APP}/api/mock-test/submit`, { method: "POST", headers: auth, body: JSON.stringify(t2) }).then(r => r.json()),
      fetch(`${APP}/api/mock-test/submit`, { method: "POST", headers: auth, body: JSON.stringify(t2) }).then(r => r.json()),
    ]);
    const scored = [c1, c2].filter(x => x.correct !== undefined).length;
    const rows = (await (await sb(`/rest/v1/mock_tests?id=eq.${t2.test_id}&select=status,score`)).json());
    ok("concurrent double-submit: no row corruption (one row, completed)", rows.length === 1 && rows[0].status === "completed", `rows=${rows.length} status=${rows[0]?.status} scoredResponses=${scored}`);
    if (scored === 2) findings.push({ sev: "S3", t: "mock-test/submit double-submit is not concurrency-safe (TOCTOU)", d: "Two concurrent submits on the same active test both score (the 'Already submitted' guard reads status before either writes). One row remains (last write wins, same answers→same score), so no corruption — but the guard isn't atomic. Fix: guard the update with a conditional WHERE status='active' (or a DB transaction)." });
    // cleanup created tests
    await sb(`/rest/v1/mock_tests?user_id=eq.${uid}&status=eq.completed`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  }

  // ── 2. concurrent streak race ───────────────────────────────────────────────
  console.log("== concurrent streak race (no over-increment) ==");
  await sb(`/rest/v1/study_streaks?user_id=eq.${uid}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ last_active_date: istYesterday(), streak_count: 5 }) });
  await Promise.all(Array.from({ length: 10 }, () => fetch(`${APP}/api/streak`, { method: "POST", headers: auth }).then(r => r.json()).catch(() => null)));
  const streak = (await (await sb(`/rest/v1/study_streaks?user_id=eq.${uid}&select=streak_count`)).json())[0]?.streak_count;
  ok("10 concurrent streak POSTs → count = 6, not over-incremented", streak === 6, `streak_count=${streak} (expected 6)`);
  if (streak > 6) findings.push({ sev: "S2", t: "Concurrent streak POSTs over-increment (read-modify-write race)", d: `10 concurrent POSTs produced streak_count=${streak} instead of 6.` });

  // ── 3. connection-pool burst ────────────────────────────────────────────────
  console.log("== connection-pool burst (30 concurrent authed GETs) ==");
  const codes = await Promise.all(Array.from({ length: 30 }, () =>
    fetch(`${APP}/api/cards/due`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.status).catch(() => "ERR")));
  const dist = codes.reduce((a, c) => (a[c] = (a[c] || 0) + 1, a), {});
  const bad = codes.filter(c => c === 500 || c === "ERR" || c === 503).length;
  ok("30 concurrent requests degrade gracefully (no raw 500/hang)", bad === 0, `status distribution=${JSON.stringify(dist)}`);
  if (bad > 0) findings.push({ sev: "S2", t: "Connection-pool / concurrency: requests fail under a modest burst", d: `30 concurrent GETs → ${bad} failed (5xx/ERR). distribution=${JSON.stringify(dist)}. Check Supabase pooler config / serverless concurrency.` });

  console.log(`\n=== ${pass} pass, ${fail} fail ===`);
  if (findings.length) { console.log("FINDINGS:"); findings.forEach(f => console.log(`  [${f.sev}] ${f.t}`)); }
})().catch((e) => { console.error("harness error:", e.message); process.exit(1); });
