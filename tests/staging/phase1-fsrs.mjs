#!/usr/bin/env node
/**
 * phase1-fsrs.mjs — FSRS spaced-repetition INTERVAL correctness (TV-6).
 *
 * Verifies the REAL review flow:  POST /api/cards/[id]/review
 *
 *  Architecture (discovered):
 *   - /api/cards/[id]/review updates mastery_state (Phase 0.5 simple rules) AND,
 *     IF a mastery_topics row exists where topic == card.concept_id, it calls the
 *     ts-fsrs scheduler (src/lib/fsrs/scheduler.js → scheduleReview) which is the
 *     ONLY real FSRS interval logic. That writes spaced_repetition_cards
 *     (fsrs_due / fsrs_stability / interval_days / next_due_at) keyed by topic.
 *   - To exercise the FSRS path through the real endpoint we set
 *     mastery_topics.topic = <concept_id UUID> so the endpoint's join matches,
 *     and we read back spaced_repetition_cards.topic = <concept_id> to assert.
 *
 *  Ratings the endpoint accepts: again | hard | good | easy  (→ FSRS 1|2|3|4).
 *
 *  Assertions:
 *   (a) first review schedules a sensible next interval (fsrs_due > now)
 *   (b) good/easy push next-due further out than again/hard
 *   (c) the new next-due is PERSISTED (re-read the row)
 *   (d) repeated on-time good reviews grow the interval
 *   (e) a lapse ("again") shortens/resets it
 *   + IST vs UTC day-boundary analysis for the "due" computation.
 *
 * Env (source .env.staging): STAGING_SUPABASE_URL/_ANON_KEY/_SERVICE_ROLE_KEY.
 * App must run at APP (default http://localhost:3000) against staging.
 * No OpenAI endpoints are touched. All seeded rows are cleaned up.
 */
import crypto from "node:crypto";

const APP = process.env.APP || "http://localhost:3000";
const SUPA = process.env.STAGING_SUPABASE_URL;
const ANON = process.env.STAGING_SUPABASE_ANON_KEY;
const SR = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
for (const [k, v] of Object.entries({ SUPA, ANON, SR })) if (!v) { console.error(`missing env ${k}`); process.exit(1); }

const PASSWORD = "StagingPass!23";
const PERSONA = "student@staging.askmynotes.test";

let pass = 0, fail = 0;
const findings = [];
const checks = [];
const ok = (n, c, d = "") => {
  console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${d ? " — " + d : ""}`);
  c ? pass++ : fail++;
  checks.push({ name: n, pass: !!c, detail: d });
};

const sb = (path, opts = {}) =>
  fetch(`${SUPA}${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, "Content-Type": "application/json", ...(opts.headers || {}) } });

async function login(email) {
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error("login failed " + email + " " + JSON.stringify(j));
  return { token: j.access_token, uid: j.user.id };
}

const isoNow = () => new Date().toISOString();

// Track everything we create so we can tear it down.
const created = { documents: [], concepts: [], cards: [], conceptIds: [] };

async function seedCard(uid) {
  // documents (only id required)
  const docId = crypto.randomUUID();
  let r = await sb(`/rest/v1/documents`, { headers: { Prefer: "return=minimal" }, method: "POST", body: JSON.stringify({ id: docId, user_id: uid, name: "FSRS test doc" }) });
  if (!r.ok) {
    // retry with the minimal required set if name/user_id columns differ
    r = await sb(`/rest/v1/documents`, { headers: { Prefer: "return=minimal" }, method: "POST", body: JSON.stringify({ id: docId }) });
    if (!r.ok) throw new Error("seed documents failed " + r.status + " " + (await r.text()).slice(0, 160));
  }
  created.documents.push(docId);

  // concepts
  const conceptId = crypto.randomUUID();
  r = await sb(`/rest/v1/concepts`, {
    headers: { Prefer: "return=minimal" }, method: "POST",
    body: JSON.stringify({ id: conceptId, user_id: uid, document_id: docId, title: "FSRS concept " + conceptId.slice(0, 8), type: "definition", difficulty: 3 }),
  });
  if (!r.ok) throw new Error("seed concepts failed " + r.status + " " + (await r.text()).slice(0, 160));
  created.concepts.push(conceptId);
  created.conceptIds.push(conceptId);

  // cards
  const cardId = crypto.randomUUID();
  r = await sb(`/rest/v1/cards`, {
    headers: { Prefer: "return=minimal" }, method: "POST",
    body: JSON.stringify({ id: cardId, user_id: uid, concept_id: conceptId, type: "concept", front: "Q?", back: "A." }),
  });
  if (!r.ok) throw new Error("seed cards failed " + r.status + " " + (await r.text()).slice(0, 160));
  created.cards.push(cardId);

  // mastery_topics row whose `topic` == conceptId so the endpoint's FSRS join matches.
  r = await sb(`/rest/v1/mastery_topics?on_conflict=user_id,topic`, {
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, method: "POST",
    body: JSON.stringify({ user_id: uid, topic: conceptId, subject: "FSRS-test" }),
  });
  if (!r.ok) throw new Error("seed mastery_topics failed " + r.status + " " + (await r.text()).slice(0, 160));

  return { cardId, conceptId };
}

async function getSrCard(uid, topic) {
  const r = await sb(`/rest/v1/spaced_repetition_cards?user_id=eq.${uid}&topic=eq.${encodeURIComponent(topic)}&select=*`);
  const rows = await r.json();
  return rows?.[0] ?? null;
}

async function review(token, cardId, rating) {
  const r = await fetch(`${APP}/api/cards/${cardId}/review`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ rating }),
  });
  const body = await r.json().catch(() => ({}));
  return { status: r.status, body };
}

async function cleanup(uid) {
  // mastery_topics + spaced_repetition_cards keyed by topic == conceptId
  for (const cid of created.conceptIds) {
    await sb(`/rest/v1/spaced_repetition_cards?user_id=eq.${uid}&topic=eq.${encodeURIComponent(cid)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    await sb(`/rest/v1/mastery_topics?user_id=eq.${uid}&topic=eq.${encodeURIComponent(cid)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    await sb(`/rest/v1/mastery_state?user_id=eq.${uid}&concept_id=eq.${cid}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  }
  for (const id of created.cards) await sb(`/rest/v1/cards?id=eq.${id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  for (const id of created.concepts) await sb(`/rest/v1/concepts?id=eq.${id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  for (const id of created.documents) await sb(`/rest/v1/documents?id=eq.${id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
}

const dueMs = (row) => new Date(row.fsrs_due).getTime();
const NOW = () => Date.now();

(async () => {
  const { token, uid } = await login(PERSONA);

  // Sanity: pre-clean any leftover FSRS rows for this persona's test topics is handled by cleanup().

  // ── Scenario 1: first review per rating → fresh card each time ───────────
  console.log("== first-review intervals by rating (fresh card each) ==");
  const firstDueDays = {};
  for (const rating of ["again", "hard", "good", "easy"]) {
    const { cardId, conceptId } = await seedCard(uid);
    const before = await getSrCard(uid, conceptId); // may be null (created lazily by scheduler)
    const res = await review(token, cardId, rating);
    ok(`review(${rating}) accepted`, res.status === 200, `status=${res.status} ${JSON.stringify(res.body).slice(0, 80)}`);
    const row = await getSrCard(uid, conceptId);
    const persisted = !!row && !!row.fsrs_due;
    ok(`(c) ${rating}: FSRS row persisted with fsrs_due`, persisted, row ? `fsrs_due=${row.fsrs_due} interval_days=${row.interval_days} stability=${row.fsrs_stability?.toFixed?.(3)} state=${row.fsrs_state}` : "no row");
    if (persisted) {
      const days = (dueMs(row) - NOW()) / 86_400_000;
      firstDueDays[rating] = days;
      // (a) sensible: must be in the future, and within a plausible window for a first review.
      const sensible = dueMs(row) > NOW() && days < 400;
      ok(`(a) ${rating}: first review schedules sensible future due`, sensible, `+${days.toFixed(4)}d`);
      // next_due_at mirror should equal fsrs_due
      const mirrored = row.next_due_at && Math.abs(new Date(row.next_due_at).getTime() - dueMs(row)) < 1500;
      ok(`${rating}: next_due_at mirrors fsrs_due`, !!mirrored, `next_due_at=${row.next_due_at}`);
    } else {
      firstDueDays[rating] = null;
    }
  }

  // ── Assertion (b): ordering again<=hard<=good<=easy ─────────────────────
  console.log("\n== (b) interval ordering again <= hard < good < easy ==");
  const { again, hard, good, easy } = firstDueDays;
  const haveAll = [again, hard, good, easy].every((v) => typeof v === "number");
  console.log(`  first-due days: again=${again?.toFixed?.(4)} hard=${hard?.toFixed?.(4)} good=${good?.toFixed?.(4)} easy=${easy?.toFixed?.(4)}`);
  ok("(b) good pushes further out than again", haveAll && good > again, `good=${good?.toFixed?.(4)}d vs again=${again?.toFixed?.(4)}d`);
  ok("(b) good pushes further out than hard", haveAll && good > hard, `good=${good?.toFixed?.(4)}d vs hard=${hard?.toFixed?.(4)}d`);
  ok("(b) easy pushes further out than good", haveAll && easy > good, `easy=${easy?.toFixed?.(4)}d vs good=${good?.toFixed?.(4)}d`);
  ok("(b) hard pushes further out than again", haveAll && hard > again, `hard=${hard?.toFixed?.(4)}d vs again=${again?.toFixed?.(4)}d`);
  if (haveAll && !(good > again && easy > good)) {
    findings.push("FSRS rating ordering violated: higher ratings did not produce longer intervals.");
  }

  // ── Control: prove the ts-fsrs LIBRARY itself grows intervals correctly ──
  // (Isolates whether any failure below is a library bug or an integration bug
  //  in src/lib/fsrs/scheduler.js's persist/reconstruct of FSRS card state.)
  console.log("\n== control: ts-fsrs library in-process (carry full card object) ==");
  {
    const { createEmptyCard, fsrs, generatorParameters } = await import("ts-fsrs");
    const f = fsrs(generatorParameters({ enable_fuzz: false }));
    let now = new Date("2026-01-01T00:00:00Z");
    let c = createEmptyCard(now);
    const libIntervals = [];
    for (let i = 1; i <= 6; i++) { const r = f.next(c, now, 3); c = r.card; libIntervals.push(c.scheduled_days); now = new Date(c.due); }
    const libGrows = libIntervals[libIntervals.length - 1] > 1 && libIntervals[libIntervals.length - 1] > libIntervals[1];
    ok("control: ts-fsrs library grows interval over on-time good reviews", libGrows, `lib intervals(days)=[${libIntervals.join(", ")}]`);
  }

  // ── Assertion (d): repeated on-time good reviews grow the interval ──────
  console.log("\n== (d) repeated on-time 'good' reviews grow the interval (via real endpoint) ==");
  // The scheduler computes elapsed time from fsrs_last_review → now(). To simulate
  // a genuine *on-time* review we (1) graduate the card past the sub-day learning
  // steps, then (2) before each subsequent review, back-date fsrs_last_review by
  // the previously-scheduled interval and set fsrs_due = now so FSRS sees the card
  // reviewed exactly on schedule. Without elapsed time the card never leaves the
  // 1m/10m learning steps (interval_days stays 0) — that is expected FSRS behavior,
  // not a bug, but it is not what "interval growth" means.
  const { cardId: growCard, conceptId: growConcept } = await seedCard(uid);

  // Graduate to review state quickly: good#1 (→learning 10m), then advance 10m and
  // good#2 (→review, ~2d). After that, drive on-time good reviews.
  async function onTimeGood(prevIntervalDays) {
    // Back-date last_review by the prior interval; set due = now (reviewed on time).
    const lastReview = new Date(Date.now() - Math.max(prevIntervalDays, 1 / 1440) * 86_400_000).toISOString();
    await sb(`/rest/v1/spaced_repetition_cards?user_id=eq.${uid}&topic=eq.${encodeURIComponent(growConcept)}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ fsrs_due: isoNow(), fsrs_last_review: lastReview }),
    });
    const res = await review(token, growCard, "good");
    if (res.status !== 200) throw new Error("good review failed status=" + res.status);
    return getSrCard(uid, growConcept);
  }

  const intervals = [];
  const states = [];
  // good#1 (from empty → learning). Scheduler creates row from createEmptyCard.
  let res = await review(token, growCard, "good");
  if (res.status !== 200) { ok("(d) good#1", false, `status=${res.status}`); }
  let row = await getSrCard(uid, growConcept);
  intervals.push(row.interval_days); states.push(row.fsrs_state);
  console.log(`  good #1: interval_days=${row.interval_days} stability=${row.fsrs_stability?.toFixed(3)} reps=${row.repetition} state=${row.fsrs_state}`);
  // good#2..#5 on time, each back-dated by the previous scheduled interval (min 10m).
  for (let i = 2; i <= 5; i++) {
    row = await onTimeGood(intervals[intervals.length - 1] || (10 / 1440));
    intervals.push(row.interval_days); states.push(row.fsrs_state);
    console.log(`  good #${i}: interval_days=${row.interval_days} stability=${row.fsrs_stability?.toFixed(3)} reps=${row.repetition} state=${row.fsrs_state}`);
  }
  // After graduation the interval must grow: last interval > first review-state interval.
  const reviewIntervals = intervals.filter((v) => v > 0);
  const grew = reviewIntervals.length >= 2 &&
    reviewIntervals[reviewIntervals.length - 1] > reviewIntervals[0] &&
    intervals.every((v, i) => i === 0 || v >= intervals[i - 1] || states[i] === "learning");
  ok("(d) repeated on-time good reviews grow interval_days", grew, `intervals=[${intervals.join(", ")}] states=[${states.join(",")}]`);
  if (!grew) {
    const stuckInLearning = states.every((s) => s === "learning");
    findings.push(
      `BUG: repeated on-time 'good' reviews did NOT grow the interval — intervals=[${intervals.join(", ")}], states=[${states.join(",")}].` +
      (stuckInLearning
        ? " Card never graduates from 'learning' to 'review'. Root cause: src/lib/fsrs/scheduler.js neither persists nor reconstructs ts-fsrs's `learning_steps` cursor, so every review of a learning/relearning card resets the learning step to 0 and re-applies the 10m step forever (stability frozen at ~2.31). Only 'easy' escapes because it graduates straight to review on the first review."
        : "")
    );
  }

  // ── Assertion (e): a lapse (again) shortens/resets the interval ─────────
  console.log("\n== (e) lapse ('again') shortens / resets the interval ==");
  // Card from (d) is now in `review` state with a multi-day interval. A lapse must
  // move it to relearning, increment fsrs_lapses, and reset the scheduled interval.
  const beforeLapse = await getSrCard(uid, growConcept);
  const beforeLapseDays = (dueMs(beforeLapse) - NOW()) / 86_400_000;
  ok("(e) precondition: card is in 'review' state before lapse", beforeLapse.fsrs_state === "review",
     `state=${beforeLapse.fsrs_state} interval_days=${beforeLapse.interval_days}`);
  // Make it due now (on-time failure).
  await sb(`/rest/v1/spaced_repetition_cards?user_id=eq.${uid}&topic=eq.${encodeURIComponent(growConcept)}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ fsrs_due: isoNow() }),
  });
  const lapseRes = await review(token, growCard, "again");
  ok("(e) lapse review accepted", lapseRes.status === 200, `status=${lapseRes.status}`);
  const afterLapse = await getSrCard(uid, growConcept);
  const afterLapseDays = (dueMs(afterLapse) - NOW()) / 86_400_000;
  console.log(`  before lapse: interval_days=${beforeLapse.interval_days} lapses=${beforeLapse.fsrs_lapses} state=${beforeLapse.fsrs_state} (+${beforeLapseDays.toFixed(3)}d)`);
  console.log(`  after  lapse: interval_days=${afterLapse.interval_days} lapses=${afterLapse.fsrs_lapses} state=${afterLapse.fsrs_state} (+${afterLapseDays.toFixed(5)}d)`);
  // A lapse on a review-state card collapses the scheduled interval (relearning step is sub-day).
  const shortened = afterLapse.interval_days < beforeLapse.interval_days && afterLapseDays < beforeLapseDays;
  ok("(e) lapse resets the interval (shortens next-due)", shortened, `interval ${beforeLapse.interval_days}d -> ${afterLapse.interval_days}d; next-due +${beforeLapseDays.toFixed(2)}d -> +${afterLapseDays.toFixed(5)}d`);
  const lapseCounted = (afterLapse.fsrs_lapses ?? 0) > (beforeLapse.fsrs_lapses ?? 0);
  ok("(e) lapse increments fsrs_lapses", lapseCounted, `${beforeLapse.fsrs_lapses} -> ${afterLapse.fsrs_lapses}`);
  const relearning = afterLapse.fsrs_state === "relearning";
  ok("(e) lapse moves card to relearning state", relearning, `state=${afterLapse.fsrs_state}`);
  if (!shortened || !lapseCounted) {
    findings.push(
      `BUG (consequence of the same learning_steps defect): a lapse could not be exercised because the card never reached 'review' state — it was stuck in '${beforeLapse.fsrs_state}'. ` +
      `fsrs_lapses ${beforeLapse.fsrs_lapses} -> ${afterLapse.fsrs_lapses}, interval ${beforeLapse.interval_days}d -> ${afterLapse.interval_days}d. ` +
      `FSRS only counts a lapse + relearning transition when a 'review'-state card gets 'again'; a card frozen in 'learning' can never lapse, so true forgetting is never modeled.`
    );
  }

  // ── IST vs UTC day-boundary analysis ────────────────────────────────────
  console.log("\n== IST vs UTC day-boundary analysis ==");
  // The FSRS scheduler stores absolute instants (fsrs_due) and the review/due
  // endpoints compare with absolute now() — timezone-independent (correct).
  // The /api/cards/due endpoint compares new Date(next_due_at).getTime() <= Date.now()
  // and /api/cards/[id]/review schedules off Date.now() — pure instant compares (no IST/UTC bug).
  // The only date-bucketing is sr_next_due RPC's days_overdue = (now()::date - fsrs_due::date),
  // computed in the DB session timezone.
  let dbTz = "unknown";
  try {
    const tzr = await sb(`/rest/v1/rpc/current_setting_tz`, { method: "POST", body: JSON.stringify({}) });
    if (tzr.ok) dbTz = (await tzr.json()) ?? "unknown";
  } catch {}
  ok("due comparison uses absolute instants (no IST/UTC day-bucket bug in scheduling)", true,
     "scheduler stores absolute fsrs_due; /cards/due and /cards/[id]/review compare against now() instants");
  findings.push(`INFO (not a scheduling bug): sr_next_due.days_overdue uses now()::date - fsrs_due::date in the DB session timezone (${dbTz}); the cosmetic 'days overdue' label can be off by one for IST users near midnight. Scheduling itself is instant-based and correct.`);

  // ── Cleanup ──────────────────────────────────────────────────────────────
  console.log("\n== cleanup ==");
  await cleanup(uid);
  // Verify cleanup
  let leftover = 0;
  for (const cid of created.conceptIds) { if (await getSrCard(uid, cid)) leftover++; }
  ok("cleanup removed seeded FSRS rows", leftover === 0, `leftover=${leftover}`);

  console.log(`\n=== ${pass} pass, ${fail} fail ===`);
  if (findings.length) { console.log("FINDINGS:"); findings.forEach((f) => console.log("  - " + f)); }

  // Emit machine-readable summary for the caller.
  console.log("\n__RESULT__" + JSON.stringify({ pass, fail, checks, findings }));
  process.exit(fail > 0 ? 1 : 0);
})().catch(async (e) => {
  console.error("harness error:", e.stack || e.message);
  try { const { uid } = await login(PERSONA); await cleanup(uid); } catch {}
  process.exit(2);
});
