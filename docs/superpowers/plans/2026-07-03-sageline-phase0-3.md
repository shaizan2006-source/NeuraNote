# SageLine Rebuild + Sitewide UX Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Phase 0 sitewide fixes independently, then rebuild Voice Tutor as **SageLine** — state-machine-driven, RAG-grounded, Socratic, latency-instrumented, multilingual — behind `NEXT_PUBLIC_FEATURE_SAGELINE_V2`, leaving `/call-tutor` untouched until cutover.

**Architecture:** Baseline inventory at `docs/qa/SAGELINE_PHASE0_INVENTORY_2026-07-03.md` (read it first — it corrects the WebRTC assumption). SageLine keeps the OpenAI HTTP pipeline but pipelines it: adaptive VAD (~750ms endpoint) → whisper auto-language → streamed LLM over SSE with sentence events → client TTS-per-sentence with sequential playback queue → voice barge-in via the live analyser. Server owns the conversation state machine; every turn writes a transcript row with `audio_latency_ms`.

**Tech Stack:** Existing only — OpenAI (whisper-1, gpt-4o-mini, tts-1), Supabase, `voiceLimits`/`aiSpend` reused, SSE helpers reused. **No new vendors.** The <800ms bar requires the OpenAI Realtime API (~10× per-minute cost) — flagged as a founder decision in the inventory; this build ships the measurement + isolation so that decision is data-driven.

## Global Constraints

- Additive migrations only; old `voice_*` routes and `/call-tutor` stay functional until founder cutover.
- Naming: **SageLine** everywhere new (`/sageline`, `/api/sageline/*`, `sageline_*` tables). No new "voice_tutor" identifiers. Positioning copy: "SageLine picks up the phone and actually teaches you."
- Design system: tokens only, inline SVG, no new deps, motion 120–280ms + reduced-motion, warm/calm (care-pillar), no clinical look.
- Gates per phase: `npm run build` clean, `node scripts/grep-gate.mjs` green, unit suite green. Live-call latency numbers CANNOT be measured in this environment (no mic/browser) — instrumentation ships, founder measures.
- RLS on all new tables in the same migration.
- Spec adaptations (locked): `chapter_id` → `document_id references documents(id)`; "VAANI" headers read as SageLine; conversation states per spec + `reengaging` sub-behavior handled inside `questioning`.

---

## PHASE 0 — sitewide fixes (ship independently)

### Task 0.1: Account access on the dashboard + avatar upload fix

**Files:** Modify `src/components/Dashboard/GreetingRow.jsx`, `src/components/ui/UserProfile.jsx`

- [ ] `GreetingRow`: pull `user` from `useDashboard()`, render `<UserProfileButton user={user} />` at the END of the right-side action cluster (top-right pattern — same as Sage; no third pattern).
- [ ] `UserProfile.jsx` ProfileModal: fix upload path `avatars/${user.id}.${ext}` → `${user.id}/avatar.${ext}` (own-folder storage RLS; matches AccountSection).
- [ ] `UserProfile.jsx`: drop the misleading "Add another account" item (punch-list #6) — no multi-account support exists.
- [ ] Build + commit.

### Task 0.2: SlumpMode earns its place (§1.2 option a)

**Files:** Modify `src/components/dashboard/modes/SlumpMode.jsx`

- [ ] Keep the existing real signals (14–17h window AND nothing studied today — from `determineDashboardMode`). Add: dismiss button ("Not today") → `localStorage.amn_slump_dismissed = "YYYY-MM-DD"`; banner renders only when the stored date ≠ today. Once per session is inherent (banner, mounted once). No timer-only path remains.
- [ ] Build + commit.

### Task 0.3: Dead-end screens get explicit exits; legacy cleanup

**Files:** Modify `src/app/study/page.jsx`, `src/app/focus/page.jsx`, `src/app/exams/page.jsx`, `src/app/pyqs/page.js`, `src/app/chat/page.js`, `src/app/call-tutor/page.js`

- [ ] Add a persistent "← Dashboard" control (call-tutor top-bar pattern, tokens only) to `/study`, `/exams`, `/pyqs` headers; `/focus` gets it on the non-active-session view only (never overlay the live focus surface).
- [ ] `/chat` (legacy, unlinked, no shell): replace page body with `redirect("/sage")` via `next/navigation`.
- [ ] `/call-tutor`: remove the 800ms auto-start effect — call starts on orb tap only (stops burning a rate-limited call + mic prompt on accidental nav). This is a bug fix to the LIVE feature, not part of the rebuild.
- [ ] Build + grep gate + commit. Update the site-map table in the inventory doc with the fixes applied.

---

## PHASE 1 — SageLine engine (server first)

### Task 1.1: Schema

**Files:** Create `supabase/migrations/20260703000001_sageline.sql`

- [ ] Three tables exactly as spec §2.4 with adaptations: `chapter_id` → `document_id UUID REFERENCES documents(id) ON DELETE SET NULL`; add `state` check list + `failed`; `sageline_transcript_turns.audio_latency_ms INT` (instrumented from day one); `sageline_session_summaries.generated_srs_card_ids UUID[]`. RLS: sessions `user_id = auth.uid()` all ops; child tables via `EXISTS` join on sessions. Indexes: sessions(user_id), turns(session_id), turns(session_id, turn_index).
- [ ] Commit.

### Task 1.2: State machine lib (TDD)

**Files:** Create `src/lib/sageline/stateMachine.js`, `tests/unit/sageline.test.mjs`

- [ ] Failing tests first: allowed transitions table —
  `connecting→[greeting,failed]`, `greeting→[questioning,ended,failed]`,
  `questioning→[clarifying,wrapping_up,ended,failed]`, `clarifying→[questioning,wrapping_up,ended,failed]`,
  `wrapping_up→[ended,failed]`, terminal `ended|failed`. `canTransition(from,to)`, `nextStateForTurn({state, endIntent, confused, turnIndex, maxTurns})` (pure decision fn: confused→clarifying; endIntent or turnIndex≥maxTurns→wrapping_up; clarifying resolves→questioning).
- [ ] Also in lib (tested): `splitSentences(buffer)` — returns complete sentences + remainder (handles `.`, `?`, `!`, Devanagari danda `।`, min length guard, decimals); `detectEndIntent(text)` (multilingual bye/that's-all phrases); `SAGELINE_SYSTEM_PROMPT({studentName, docName, ragContext, languageHint})` — Socratic-first rules (guide with questions before answers, catch misconceptions, mirror the student's language mix incl. Hinglish code-switching, spoken-audio style, short turns, open each reply with a brief natural acknowledgment — the prompt-level backchannel), session structure (warm opener → oral questioning on the chosen document → wrap-up), `[END_CALL]`/`[WRAP_UP]` sentinels.
- [ ] Tests pass → commit.

### Task 1.3: Routes

**Files:** Create `src/app/api/sageline/start/route.js`, `src/app/api/sageline/turn/route.js`, `src/app/api/sageline/speak/route.js`, `src/app/api/sageline/end/route.js`, `src/app/api/sageline/session/[id]/route.js`; Modify `src/lib/featureFlags.js` (+`SAGELINE_V2`), `.env.example`

- [ ] `start`: flag gate + `verifyAuth` + `canStartCall` + budget breaker (identical to voice/start). Body `{document_id?}`. **Concurrency guard (§2.6.4): if an unended session exists for this user newer than 90 min, return it (resume) instead of creating a second.** Insert `sageline_sessions` (state `connecting`→`greeting` after greeting text generated). Returns `{session, limits, todayCount, greetingText}` — greeting is templated (no LLM call): warm opener + doc name.
- [ ] `turn`: multipart `{audio, session_id, client_latency_ms?}`. Ownership + `sessionActive`-style checks (state not terminal; `started_at + maxDurationSecs` not exceeded — server-side duration enforcement). Whisper with **no language pin** (auto-detect; code-switch friendly); append `response.language` to `sessions.language_detected` if new. RAG: embed transcript → `match_documents` scoped to the session's `document_id` (skip when none). State machine decides next state; persist student turn row (with `audio_latency_ms` from client measurement of previous turn). Stream SSE: `{type:"transcript", text, language}` → `{type:"state", state}` → token events → `{type:"sentence", text, index}` as `splitSentences` yields → final `{type:"turn_done", endCall, turn_id}`. Persist assistant turn row after stream; recordAISpend.
- [ ] `speak`: same as voice/speak (tts-1 nova) but accepts `{text, session_id}`, verifies session ownership, caps 500 chars/sentence call.
- [ ] `end`: sets `ended_at`, `duration_seconds`, state→`ended` (or `failed` with reason). Generates summary + `misconceptions_caught[]` (single gpt-4o-mini JSON call over the stored transcript rows — server data, not client-supplied), inserts ≤5 rows into `cards` (front/back from misconceptions/key points, `metadata: {source:"sageline", session_id}`), writes `sageline_session_summaries` with `generated_srs_card_ids`. Returns the summary payload.
- [ ] `session/[id]` GET: resume payload (session + turns) for reconnect (§2.6.4 drop/reconnect).
- [ ] Build + unit suite + commit.

## PHASE 2 — SageLine UI

### Task 2.1: Call client hook

**Files:** Create `src/lib/sageline/useSageLineCall.js`

- [ ] Owns the call loop: mic + analyser (reuse call-tutor patterns), **adaptive VAD**: endpoint at 750ms sustained silence (was 1600), but extend to 1500ms when the last transcript chunk ends mid-thought (trailing filler words/conjunctions list) — thinking-vs-done. **Distracted threshold**: 25s of continuous silence in `listening` → re-engagement prompt turn (templated line, no STT round-trip). **Barge-in**: while `speaking`, keep VAD ticking; sustained voice ≥250ms → pause playback queue, flush pending TTS, switch to `listening`. **Latency instrumentation**: `t0` = VAD endpoint, `t1` = first audio `play()` → `client_latency_ms` sent with the next turn. Playback queue: per-sentence fetches to `/api/sageline/speak`, sequential `<audio>` playback, first sentence fetched as soon as its SSE event arrives.
- [ ] Commit (verified by build + Phase 2.2 usage; live-audio behavior is founder-verified).

### Task 2.2: `/sageline` page — phone-call UI

**Files:** Create `src/app/sageline/page.js`, `src/app/sageline/layout.js`; Modify entry points `src/components/dashboard/StudyModeCards.jsx`, `src/components/exams/ExamsSidebar.jsx` (flag-switched href + label)

- [ ] Call states as a call: **Connecting** (dial pulse) → **Live** (orb + analyser waveform + scrolling live transcript beneath — reuse call-tutor's rAF orb, tokens only) → **Wrapping up** → **Ended** (summary card: session summary, misconceptions caught, "N cards added to your review queue", replay transcript accordion, "Call again", ← Dashboard). Persistent top bar: ← Dashboard + "SageLine" + LIVE timer + remaining-minutes chip (from limits — surfaced BEFORE start per §2.5). Explicit tap-to-start; document picker (active PDF default).
- [ ] Copy: positioning line on the idle screen. Warm/calm palette from tokens; respects reduced-motion.
- [ ] Entry points: when `FLAGS.SAGELINE_V2` — dashboard card + ExamsSidebar route to `/sageline` with "SageLine" label; flag off → old `/call-tutor` unchanged.
- [ ] Build + grep gate + commit.

## PHASE 3 — hardening + cutover

- [ ] Adversarial (documented in `docs/qa/`, executed where env allows): 2-min silence → re-engagement (client logic test); reconnect resumes via `session/[id]`; same-user second device → start returns the live session (no double spend); rate-limit extension → server duration check on `turn`; concurrent-day cap unchanged via `canStartCall`.
- [ ] Cutover doc: flag stays default-OFF in prod → founder enables for internal accounts → watch `audio_latency_ms` percentiles + `ai_spend` per session for a week → widen. Rollback = unset flag (entry points revert to /call-tutor instantly; no data loss — separate tables).
- [ ] Full journey re-test list (dashboard → call → interrupt → resume/end → back → settings → logout) for founder's device pass.
- [ ] Final gates + update memory.

## Self-Review

Spec coverage: §1.1→0.1, §1.2→0.2, §1.3/1.4→0.3+inventory, §2.1 rename→global constraint+2.2 entry points, §2.2 latency items→1.2/1.3/2.1 (bar honestly flagged), §2.3 conversation→1.2/1.3, §2.4 schema→1.1, §2.5 auth/limits/cost→1.3 (reuse), §2.6 pipeline→phase ordering, §3 UI→2.2, §4→Phase 3, §5 don'ts: no half-rename (new namespace only + flag-switched entries), no vendor swap (flagged), no copy-only popup fix (dismissal+signals), Phase 0 ships first.
