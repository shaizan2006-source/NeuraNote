#!/usr/bin/env node
/**
 * phase1-lighter.mjs — Phase 1 lighter checks (staging, no OpenAI cost).
 *   - Gamification streak math: consecutive +1, gap resets to 1, same-day idempotent,
 *     never negative/NaN. Notes the UTC-vs-IST day-boundary.
 *   - Photo Doubt Cam: daily rate-limit (429) + missing-image (400). (No successful
 *     vision call — that costs OpenAI; file-type/size validation absence is a code fact.)
 *   - Brain Map + today's briefing endpoints return without 500.
 * Env: source .env.staging. App at APP (default http://localhost:3000) vs staging.
 */
import { randomUUID } from "node:crypto";
const APP = process.env.APP || "http://localhost:3000";
const SUPA = process.env.STAGING_SUPABASE_URL, ANON = process.env.STAGING_SUPABASE_ANON_KEY, SR = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
for (const [k, v] of Object.entries({ SUPA, ANON, SR })) if (!v) { console.error("missing " + k); process.exit(1); }
let pass = 0, fail = 0; const findings = [];
const ok = (n, c, d = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${d ? " — " + d : ""}`); c ? pass++ : fail++; };
const sb = (p, o = {}) => fetch(`${SUPA}${p}`, { ...o, headers: { apikey: SR, Authorization: `Bearer ${SR}`, "Content-Type": "application/json", ...(o.headers || {}) } });
async function login(email) { const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "StagingPass!23" }) }); const j = await r.json(); if (!j.access_token) throw new Error("login " + email); return { token: j.access_token, uid: j.user.id }; }
const dateStr = (offsetDays) => { const d = new Date(); d.setDate(d.getDate() + offsetDays); return d.toISOString().split("T")[0]; };

(async () => {
  const { token, uid } = await login("free@staging.askmynotes.test");
  const auth = { Authorization: `Bearer ${token}` };
  const setStreak = (last, count) => sb(`/rest/v1/study_streaks?user_id=eq.${uid}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ last_active_date: last, streak_count: count }) });
  const postStreak = async () => (await (await fetch(`${APP}/api/streak`, { method: "POST", headers: auth })).json()).streak;

  console.log("== gamification: streak math ==");
  await fetch(`${APP}/api/streak`, { headers: auth }).catch(() => {}); // warm up route (avoid first-compile flake)
  await setStreak(dateStr(-1), 5);  ok("consecutive day → +1", (await postStreak()) === 6, "expect 6");
  ok("same day → idempotent (no change)", (await postStreak()) === 6, "expect still 6");
  await setStreak(dateStr(-5), 9);  ok("gap (missed days) → reset to 1", (await postStreak()) === 1, "expect 1");
  const s = await postStreak(); ok("never negative / NaN", Number.isInteger(s) && s >= 1, `streak=${s}`);
  findings.push({ sev: "S3", t: "Streak day-boundary uses UTC, not IST", d: "src/app/api/streak/route.js computes 'today'/'yesterday' via new Date().toISOString() (UTC). Indian users' day rolls at 05:30 IST, so studying between 00:00–05:30 IST counts toward the previous UTC day — streaks can break or mis-increment near the boundary. Fix: compute the date in Asia/Kolkata." });
  // reset persona streak to seeded state
  await setStreak(dateStr(0), 5);

  console.log("\n== photo-doubt: rate limit + validation ==");
  // seed 3 doubts today (free limit = 3) → next POST must 429 before any OpenAI call
  await sb(`/rest/v1/photo_doubts?user_id=eq.${uid}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  await sb(`/rest/v1/photo_doubts`, { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(Array.from({ length: 3 }, () => ({ id: randomUUID(), user_id: uid, image_url: "x", recognized_text: "x", created_at: new Date().toISOString() }))) });
  const limRes = await fetch(`${APP}/api/photo-doubt`, { method: "POST", headers: auth, body: new FormData() });
  const limJson = await limRes.json().catch(() => ({}));
  ok("daily limit enforced (429 at free cap of 3)", limRes.status === 429 && limJson.error === "limit_reached", `status=${limRes.status} ${JSON.stringify(limJson).slice(0,60)}`);
  // under limit → missing image → 400
  await sb(`/rest/v1/photo_doubts?user_id=eq.${uid}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  const missRes = await fetch(`${APP}/api/photo-doubt`, { method: "POST", headers: auth, body: new FormData() });
  ok("missing image → 400", missRes.status === 400, `status=${missRes.status}`);
  findings.push({ sev: "S2", t: "Photo Doubt Cam: no file type/size validation (TV-8)", d: "src/app/api/photo-doubt/route.js accepts formData 'image' with no MIME-type allowlist and no size cap before uploading to storage and sending to OpenAI vision (gpt-4o). A non-image or very large file is uploaded + sent to the model — a cost/DoS abuse vector. The only guard is the per-day count (free 3 / student 20 / pro ∞). Fix: validate file.type ∈ {image/jpeg,png,webp} and reject size > ~10MB before upload/vision." });

  console.log("\n== brain-map + briefings render (no 500) ==");
  const bm = await fetch(`${APP}/api/brain-map`, { headers: auth });
  ok("/api/brain-map responds without 500", bm.status < 500, `status=${bm.status}`);
  const br = await fetch(`${APP}/api/briefings/today`, { headers: auth });
  ok("/api/briefings/today responds without 500", br.status < 500, `status=${br.status}`);

  console.log(`\n=== ${pass} pass, ${fail} fail ===`);
  console.log("FINDINGS:"); findings.forEach((f) => console.log(`  [${f.sev}] ${f.t}`));
})().catch((e) => { console.error("harness error:", e.message); process.exit(1); });
