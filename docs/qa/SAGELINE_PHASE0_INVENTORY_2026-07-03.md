# SageLine + Sitewide Audit — Baseline Inventory (2026-07-03)

Everything below was read from actual files, not assumed. This is the ground-rule-1
"report what exists" deliverable, plus the §1.3 site-map and §1.4 punch list.

---

## 1. Voice Tutor — what actually exists

### Architecture (correction to prior product notes)

**The current pipeline is NOT WebRTC.** It is a serial, turn-based HTTP pipeline,
fully in-house on OpenAI:

```
Mic (MediaRecorder, webm/opus)
  → VAD stop (RMS < 0.012 sustained 1600ms, or 30s cap)      [client]
  → POST /api/voice/transcribe   whisper-1, language PINNED   [blocking]
  → POST /api/voice/respond      gpt-4o-mini, NON-streaming,
                                 max 550 tokens               [blocking]
  → POST /api/voice/speak        tts-1 "nova", full MP3
                                 buffer, no streaming         [blocking]
  → <audio> element playback
```

### Files

| Piece | File | Notes |
|---|---|---|
| Client page | `src/app/call-tutor/page.js` (978 lines) | phases: idle→connecting→greeting→listening→thinking→speaking→ended→summary — client-side only, no server state machine |
| Layout/meta | `src/app/call-tutor/layout.js` | title "Call Tutor" |
| Start route | `src/app/api/voice/start/route.js` | auth + `canStartCall` + AI-budget breaker → `voice_calls` row |
| STT | `src/app/api/voice/transcribe/route.js` | whisper-1; `LANG_MAP {en,hi,fr}` pins one language per call |
| LLM | `src/app/api/voice/respond/route.js` | generic Feynman-tutor prompt; answer-first (not Socratic); ends every turn with "Do you have any other doubts?"; `[END_CALL]` sentinel |
| TTS | `src/app/api/voice/speak/route.js` | tts-1, voice "nova"; **ignores the `language` param the client sends** |
| End | `src/app/api/voice/end/route.js` | writes duration + message COUNT; generates a summary that is returned but **never persisted** |
| Limits | `src/lib/voiceLimits.js` | per-plan calls/day + max duration; `VOICE_PROPLUS_ENABLED` flag |
| Table | `voice_calls` (20260519000007) | id, user_id, started_at, ended_at, duration_seconds, messages_count; RLS owner-read. **No transcript storage of any kind.** |

### What already meets the new spec

- Auth on every route (bearer + `supabase.auth.getUser`).
- Rate limiting per plan/day + max call duration enforced client-side from server-supplied limits.
- Monthly AI budget circuit breaker on call start.
- **Cost instrumentation already exists**: `recordAISpend` logs whisper seconds, LLM tokens, TTS characters per user (§2.5 requirement — done).
- Mic-level waveform visualization (analyser-driven orb + 7 bars).

### Gaps vs Section 2 bar

| Requirement | Current state |
|---|---|
| <800ms turn latency | Architecturally impossible today: 1.6s VAD wait alone is 2× the whole budget; every hop is blocking and unstreamed. Realistic current turn: **~5–12s** (VAD 1.6s + upload + whisper 1–2.5s + full 550-token completion 2–6s + full TTS synth 1–3s + MP3 download). No timing is measured anywhere. |
| Interruption | Tap-the-orb only. No voice barge-in — the mic analyser runs but is not monitored during `speaking`. |
| Smart silence | Single fixed 1.6s cutoff. No thinking-vs-done distinction, no re-engagement on long silence. |
| Backchannel | None. |
| Code-switching | Opposite: language is a pre-call toggle (en/hi/fr) and Whisper is pinned to it. Hinglish mid-call switching is actively suppressed. |
| Socratic | Prompt is answer-first ("answer the student's doubt thoroughly"). |
| RAG grounding | None — generic knowledge only. (Infra exists elsewhere: `src/lib/rag.js`, `match_documents` RPC, `document_chunks`.) |
| Transcript persistence | None (count only). |
| Session summary → SRS | Summary generated but not stored; no card generation. SRS infra exists: `cards` + `mastery_state` tables, ts-fsrs, `/api/cards/*`. |
| State machine | Client-implicit only. |

### Latency verdict (honest numbers, flagged per ground rule 5)

With the current HTTP vendor architecture, sub-800ms **cannot be reached**: a
single Whisper HTTP round-trip on a real uplink is typically 800ms–2s by itself.
What in-vendor optimization CAN deliver (no vendor decision needed):

- Adaptive VAD (~750ms endpoint instead of 1600ms)
- Streamed LLM + sentence-chunked TTS pipelining (first sentence speaks while the rest generates)
- Voice barge-in, instant backchannel acks
- → **~1.5–2.5s to first audio**, perceived much faster due to backchannel + barge-in.

True <800ms speech-to-speech requires **OpenAI Realtime API over WebRTC** — same
vendor (OpenAI), different API and price class (~10× per-minute cost of the
current pipeline). **Founder decision required**; Phase 1 below ships the
instrumentation (`audio_latency_ms` per turn) so the decision is made on real
numbers, and the architecture isolates the transport so Realtime can slot in.

### Entry points to the feature (rename scope)

- `/call-tutor` route; `CallTutorCard` in `StudyModeCards.jsx` → `BentoGrid.jsx` (dashboard)
- `ExamsSidebar.jsx` "Call Tutor" nav item
- `VoiceCallSection.jsx` (dashboard component)
- `eventRegistry.js` "Voice tutor" analytics events
- Internal: `/api/voice/*`, `voice_calls`, `voiceLimits.js`, `VOICE_PROPLUS_ENABLED`

---

## 2. Dashboard account access (§1.1)

- A complete avatar menu **already exists**: `UserProfileButton` in
  `src/components/ui/UserProfile.jsx` — avatar, name, plan, Profile modal,
  Settings, Help (→ /settings?section=support), Upgrade plan, **Log out**.
- **It is mounted on exactly one screen: `/sage`.** The dashboard has no account
  entry point and no logout: `DashboardSidebar` has no account item;
  `GreetingRow` has only ThemeToggle + Study/Progress pill.
- `/settings` has its own back-to-dashboard + Sign out (shipped 2026-07-02).

Fix direction: mount `UserProfileButton` in `GreetingRow`'s right-side action
cluster (same top-right pattern as Sage — no third pattern invented), and add it
to the other shell-less screens via their headers (see site-map).

## 3. "Tired?" popup (§1.2)

- It is `SlumpMode` (`src/components/dashboard/modes/SlumpMode.jsx`) — a
  **persistent banner** on the dashboard, not a modal.
- Trigger (`src/lib/dashboardMode.js`): `hour >= 14 && hour < 17 && !studiedToday`.
- So it already has one real signal (`studiedToday` = today's answered-questions
  count > 0) — but it shows for the entire 2–5pm window, every day, with **no
  dismissal at all**.
- Chosen outcome: **(a) make it earn its place** — keep the time-window +
  not-studied signal, add an explicit dismiss ("not today") persisted per-day in
  localStorage and respected, max once per session. No timer-only firing remains.

## 4. Site-map / navigation sweep (§1.3)

Legend: **entry** = how users reach it; **exit** = explicit in-app way back
(browser back excluded). Swept programmatically + spot-read.

| Screen | Entry | In-app exit | Account access | Verdict |
|---|---|---|---|---|
| `/dashboard` | root after login | — (is home) | ❌ none | add account menu |
| `/sage` | sidebar, cards | sidebar links | ✅ UserProfileButton | OK |
| `/progress` | sidebar toggle | sidebar ✓ | ❌ | account via GreetingRow fix |
| `/settings` | Sage menu only (until fix) | ← Dashboard ✓ + Sign out ✓ | n/a | OK |
| `/support` | settings link | ← Back ✓ | n/a | OK |
| `/study` | dashboard cards | ❌ **dead end** | ❌ | add back control |
| `/focus` | dashboard cards | session flows only, no persistent exit | ❌ | add back control |
| `/exams` | ExamsSidebar/cards | ❌ pushes deeper only (quiz/sage) | ❌ | add back control |
| `/pyqs` | nav | ❌ index has no back (slug + practice have ✓) | ❌ | add back control |
| `/quiz`, `/quiz/friday` | cards | ✓ | ❌ | OK (back exists) |
| `/mock-test` | cards | ✓ | ❌ | OK |
| `/brain-map` (+share) | cards | ✓ | ❌ | OK |
| `/cohort` | nav | ✓ | ❌ | OK |
| `/call-tutor` | cards, ExamsSidebar | ✓ ← Dashboard | ❌ | OK (rebuilt in Phase 1/2) |
| `/doubt/[threadId]` | doubt sidebar expand | ✓ ← Back | ❌ | OK |
| `/chat` | **unlinked legacy page** | ❌ nothing | ❌ | redirect to /sage |
| `/trial/*`, `/welcome-back`, `/onboarding` | funnels | mostly ✓ | n/a | leave (funnel pages) |
| `/admin/*` | internal | mixed | n/a | out of scope (internal) |

Modals/overlay check: ProfileModal (ESC + overlay-click + ✕ ✓), AccountDropdown
(ESC + outside-click ✓), DoubtSidebar (ESC + ✕ ✓), QuickChatDrawer (has close),
SettingsShell (✓). No missing close affordances found in overlays.

## 5. Punch list (§1.4 — found while auditing, not silently fixed)

1. **BREAKAGE (introduced by 2026-07-02 storage RLS): `ProfileModal` in
   `UserProfile.jsx` still uploads avatars to the old bucket-root path
   `avatars/{uid}.{ext}` — the new own-folder RLS policy rejects this. Avatar
   change from the Sage dropdown is broken in prod once that migration applies.**
   (Settings → Account was fixed; this second uploader was missed.)
2. `/call-tutor` **auto-starts a call 800ms after page load** — consumes one of
   the user's limited daily calls (and fires the mic permission prompt) on an
   accidental navigation. Call should start on explicit tap.
3. `/api/voice/speak` ignores the `language` the client sends.
4. Legacy `/chat` page: superseded by Sage, no nav shell, still routable.
5. `UserProfile.jsx` and `call-tutor/page.js` carry pre-redesign hardcoded hex
   (grep-gate baseline files — flagged, not fixed here).
6. "Add another account" dropdown item just routes to /login (no multi-account
   support exists) — misleading copy.
7. Two parallel profile editors exist (ProfileModal vs Settings→Account) with
   different fields (`display_name` vs `full_name` metadata keys — ProfileModal
   writes `display_name`, AccountSection writes `full_name`; greeting reads
   `full_name`). Consolidation candidate.
8. `voice/end` generates a summary with gpt-4o-mini but never stores it.

## 6. Existing infra Phase 1 will reuse

- RAG: `src/lib/rag.js` (`getRelevantChunks`), `match_documents`/`match_documents_multi` RPCs, `document_chunks` + pgvector. Content table is **`documents`** — there is no `chapters` table; the spec's `chapter_id` FK becomes `document_id uuid references documents(id)`.
- SRS: `cards` (+ `concepts`, `mastery_state`), ts-fsrs libs, `/api/cards/due|sr_due|[id]/review`.
- Cost: `src/lib/aiSpend.js` (whisperSecs/ttsChars/tokens + monthly budget breaker).
- Limits: `src/lib/voiceLimits.js` (reused as-is for SageLine).
- SSE plumbing: `src/lib/sseStream.js` + `sseParser.js`.
- Flags: `src/lib/featureFlags.js` (add `SAGELINE_V2` — `NEXT_PUBLIC_FEATURE_SAGELINE_V2`).
- Cron pattern: `cronSecretValid` routes, Vercel-dashboard scheduling.

## 7. Spec deviations flagged before building

1. **"WebRTC-based" assumption is wrong** — pipeline is HTTP turn-based (see §1).
2. **<800ms is unreachable without the OpenAI Realtime API** (same vendor, ~10×
   per-minute cost). In-vendor optimizations get ~1.5–2.5s to first audio.
   Founder decision needed; instrumentation ships first so it's made on data.
3. Spec headers say "VAANI" in two places while §2.1 mandates **SageLine** —
   SageLine used throughout.
4. `chapters(id)` FK → `documents(id)` (no chapters table exists).
5. Old flow stays at `/call-tutor` untouched; new flow ships behind
   `NEXT_PUBLIC_FEATURE_SAGELINE_V2` at `/sageline` with entry points switching
   on the flag (per ground rule 3).
