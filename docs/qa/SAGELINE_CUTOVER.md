# SageLine — Hardening Status & Cutover Plan (2026-07-03)

Companion to `SAGELINE_PHASE0_INVENTORY_2026-07-03.md` (baseline) and
`docs/superpowers/plans/2026-07-03-sageline-phase0-3.md` (build plan).

## What shipped

| Layer | Where | Verified by |
|---|---|---|
| Schema | `20260703000001_sageline.sql` — sessions/turns/summaries, RLS, `audio_latency_ms`, `language_detected[]` | migration review; apply to prod pending |
| State machine | `src/lib/sageline/stateMachine.js` (+ prompt, sentence splitter, end-intent) | `tests/unit/sageline.test.mjs` |
| Routes | `/api/sageline/{start,turn,speak,end,session/[id]}` | build + unit-covered logic; live-call pass pending |
| Call loop | `src/lib/sageline/useSageLineCall.js` — adaptive VAD (750ms/1500ms), barge-in (250ms), distracted re-engagement (25s), per-sentence TTS queue, latency capture | founder device test pending (no mic in build env) |
| UI | `/sageline` — connecting → live (orb + live transcript) → wrapping up → summary card (misconceptions, "N cards added", replay transcript) | build + screenshots pending (signup bug blocks authed capture) |
| Entry points | Dashboard card, ExamsSidebar, VoiceCallSection — flag-switched | build |
| SRS | `end` route inserts ≤5 items into `spaced_repetition_cards` (bigint ids) and links them in `generated_srs_card_ids` | code review; live pass pending |

## Adversarial checklist (spec §2.6.4)

| Scenario | Mechanism | Status |
|---|---|---|
| Student silent 2 min mid-call | 25s distracted threshold → templated re-engagement line (no STT round-trip); call never hangs in `listening` | code-verified; live pass pending |
| Connection drops + reconnect | `GET /api/sageline/session/[id]` returns session + turns; client resumes by id | code-verified |
| Two languages in one sentence | Whisper runs UNPINNED (auto-detect); prompt instructs mirroring the student's mix; `language_detected[]` accumulates per turn | live pass pending — **test Hinglish explicitly** |
| Extend past rate limit | `turn` recomputes elapsed vs plan `maxDurationSecs` server-side → 410 `max_duration_reached`; client wraps up gracefully | code-verified |
| Concurrent calls, two devices | `start` returns the live session (< 90 min, unended) instead of creating a second — no double spend | code-verified |
| Cost per call | `recordAISpend` logs whisper secs + tokens + TTS chars per session (pre-existing infra) | shipped since day one |

## Latency measurement (the actual bar)

- Every student turn stores `audio_latency_ms` = VAD endpoint → first response
  audio `play()`, measured client-side, written with the turn row.
- Read percentiles: `select percentile_cont(0.5) within group (order by audio_latency_ms), percentile_cont(0.9) within group (order by audio_latency_ms) from sageline_transcript_turns where audio_latency_ms is not null;`
- Expectation set in the inventory: pipelined HTTP stack lands ~1.5–2.5s to
  first audio. **If founder wants <800ms, the decision is the OpenAI Realtime
  API (~10× per-minute) — same vendor, flagged, not silently switched.**

## Cutover plan (ground rule 3)

1. Apply the sageline migration to prod. Flag stays **off** (`NEXT_PUBLIC_FEATURE_SAGELINE_V2=0` or unset → default OFF).
2. Set the flag to `1` in a preview deployment / for internal accounts only; founder runs the full journey on a real phone: dashboard → SageLine card → call → interrupt mid-sentence → go silent 30s → speak Hinglish → hit duration cap → summary → check review queue → back → settings → logout.
3. Watch for one week: `audio_latency_ms` p50/p90, `ai_spend` per session vs old `/call-tutor` sessions, `sageline_sessions.state='failed'` rate.
4. Cut over: flip flag to `1` in prod env → entry points switch instantly (label + route). Old `/call-tutor` remains reachable by URL as fallback.
5. Rollback = set flag to `0` (+ redeploy for the inlined client value). No data risk — separate tables, old flow untouched.
6. After 30 clean days: retire `/call-tutor` + `/api/voice/*` in a separate removal PR (not before — half-dead code is fine, half-migrated naming is not: all NEW identifiers are already sageline-only).

## Known limits / debt

- Backchannel is prompt-level (model opens with a short acknowledgment that
  speaks first via the sentence pipeline) — no pre-recorded ack clips yet.
- TTS voice is `nova` for all languages; Hindi output is intelligible but a
  language-tuned voice choice is a polish item.
- `/api/voice/speak` still ignores its `language` param (old flow, unchanged
  by design — punch-list #3, dies with the old flow at step 6).
- Live-call verification (latency, barge-in feel, code-switching) cannot run
  in the build environment — founder device pass is the gate for step 4.
