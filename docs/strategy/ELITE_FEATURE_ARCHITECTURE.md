# Elite Feature Architecture
*Implementation-grade feature specifications for the 90-day window*
*For: Ask-My-Notes solo founder execution*
*Date: May 2026*

---

## 0. How to read this

Each feature in this document is structured as a complete spec a developer (or an AI agent like Claude Code) could build from. The structure:

- **What it is** — one paragraph
- **User-facing acceptance criteria** — checklist
- **Database changes** — schemas, migrations
- **API contracts** — endpoints, request/response shapes
- **Logic and edge cases** — what could go wrong and how to handle
- **UX requirements** — screens, states, copy references
- **AI requirements** — models, prompts, cost
- **Dependencies** — what must exist before this can ship
- **Telemetry** — what to measure
- **MVP vs full version** — what to ship first vs later

The features are grouped by which sprint they live in. Sprint files (separate docs) translate these into day-by-day tasks.

---

## Sprint 1 features (Weeks 1-4)

### F1.1 — Phase 0 Foundation (Security + Observability)

#### What it is
The non-negotiable foundation work. Fixes the 2 critical security vulnerabilities, sets up error monitoring, creates 13 missing migrations, deploys CI/CD. Without this, nothing else compounds safely.

#### Acceptance criteria
- [ ] `/api/conversations` requires Bearer auth token. Returns 401 without it.
- [ ] `/api/delete-pdf` verifies `user_id` ownership before deletion.
- [ ] `/api/upload` extracts `userId` from auth token only, ignores form-data.
- [ ] `/dev/*` routes return 404 in production (`NODE_ENV !== "development"`).
- [ ] Sentry is installed and capturing errors in client + server contexts.
- [ ] Sentry dashboard shows test error within 1 hour of deploy.
- [ ] GitHub Actions runs lint + unit tests + build on every push to main.
- [ ] Build failure blocks merge.
- [ ] `/api/health` endpoint returns 200 + JSON status.
- [ ] UptimeRobot pings `/api/health` every 5 min, alerts on failure.
- [ ] All 13 missing tables have migration files in `supabase/migrations/`.
- [ ] All 3 missing RPCs (`match_documents`, `match_documents_multi`, `increment_memory_weight`) have migration files.
- [ ] Payment webhook idempotency: duplicate `payment_id` returns 200 without re-activating.
- [ ] `pg_cron` running nightly: purges `qa_cache` >7 days, purges `qa_usage` >2 days.

#### Database changes
Create migrations for the 13 tables documented in the architecture map:
- `documents`, `document_chunks`, `focus_progress`, `study_streaks`, `exams`, `pdfs_metadata`, `chat_messages`, `user_memory`, `revision_topics`, `syllabus_topics`, `daily_progress`, `pdfs`, `quizzes`

Use `supabase db dump --schema-only` to capture current production schema, then create proper version-controlled migration files matching that exact state. The migrations don't change anything in production — they document what's already there.

Add migration for `payment_id` unique constraint on `user_plans`:
```sql
ALTER TABLE user_plans ADD CONSTRAINT user_plans_payment_id_unique UNIQUE (payment_id);
```

#### API contracts
**`/api/health` (new):**
```
GET /api/health
→ 200 { "status": "ok", "version": "<git-sha>", "ts": <unix-ms> }
```

**`/api/conversations` (fix):**
```
GET /api/conversations
Headers: Authorization: Bearer <token>
→ 401 if no token
→ 200 [{conversation}, ...]  // user_id derived from token, never query param
```

**`/api/delete-pdf` (fix):**
```
DELETE /api/delete-pdf?id=<uuid>
Headers: Authorization: Bearer <token>
→ 401 if no token
→ 404 if document doesn't exist or isn't owned by user
→ 200 { "deleted": true }
```

#### Logic and edge cases
- **Sentry rate limiting:** Limit Sentry errors to 100/min to prevent runaway logging costs.
- **CI secrets:** Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` to GitHub Actions secrets.
- **Migration ordering:** Number migrations sequentially with timestamps. Document any dependencies.
- **`/dev` routes:** Use environment check in both page-level and API-level guards.

#### Telemetry
- Sentry error rate (target: <1% of requests)
- CI pass rate (target: >95%)
- UptimeRobot uptime (target: 99.9%)

#### MVP vs full
This is all MVP. There's no "full version" — it's a binary completion.

---

### F1.2 — Empty State and Activation Flow

#### What it is
The first 90 seconds of a new user's experience. Today: blank dashboard, no guidance, no feedback. New: a guided, low-pressure activation that gets the user to their first wow moment fast.

#### Acceptance criteria
- [ ] New user with 0 documents sees the empty dashboard (not the regular bento grid).
- [ ] Empty dashboard has clear 3-step layout: Upload → Brain Map → Ask.
- [ ] "Upload PDF" button is the primary CTA.
- [ ] "Try with sample" option uses a pre-uploaded JEE Physics sample.
- [ ] After upload, PDF processing status is visible (uploading → processing → extracting concepts → ready).
- [ ] Status updates via Supabase Realtime subscription on `documents.concept_extraction_status`.
- [ ] On completion: a celebration moment — Brain Map appears, "ask your first question" prompt.
- [ ] Time from signup completion to first Q&A answer: <3 minutes p50.

#### Database changes
Add column to `documents`:
```sql
ALTER TABLE documents ADD COLUMN IF NOT EXISTS processing_status TEXT
  DEFAULT 'uploading';  -- 'uploading' | 'parsing' | 'embedding' | 'extracting_concepts' | 'ready' | 'failed'
ALTER TABLE documents ADD COLUMN IF NOT EXISTS processing_progress INT DEFAULT 0;  -- 0-100
ALTER TABLE documents ADD COLUMN IF NOT EXISTS processing_error TEXT;
```

Ensure realtime is enabled on `documents` table:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE documents;
```

Set REPLICA IDENTITY for diff payloads:
```sql
ALTER TABLE documents REPLICA IDENTITY FULL;
```

#### API contracts
**`/api/process-pdf` (modify):**
During processing, update `documents.processing_status` and `processing_progress` at each phase:
1. `uploading` → 0%
2. `parsing` → 20%
3. `embedding` → 50%
4. `extracting_concepts` → 80%
5. `ready` → 100%

On failure: `processing_status = 'failed'`, `processing_error = <message>`.

**`/api/documents/sample` (new):**
```
POST /api/documents/sample
Headers: Authorization: Bearer <token>
→ 200 { "documentId": "<uuid>" }
Effect: Copies a pre-curated sample PDF to user's document library.
```

The sample PDF: JEE Physics — Chapter 1 (Rotational Mechanics, NCERT-style, ~12 pages). Stored in Supabase Storage under a system bucket.

#### Logic and edge cases
- **Upload timeout:** If `processing_status` hasn't changed in 5 minutes, set to `failed` and notify user.
- **Failed PDF:** Show "we couldn't fully process that pdf" copy from psychology execution doc, offer retry.
- **Sample re-upload:** If user already uploaded sample, don't duplicate. Show "you already have the sample — pick a different option."
- **Realtime failure fallback:** If realtime subscription unhealthy, poll `/api/documents/<id>/status` every 3s as fallback.

#### UX requirements
Empty dashboard layout (mobile + desktop):
```
[Welcome, <name>. Let's start.]

[Three numbered steps with icons]
1. Upload your first PDF
2. Watch your Brain Map appear
3. Ask your first question

[Upload PDF — primary CTA]   [Try with sample — secondary]

[Or — just look around for a minute. Soft tertiary link.]
```

PDF processing status component:
- Inline on the PDF list, replaces the "Ready" badge
- States: Uploading 23% → Parsing → Embedding → Extracting concepts → Ready ✓
- Each state has a friendly micro-explainer on hover ("Embedding means I'm learning what this PDF is about, so I can answer questions accurately")
- Total time visible (so user knows ~30-90s is normal)

Brain Map first reveal: see F1.4 spec.

#### AI requirements
None new. Existing pipeline.

#### Dependencies
- Sample PDF curated and uploaded to system bucket (1-day content task).
- Realtime subscription on `documents` table.
- F1.4 (Brain Map) for the celebration moment.

#### Telemetry
- Signup → first PDF upload time
- PDF upload → processing complete time
- PDF upload → first Q&A time
- Activation rate: % of signups who reach first Q&A within 10 minutes
- Sample PDF usage rate

#### MVP vs full
**MVP (Sprint 1):** Empty state, status feedback, sample PDF option.
**Full (Sprint 2+):** Add demo videos, onboarding walkthrough animation, onboarding emails.

---

### F1.3 — Surface Peer Percentile (Already Computed)

#### What it is
The peer percentile metric is already computed in `progressUtils.js`. It just isn't displayed anywhere. Surface it. This is a 1-day task with disproportionate retention impact.

#### Acceptance criteria
- [ ] Progress page shows peer percentile prominently.
- [ ] Dashboard "Progress Mode" shows peer percentile in the top metric strip.
- [ ] Tooltip explains: "Your percentile among Ask-My-Notes JEE/NEET aspirants this week."
- [ ] If <30 cohort members exist, show "Building your cohort..." instead of low percentile (avoid making early users feel last).
- [ ] Updates in realtime as new sessions happen.

#### Database changes
None. The metric is already computed.

#### API contracts
The existing `/api/progress/summary` already returns `peerPercentile`. Just consume it on frontend.

#### Logic and edge cases
- **Cold start:** When fewer than 30 cohort members exist, suppress the number. Show "Cohort building (47 members so far)."
- **Top 1%:** Don't display "1%" — display "Top 1%" with subtle celebration. Anti-pattern: making the top student feel like a number.
- **Bottom 5%:** Never show "Bottom 5%." Frame as "Building" or omit. Permission to grow.
- **Stale data:** If user hasn't studied in 14+ days, show ranking based on last active period with a small note.

#### UX requirements
Progress page top strip (Mode A surface, Serious Aspirant identity):
```
┌────────────────────────────────────────────────────┐
│  Top 18% of JEE 2027 cohort this week              │
│  (8,234 active members)                            │
│                                                     │
│  ▲ up from 23% last week                           │
└────────────────────────────────────────────────────┘
```

Dashboard widget (Mode B-aware, more contextual):
```
You're in the top 18% of your cohort this week.
That's 1,476 students behind you and 318 ahead.
```

Anti-pattern to avoid: showing percentile in the slump window (2-5pm). If user opens app then, the dashboard widget hides comparison and shows a softer message instead.

#### Dependencies
None. Standalone unlock.

#### Telemetry
- Click-through rate on peer percentile card
- Correlation between percentile visibility and session count (if known)

#### MVP vs full
**MVP:** Display percentile.
**Full (Sprint 2+):** Add trend over time, by subject, percentile in specific topics.

---

### F1.4 — Brain Map in Production

#### What it is
The concept graph (currently at `/dev/graph/[docId]`) becomes a first-class production feature called "Brain Map." Accessible from dashboard, full-screen, beautiful, shareable.

#### Acceptance criteria
- [ ] Brain Map link visible from dashboard sidebar.
- [ ] Brain Map page renders user's full concept graph across all documents.
- [ ] Concepts colored by mastery: mastered (bright purple), strong (medium), shaky (dim), unknown (gray).
- [ ] Click any concept node → side panel with: concept name, related concepts, SRS cards if available, "review now" CTA.
- [ ] Filter: by document, by subject, by mastery level.
- [ ] Zoom + pan controls work on touch and mouse.
- [ ] First-time user reveal: subtle animation on first Brain Map open (nodes populate sequentially).
- [ ] Snapshot export: "Share my Brain Map" generates a 1080x1920 image suitable for Instagram Story / WhatsApp Status.
- [ ] On mobile: Brain Map adapts to vertical orientation.

#### Database changes
Already have `concepts` + `concept_edges` + `mastery_state` tables. Add an index for cross-document queries:

```sql
CREATE INDEX IF NOT EXISTS concepts_user_subject_idx
  ON concepts (user_id, subject);
```

Add field for Brain Map snapshot caching:
```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS brain_map_last_snapshot_url TEXT,
  ADD COLUMN IF NOT EXISTS brain_map_last_snapshot_at TIMESTAMPTZ;
```

#### API contracts
**`/api/brain-map` (new):**
```
GET /api/brain-map
Headers: Authorization: Bearer <token>
Query: ?subject=<optional>&doc_id=<optional>&min_mastery=<optional>
→ 200 {
  nodes: [{ id, label, subject, mastery_score, x?, y?, doc_ids: [] }],
  edges: [{ from, to, kind, strength }],
  stats: { total: N, mastered: N, strong: N, shaky: N, unknown: N }
}
```

**`/api/brain-map/snapshot` (new):**
```
POST /api/brain-map/snapshot
Headers: Authorization: Bearer <token>
→ 200 { url: "<signed-url-to-image>" }
Effect: Server-side render Brain Map to PNG, upload to storage, return signed URL.
```

#### Logic and edge cases
- **Empty state:** New user with no concepts yet → "Upload a PDF, ask a question, take a quiz — concepts will start appearing here."
- **Large graphs:** Users with 5+ PDFs may have 500+ concepts. Provide subject filter prominently. Use clustering algorithm to group dense regions.
- **Performance:** ReactFlow with 500+ nodes is slow. Add windowing/virtualization. Render only viewport nodes + 1-hop neighbors.
- **Cross-document concept dedup:** If "Newton's Third Law" appears in 3 PDFs, show as 1 node with `doc_ids: [3 ids]`. Use canonical_text + embedding similarity for dedup at indexing time, not render time.
- **Snapshot generation:** Render server-side using puppeteer or canvas. Cache aggressively — same user, same day, same data → reuse.
- **Sharing without identity leak:** Snapshot includes only graph + total concepts + Ask-My-Notes branding. No name, no percentile, no identifying info unless user opts in.

#### UX requirements
Full-page experience (Mode A surface):
```
┌─────────────────────────────────────────────────────────┐
│ Your Brain Map                              [Share] [⋮] │
├─────────────────────────────────────────────────────────┤
│ Subjects: [All] [Physics] [Chemistry] [Math]            │
│ Mastery: [Show all] [Strong+] [Shaky] [Unknown]         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              [Interactive graph viewport]               │
│                                                         │
│        ● ─── ●           ●                              │
│        │     │           │                              │
│        ●  ●──●──●     ●  ●                              │
│           │     │     │                                 │
│           ●     ●─────●                                 │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ 247 concepts. 89 strong. 124 shaky. 34 unknown.         │
└─────────────────────────────────────────────────────────┘
```

Side panel on node click:
```
Newton's Third Law of Motion
Subject: Physics
Mastery: 73% (strong)

Connected to:
  • Newton's Second Law (mastered)
  • Conservation of Momentum (shaky)
  • Action-Reaction Pairs (strong)

Last reviewed: 6 days ago
SRS cards: 3 ready to review

[Review now]   [Ask the tutor about this]
```

Shareable snapshot composition (1080×1920):
```
─────────────────────────────────────
        my brain — week 14
─────────────────────────────────────

       [Visual concept graph]

─────────────────────────────────────
        247 concepts
        89 strong, 124 shaky
        +47 this week
─────────────────────────────────────
                                ask-my-notes
```

#### AI requirements
Existing concept extraction (gpt-4o) handles this. No new AI work.

For node click → "Ask the tutor about this" — leverages existing `/api/ask` with concept context pre-loaded.

#### Dependencies
- F1.1 foundation work (dev routes must be gated before promoting dev-only Brain Map).
- ReactFlow already installed.
- Storage bucket for snapshots.

#### Telemetry
- Brain Map open rate (target: 60%+ of WAU)
- Time spent on Brain Map (target: 2+ minutes p50)
- Snapshot share rate (target: 5%+ of users share monthly)
- Node click rate
- Filter usage

#### MVP vs full
**MVP (Sprint 1):** Render graph, basic filtering, node click panel.
**Full (Sprint 2+):** Snapshot sharing, weekly diff animation ("see what grew this week"), comparison with cohort average (anonymous).

---

### F1.5 — Onboarding Rewrite (JEE/NEET Vertical Commitment)

#### What it is
The onboarding flow today supports "all Indian competitive exam students." It will now route users explicitly through JEE/NEET first, with "Other" as a low-priority option that gets logged for future expansion.

#### Acceptance criteria
- [ ] Onboarding step 1: "Which exam are you preparing for?" Options: JEE Main 2027, JEE Main 2026, JEE Advanced 2027, NEET UG 2027, NEET UG 2026, "Other (we'll add support for it soon)"
- [ ] If "Other" is selected, capture which exam in a text field. Log for product analytics. Show: "We'll be expanding to more exams. For now, your experience will be more limited than for JEE/NEET aspirants."
- [ ] Step 2: Year/class (Class 11, Class 12, Drop year, Other)
- [ ] Step 3: Exam date — populated by default from exam selection, editable
- [ ] Step 4: Study window preference (morning / afternoon / evening / late night — used for notification scheduling)
- [ ] Step 5: City/region — used for cohort assignment
- [ ] Total time: <2 minutes
- [ ] Skip option on every step except exam selection
- [ ] On completion: user lands on empty dashboard (F1.2)

#### Database changes
```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS exam_type TEXT,
    -- 'jee_main' | 'jee_advanced' | 'neet_ug' | 'other'
  ADD COLUMN IF NOT EXISTS exam_year INT,
  ADD COLUMN IF NOT EXISTS exam_date DATE,
  ADD COLUMN IF NOT EXISTS exam_other_specified TEXT,
  ADD COLUMN IF NOT EXISTS class_level TEXT,
    -- 'class_11' | 'class_12' | 'drop_year' | 'other'
  ADD COLUMN IF NOT EXISTS study_window TEXT,
    -- 'morning' | 'afternoon' | 'evening' | 'late_night'
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS cohort_id TEXT;
```

#### API contracts
**`/api/onboarding/complete` (new):**
```
POST /api/onboarding/complete
Headers: Authorization: Bearer <token>
Body: {
  exam_type, exam_year, exam_date, exam_other_specified?,
  class_level, study_window, city, region
}
→ 200 { cohort_id: "<auto-derived>" }
Effect:
  - Updates profile fields
  - Computes and assigns cohort_id (see Cohort feature spec F2.2)
  - Creates exam record in `exams` table with countdown
```

#### Logic and edge cases
- **Exam date validation:** If user selects JEE Main 2027 but enters a past date, infer correct date from official calendar.
- **"Other" exam tracking:** Log every "other" selection with their text input for future expansion priority decisions.
- **Resuming onboarding:** If user abandons mid-onboarding and returns, resume from last completed step. Store in localStorage + sync to DB.
- **Already-onboarded users:** Detect via existing `dashboard_mode` or `exam_type`. Skip onboarding entirely.

#### UX requirements
Conversational, single-question-per-screen, large tappable answers. Mobile-first design.

Each screen:
- Question in 1-2 sentences
- Answer options as cards
- "Skip" small text at bottom
- Progress dots at top (1/5, 2/5, etc.)

Example screen 1:
```
Which exam are you preparing for?

[JEE Main 2027]
[JEE Main 2026]
[JEE Advanced 2027]
[NEET UG 2027]
[NEET UG 2026]
[Other →]

Skip
```

If "Other":
```
We're focused on JEE and NEET right now.

Which exam are you preparing for?
[Text input]

We'll add full support for your exam soon.
Your experience for now will be more limited.

[Continue]   [Go back]
```

#### Dependencies
- F2.2 (Cohort assignment) for cohort_id derivation. If F2.2 isn't ready by Sprint 1 end, use stub cohort_id = "default" and migrate later.

#### Telemetry
- Onboarding completion rate (target: 85%+)
- Time to complete (target: <2 min p50)
- "Other" exam distribution
- Step-by-step drop-off rate

#### MVP vs full
**MVP (Sprint 1):** All 5 steps, basic cohort stub.
**Full (Sprint 2):** Dynamic cohort assignment, sample-PDF suggestion based on exam selection, study plan stub generated on completion.

---

### F1.6 — Pricing Rebuild (₹199/₹399/Family/B2B)

#### What it is
Restructure pricing tiers, add Family tier, prepare for B2B pilot. Implement 7-day Pro trial on every signup.

#### Acceptance criteria
- [ ] Free Explorer: 3 PDFs, 50 Q&A/day, browse public deck library, 1 focus session/day
- [ ] Student ₹199/mo or ₹1,599/yr (33% off): 20 PDFs, unlimited Q&A, 3 voice calls/day, full Brain Map, daily briefing
- [ ] Pro ₹399/mo or ₹2,999/yr: Unlimited PDFs, unlimited everything, parent reports, priority support, full voice tutor
- [ ] Family ₹4,499/yr: 2 students + parent dashboard
- [ ] Coaching Institute: Manual pricing, contact form, no self-serve
- [ ] On signup, user starts a 7-day Pro trial automatically. No credit card required.
- [ ] At Day 6 of trial: email/in-app prompt explaining trial ending soon
- [ ] At Day 7: user prompted to pick a tier. Defaults to Student if no action, with explicit messaging.
- [ ] Annual is selected by default on pricing page
- [ ] All amounts in INR, displayed with ₹ symbol
- [ ] Tax (GST) handling per current Razorpay setup
- [ ] Cancellation: friction-free, includes "pause" option

#### Database changes
```sql
-- Update user_plans to support new tier structure
ALTER TABLE user_plans
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT,
    -- 'monthly' | 'yearly' | 'family_yearly' | 'institute'
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paused_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS family_member_ids UUID[];

-- New table for B2B pilot tracking
CREATE TABLE IF NOT EXISTS coaching_institute_pilots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  student_count INT,
  status TEXT DEFAULT 'inquiry',
    -- 'inquiry' | 'qualified' | 'piloting' | 'paying' | 'churned'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Update `plan` enum to: `'free' | 'student' | 'pro' | 'family' | 'institute' | 'internal_dev'`.

#### API contracts
**`/api/payments/create-order` (modify):**
Support new tier + billing_cycle combinations:
```
POST /api/payments/create-order
Headers: Authorization: Bearer <token>
Body: { tier: "student"|"pro"|"family", cycle: "monthly"|"yearly" }
→ 200 { orderId, amount, currency, keyId }
```

Amount lookup:
| tier × cycle | INR amount |
|---|---|
| student × monthly | 19900 (₹199) |
| student × yearly | 159900 (₹1,599) |
| pro × monthly | 39900 (₹399) |
| pro × yearly | 299900 (₹2,999) |
| family × yearly | 449900 (₹4,499) |

(Razorpay uses paise; multiply rupees by 100.)

**`/api/trial/status` (new):**
```
GET /api/trial/status
Headers: Authorization: Bearer <token>
→ 200 { is_trial: true, days_remaining: 4, expires_at: "..." }
```

**`/api/subscription/pause` (new):**
```
POST /api/subscription/pause
Body: { duration_days: 30|60|90 }
→ 200 { paused_until: "..." }
```

**`/api/subscription/cancel` (new):**
```
POST /api/subscription/cancel
Body: { reason?: string }
→ 200 { cancelled_at: "..." }
```

#### Logic and edge cases
- **Trial auto-start:** On signup, set `user_plans.plan = 'pro'`, `trial_ends_at = signup + 7 days`, `billing_cycle = 'monthly'`. After trial expires, downgrade to free unless paid.
- **Trial expiration job:** Daily cron checks for trials ending today. Downgrades user to free. Sends final reminder email.
- **Family tier:** Primary user has `plan = 'family'`. Secondary user added via invite link → `user_plans.family_member_ids` contains their id. Both get pro-tier limits.
- **Pricing display while in trial:** Show "Pro features included until [date]" prominently. Show what user will lose at expiry.
- **Cancellation:** Set `cancelled_at`. User retains access until `expires_at`. Show resume option for 30 days post-expiry.
- **Pause:** Save current state. Set `paused_until`. User cannot access paid features but data is preserved.
- **Existing paying users:** Grandfather at current prices. Don't auto-migrate. Offer optional migration to new prices at next renewal.

#### UX requirements
New pricing page (mobile-first):

```
┌─────────────────────────────────────────────┐
│ Free                  Student         Pro   │
│                                              │
│ ₹0                    ₹199/mo        ₹399/mo│
│                       ₹1,599/yr      ₹2,999/yr│
│                       (save ₹789)    (save ₹1,789)│
│                                              │
│ 3 PDFs                20 PDFs        Unlimited│
│ 50 Q&A/day            Unlimited      Unlimited│
│ ...                   ...            ...    │
└─────────────────────────────────────────────┘
       [Continue with Free]   [Start Student]   [Start Pro]
       
       Family plan available for ₹4,499/yr →
       
       Coaching institute? [Get in touch]
```

In-product trial banner (Day 5-7):
```
┌─────────────────────────────────────────────┐
│ ⏱ Pro trial: 2 days left                    │
│ You've been using Pro features. Continue?   │
│ [Continue Pro] [Switch to Student] [Free]   │
└─────────────────────────────────────────────┘
```

Cancellation flow:
```
We're sorry to see you go.

[Pause for 30 days — your data stays]
[Pause for 60 days]
[Pause for 90 days]
[Cancel completely]

[Cancel reason — optional]
```

#### Dependencies
- Razorpay account configured for new amounts
- Email infrastructure for trial reminders
- Family invite system (deferred to Sprint 2 if needed)

#### Telemetry
- Trial conversion rate (Day 7 outcomes: % Pro / % Student / % Free)
- Annual vs monthly split
- Average days from signup to first payment
- Pause rate vs cancel rate
- Family tier adoption

#### MVP vs full
**MVP (Sprint 1-2):** All tiers live, trial system working, basic cancel/pause.
**Full (Sprint 3+):** Family invite flow polish, institute pilot landing page, A/B testing infrastructure for pricing.

---

## Sprint 2 features (Weeks 5-8)

### F2.1 — Daily Audio Briefing

#### What it is
Each morning, a 60-90 second AI-narrated audio briefing is generated for each active user. Delivered via push notification at their declared study window start time. Covers yesterday's progress, today's plan, weak topics to revisit, one personal note.

#### Acceptance criteria
- [ ] Briefing is generated nightly via cron at 2am IST.
- [ ] Each user with active streak (≥3 days) gets a briefing.
- [ ] Audio file is <2MB, generated as MP3.
- [ ] Briefing length: 60-90 seconds (target word count: 150-220 words).
- [ ] Audio is in English by default. (Hinglish in Sprint 4+.)
- [ ] Push notification sent at user's declared study window start time.
- [ ] Briefing is also available in-app as an audio player widget.
- [ ] User can disable briefings (opt-out, never opt-in).
- [ ] Briefing references: yesterday's session, 1-3 concepts to focus on today, 1 motivational/contextual note.
- [ ] Voice is consistent (same TTS voice across all users).

#### Database changes
```sql
CREATE TABLE IF NOT EXISTS daily_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  briefing_date DATE NOT NULL,
  audio_url TEXT,
  transcript TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  listened_at TIMESTAMPTZ,
  UNIQUE (user_id, briefing_date)
);

CREATE INDEX daily_briefings_user_date_idx
  ON daily_briefings (user_id, briefing_date DESC);
```

Add to profiles:
```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS briefing_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS briefing_delivery_minute INT DEFAULT 420;
  -- minutes after midnight; 420 = 7:00am
```

#### API contracts
**`/api/briefings/today` (new):**
```
GET /api/briefings/today
Headers: Authorization: Bearer <token>
→ 200 { audio_url, transcript, generated_at, listened_at }
→ 404 if no briefing today
```

**`/api/briefings/listened` (new):**
```
POST /api/briefings/listened
Headers: Authorization: Bearer <token>
→ 200 { listened_at: <now> }
```

**Internal cron job** (Supabase Edge Function or Vercel cron):
```
Schedule: 0 2 * * * (2am IST daily)
Job: generate_briefings_for_active_users()
```

#### Logic and edge cases
- **Active user definition:** Studied at least once in last 3 days OR has streak ≥3.
- **Briefing content generation:**
  1. Fetch user's last 7 days of activity from `learning_events`
  2. Identify: yesterday's session duration, concepts touched, current weak topics, exam countdown, current streak
  3. Construct gpt-4o-mini prompt (see AI section)
  4. Generate transcript (150-220 words)
  5. Pass transcript to OpenAI TTS (model: tts-1) for MP3 generation
  6. Upload MP3 to Supabase Storage `briefings/<user_id>/<date>.mp3`
  7. Insert into `daily_briefings` table

- **Cost control:** TTS at $15/1M chars. 200 words ≈ 1200 chars. 1000 users × 30 days × 1200 chars = 36M chars/month = $540. Cache aggressively. Generate only for users opted-in AND active.
- **Re-generation on day boundary:** If briefing wasn't generated (e.g., cron failed), check on user's app open and trigger generation just-in-time.
- **Failed generation fallback:** If TTS fails, send text-only briefing.
- **Voice selection:** Use `nova` (warm female voice) initially. Test with 50 users before locking. Consider `onyx` (deeper male voice) as alternative.

#### UX requirements
Briefing player widget (top of dashboard, shown if briefing exists for today):
```
┌──────────────────────────────────────────────┐
│ ▶ Your Briefing                       1:23   │
│   "Good morning, Priya. Yesterday you..."    │
│                                              │
│   [Listen]  [Read]                           │
└──────────────────────────────────────────────┘
```

Player on tap expands to full audio controls + transcript display.

Push notification (P1 in notification hierarchy):
```
Title: Good morning, [name].
Body: Your Briefing is ready. 90 seconds.
```

#### AI requirements

**Briefing generation prompt (gpt-4o-mini):**

```
SYSTEM:
You are the Ask-My-Notes Morning Briefing voice. You speak directly to one student preparing for [JEE Main 2027 / NEET 2026 / etc].

Your tone:
- Warm but not saccharine
- Specific and concrete (use real numbers, not "you did great")
- Calibrated to their reality (no false encouragement, no pressure)
- 150-220 words
- Conversational, like a friend who knows their work

You will get a context block. Use it to write today's briefing.

Structure:
1. Greeting + acknowledge yesterday (1-2 sentences)
2. Today's 3 priorities, ranked (3-4 sentences)
3. Explicit permission to do less if needed (1 sentence)
4. A personal note (cohort presence, weak topic flag, or encouragement) (1-2 sentences)
5. Close (1 sentence)

Forbidden:
- Streak guilt
- Comparative shaming
- Excessive enthusiasm
- "Crush it" / "Grind" / "Beast mode"
- Exclamation marks except in close

USER (context block):
Student: [first name]
Exam: [exam type], [days until exam]
Yesterday: [duration] min studying, [N] concepts touched, [list]
Streak: [N] days
This week mastery delta: +X concepts strong, +Y shaky→strong
Active weak topics: [top 3]
Today's planned focus (from study plan): [chapter]
Cohort: [N] active members
Time of week: [Monday / Sunday / etc]

OUTPUT:
The briefing transcript, 150-220 words, ready for TTS.
```

#### Dependencies
- F2.5 (Push notification infrastructure)
- Supabase Storage configured for audio files
- OpenAI TTS API access
- Cron infrastructure

#### Telemetry
- Briefings generated per day
- Briefing listen rate (target: 40%+ of users with briefings)
- Time from briefing delivery to first session of day
- TTS cost per user per month

#### MVP vs full
**MVP (Sprint 2):** English-only, single voice, fixed structure.
**Full (Sprint 3+):** Multiple voice options, Hinglish/Hindi support, personalized longer briefings on Sundays (weekly recap), morning briefing in audio + visual story format.

---

### F2.2 — Cohort System

#### What it is
Every user is auto-placed in a cohort based on exam type, year, region, and class level. Cohort has a live count of active members, anonymous weekly leaderboard, and supports cohort-level features.

#### Acceptance criteria
- [ ] On onboarding completion, cohort_id is assigned deterministically.
- [ ] Cohort metadata visible: name, member count, active count (last 24h).
- [ ] Dashboard shows "X cohort members studying right now."
- [ ] Cohort leaderboard page: top 100 anonymous users by Focus Score this week.
- [ ] User can see their rank within cohort.
- [ ] Leaderboard updates weekly (every Sunday 8pm IST).
- [ ] Cohorts have minimum 30 members before leaderboard activates (cold-start handling).
- [ ] Cohort presence indicator pulses subtly in realtime.

#### Database changes
```sql
CREATE TABLE IF NOT EXISTS cohorts (
  id TEXT PRIMARY KEY,  -- 'jee_main_2027_south_india_class12'
  exam_type TEXT NOT NULL,
  exam_year INT NOT NULL,
  region TEXT NOT NULL,
  class_level TEXT,
  name TEXT,  -- human-readable display name
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cohort_members (
  cohort_id TEXT REFERENCES cohorts(id),
  user_id UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  display_handle TEXT,  -- auto-generated anonymous handle
  PRIMARY KEY (cohort_id, user_id)
);

CREATE TABLE IF NOT EXISTS cohort_leaderboard_snapshots (
  cohort_id TEXT,
  snapshot_date DATE,
  rankings JSONB,  -- [{user_id, handle, focus_score, rank}, ...]
  PRIMARY KEY (cohort_id, snapshot_date)
);

CREATE INDEX cohort_members_user_idx ON cohort_members (user_id);
```

#### API contracts
**`/api/cohort/me` (new):**
```
GET /api/cohort/me
Headers: Authorization: Bearer <token>
→ 200 {
  cohort_id, cohort_name, member_count,
  active_now_count, my_rank, my_display_handle
}
```

**`/api/cohort/leaderboard` (new):**
```
GET /api/cohort/leaderboard
Headers: Authorization: Bearer <token>
→ 200 {
  cohort_name, week_starting,
  top_100: [{rank, handle, focus_score, is_you?}],
  my_rank, my_focus_score
}
```

**`/api/cohort/presence` (new, WebSocket via Supabase Realtime):**
Use Supabase Realtime presence on cohort channel. Each user subscribes to `cohort:<cohort_id>` when they open the app. Active count = presence count.

#### Logic and edge cases
- **Cohort assignment algorithm:**
  ```
  cohort_id = `${exam_type}_${exam_year}_${region}_${class_level}`
  // examples: 'jee_main_2027_north_india_class11'
  //           'neet_ug_2026_south_india_drop'
  ```
- **Cohort splitting:** When a cohort reaches 5000+ members, split by city: `jee_main_2027_bangalore_class11`, `jee_main_2027_pune_class11`. Migration job runs weekly.
- **Cold start:** Cohorts <30 members get a "Cohort building" message instead of leaderboard. Show user's rank, but blur others.
- **Anonymous handles:** Generate at member-add time. Format: `[adjective]-[noun]-[3-digit-number]`. Examples: `swift-tiger-247`, `quiet-fox-883`. User can regenerate once.
- **Leaderboard snapshot:** Cron job Sunday 8pm IST. Computes top 100 by Focus Score over last 7 days. Stores snapshot. Frontend reads from snapshot.
- **Privacy:** No real names, no profile photos shown. User opts-in to reveal name to invited friends only.

#### UX requirements
Dashboard cohort widget:
```
┌─────────────────────────────────────────┐
│ JEE 2027 Bangalore                      │
│ 312 members studying right now          │
│                                         │
│ This week, you're #47 of 8,234         │
│ ▲ up from #89 last week                 │
│                                         │
│ [See leaderboard]                       │
└─────────────────────────────────────────┘
```

Leaderboard page (Mode A):
```
┌─────────────────────────────────────────┐
│ JEE 2027 Bangalore — Week of May 13     │
│                                         │
│ #1   swift-tiger-247        Focus 94    │
│ #2   quiet-fox-883          Focus 91    │
│ ...                                     │
│ #47  brave-otter-512 (you)  Focus 73   │
│ ...                                     │
│ #100 calm-eagle-009         Focus 58    │
│                                         │
│ Updated weekly. Anonymous.              │
└─────────────────────────────────────────┘
```

Realtime active indicator (subtle pulse):
- Small dot that pulses every 4 seconds with the active count
- Color: faint purple, never aggressive

#### Dependencies
- F1.5 (Onboarding with exam_type, region, class_level captured)
- Existing realtime infrastructure

#### Telemetry
- % of users who view cohort widget weekly
- Click-through rate to leaderboard
- Average cohort size by exam
- Active concurrent users per cohort

#### MVP vs full
**MVP (Sprint 2):** Cohort assignment, member count, leaderboard.
**Full (Sprint 3+):** Cohort battles (Friday topic challenge), opt-in WhatsApp group integration, friend reveal, cohort-level study sessions.

---

### F2.3 — Push Notification Infrastructure + Daily Loop

#### What it is
Web push notification system that delivers the 4 daily touchpoints from the retention engine (Morning Briefing, Lunch micro, Focus anchor, Night closure) at user-configured times.

#### Acceptance criteria
- [ ] Web Push API integrated.
- [ ] Service Worker registered.
- [ ] User can grant/revoke push permission.
- [ ] User can configure preferred times per notification type.
- [ ] User can disable any/all notification types.
- [ ] Max 4 scheduled notifications per day. Hard cap.
- [ ] Zero notifications between 10pm-7am (hard rule).
- [ ] Zero notifications during 2-5pm slump window for inactive users (hard rule).
- [ ] Zero notifications on declared exam day (hard rule).
- [ ] Cron job dispatches notifications at scheduled times.

#### Database changes
```sql
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  device_info TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  UNIQUE (user_id, endpoint)
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  briefing_enabled BOOLEAN DEFAULT TRUE,
  briefing_time INT DEFAULT 420,  -- minutes after midnight
  midday_enabled BOOLEAN DEFAULT TRUE,
  midday_time INT DEFAULT 780,  -- 1pm
  focus_anchor_enabled BOOLEAN DEFAULT TRUE,
  focus_anchor_time INT DEFAULT 1080,  -- 6pm
  night_closure_enabled BOOLEAN DEFAULT TRUE,
  night_closure_time INT DEFAULT 1260,  -- 9pm
  cohort_updates_enabled BOOLEAN DEFAULT TRUE,
  care_nudges_enabled BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  notification_type TEXT,
    -- 'briefing' | 'midday' | 'focus_anchor' | 'night_closure'
    -- | 'cohort_update' | 'care_nudge'
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered BOOLEAN,
  clicked_at TIMESTAMPTZ
);

CREATE INDEX notification_log_user_sent_idx
  ON notification_log (user_id, sent_at DESC);
```

#### API contracts
**`/api/push/subscribe` (new):**
```
POST /api/push/subscribe
Headers: Authorization: Bearer <token>
Body: { endpoint, keys: { p256dh, auth }, device_info }
→ 200 { subscribed: true }
```

**`/api/push/unsubscribe` (new):**
```
POST /api/push/unsubscribe
Body: { endpoint }
→ 200 { unsubscribed: true }
```

**`/api/notifications/preferences` (new):**
```
GET → returns current preferences
PATCH → updates preferences
```

**Internal: notification dispatcher cron**
Runs every 5 minutes:
1. Compute current time in minutes-since-midnight per timezone.
2. Query users where any notification's `_time` matches current 5-min bucket AND `_enabled = true`.
3. Apply guardrails:
   - Skip if 10pm-7am
   - Skip if 2-5pm and no session today
   - Skip if today is exam_date
   - Skip if max 4 notifications already sent today
4. Generate notification payload (content per type).
5. Send via Web Push.
6. Log to `notification_log`.

#### Logic and edge cases
- **Timezone handling:** Store user timezone. All notification times are local-time minutes. Cron runs in UTC and queries with timezone math.
- **Daylight savings:** India doesn't observe DST. Other markets when launched would need this.
- **Permission revoked:** If push fails with 410 Gone, remove subscription.
- **Failed delivery:** Log failure, retry once after 1 hour. Then give up.
- **Notification batching:** Same notification across multiple devices for same user → send to all, log once.

#### UX requirements
Permission prompt (Sprint 2, after first session):
```
Want a 90-second Briefing each morning?

Yes — at [7:00 AM ▼]
Not right now
```

Settings page notification preferences:
- Master toggle: All notifications [on/off]
- Per-type toggles with time pickers
- Display of "Max 4 per day. We respect your sleep + your slump."

#### Dependencies
- HTTPS-served PWA (already in place via Vercel)
- VAPID keys generated and stored
- Service Worker file deployed

#### Telemetry
- Push permission grant rate (target: 35%+)
- Notification CTR by type
- Notification → session conversion rate
- Opt-out rate per notification type

#### MVP vs full
**MVP (Sprint 2):** Permission, 4 daily notifications, basic dispatcher.
**Full (Sprint 3+):** Care nudges (triggered by detection), cohort updates, weekly recap notifications, SMS fallback (deferred).

---

### F2.4 — Streak Freeze + "Consistent Learner" Badge

#### What it is
Replace the punishing streak mechanic with a forgiving version. Streaks survive missed days through automatic "freeze" tokens. The visible badge is "Consistent Learner — Day N" rather than a fragile streak count.

#### Acceptance criteria
- [ ] Each user earns 1 Streak Freeze every 7 consecutive study days.
- [ ] Streak Freezes apply automatically on missed days (no manual action).
- [ ] User can have up to 3 banked freezes.
- [ ] "Consistent Learner" badge replaces streak counter visually.
- [ ] Badge text: "Consistent Learner — Day N" where N is cumulative days, not consecutive.
- [ ] Missing a day with a freeze: badge persists, day count holds.
- [ ] Missing a day without a freeze: badge resets to "Today" + a gentle "Welcome back, let's start again."
- [ ] No "lost streak!" notification, ever.

#### Database changes
```sql
ALTER TABLE study_streaks
  ADD COLUMN IF NOT EXISTS freezes_available INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freezes_used INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cumulative_study_days INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_freeze_earned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_freeze_used_at TIMESTAMPTZ;
```

#### API contracts
**`/api/streak/status` (modify or new):**
```
GET /api/streak/status
→ 200 {
  cumulative_days,
  current_streak,
  freezes_available,
  badge_label  -- 'Consistent Learner — Day 47'
}
```

#### Logic and edge cases
- **Daily evaluation job:** Cron at 1am IST.
  - For each user: did they have a session yesterday?
  - If yes: increment cumulative_study_days, current_streak. If consecutive 7-day milestone: increment freezes_available (cap 3).
  - If no AND freezes_available >0: decrement freezes_available, increment freezes_used. Streak holds.
  - If no AND freezes_available =0: reset current_streak to 0. Cumulative days unchanged. Show "welcome back" on next open.

- **Edge: timezone:** Day is in user's timezone.
- **Edge: gaming:** A user could open the app for 30s and have it count. Solution: require >5 min session for day to count. Already supported by `focus_progress` schema.
- **Edge: first day:** New user's day 1 needs special handling — show "Day 1" badge, no freeze logic yet.

#### UX requirements
Badge component (replaces existing streak display):
```
🌱 Consistent Learner
   Day 47
   2 freezes available
```

On freeze auto-use (post-hoc, gentle):
```
You missed yesterday. We applied a freeze automatically.
Day 47 holds. 1 freeze left.
```

On reset:
```
Welcome back.
Day 1 again — but the work you've done is still there.
```

NO popups celebrating freezes. NO push notifications about streaks. Just a quiet, calm display.

#### Dependencies
- Daily cron infrastructure

#### Telemetry
- Average freezes earned per active user
- Average freezes used per month
- Reset frequency
- User sentiment (qualitative)

#### MVP vs full
**MVP (Sprint 2):** Full feature as specced.
**Full (Sprint 3+):** Special week milestones (Day 50, 100, 365), "Veteran" tier badges, optional public badge display.

---

### F2.5 — Photo Doubt Cam (Differentiation Feature #1)

#### What it is
Mobile-first camera input for the Q&A flow. User points phone at any problem (printed, handwritten, on a screen). Ask-My-Notes recognizes it via GPT-4o Vision, retrieves relevant context from user's uploaded PDFs, and walks them through the answer Socratically.

#### Acceptance criteria
- [ ] Camera icon prominent in Q&A interface on mobile (web + PWA).
- [ ] Tapping camera opens device camera (via `getUserMedia` or file input fallback).
- [ ] User can take photo or upload from gallery.
- [ ] Image is sent to backend with optional accompanying text.
- [ ] Backend recognizes problem via GPT-4o Vision.
- [ ] Backend retrieves relevant context from user's PDFs via vector search on recognized question text.
- [ ] Response is streamed back as standard Q&A answer.
- [ ] Image is stored (so user can refer back) but deleted after 30 days.
- [ ] Works in conversation context — followup questions reference the same photo.

#### Database changes
```sql
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS has_image_attachments BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS photo_doubts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  conversation_id UUID REFERENCES conversations(id),
  image_url TEXT NOT NULL,
  recognized_text TEXT,
  subject_detected TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delete_after TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX photo_doubts_user_idx ON photo_doubts (user_id, created_at DESC);
CREATE INDEX photo_doubts_delete_idx ON photo_doubts (delete_after);
```

#### API contracts
**`/api/photo-doubt` (new):**
```
POST /api/photo-doubt
Headers: Authorization: Bearer <token>
Content-Type: multipart/form-data
Body:
  image: <file>
  question_hint?: string  // optional user-typed context
  conversation_id?: uuid
→ Streaming response (same protocol as /api/ask):
  __META__{ sources, classification, recognized_text, subject }
  <streamed answer text>
  __CONV__{ conversationId, photoDoubtId }
```

#### Logic and edge cases
- **Image upload:** Compress client-side to ~800KB max. Upload to Supabase Storage `photo_doubts/<user_id>/<uuid>.jpg`.
- **Image privacy:** All images served via signed URLs. User-only access. Delete after 30 days via cron.
- **Vision call:** Single GPT-4o call with image + system prompt asking: (a) extract the question, (b) identify subject, (c) walk through Socratic answer using provided PDF context.
- **PDF context retrieval:** Embed the recognized question text, vector search against user's `document_chunks`. Top 5 chunks as context.
- **No PDFs uploaded yet:** Still answer the question, but flag "I'm answering from general knowledge — upload your study material for personalized answers."
- **Unclear image:** If recognized_text is empty or low-confidence, ask user to retake or type the question.
- **Cost:** GPT-4o Vision is more expensive than gpt-4o-mini. Each photo doubt ≈ $0.02-0.05. Budget cap: free tier 3 photos/day, Student 20, Pro unlimited.

#### UX requirements
Camera button placement (Q&A interface):
```
┌──────────────────────────────────────┐
│                                      │
│  Type your question...               │
│                                      │
│                       [📷] [Send]    │
└──────────────────────────────────────┘
```

After photo taken:
```
┌──────────────────────────────────────┐
│  [Thumbnail of photo]                │
│                                      │
│  Optional: Add context...            │
│                                      │
│                  [Retake]  [Send]    │
└──────────────────────────────────────┘
```

Response shows photo inline in conversation, then AI answer streams below.

#### AI requirements

**Vision recognition prompt (gpt-4o):**

```
SYSTEM:
You are looking at a study problem from a student preparing for [exam_type].

Tasks:
1. Extract the question text exactly (or describe if it's a diagram).
2. Identify the subject (Physics/Chemistry/Biology/Math) and topic.
3. Note any handwritten work the student has done.
4. Determine difficulty level (1-mark vs 4-mark vs 8-mark equivalent).

If the image is unclear, say so explicitly.

USER: [image]

OUTPUT (structured JSON):
{
  "recognized_text": "...",
  "subject": "Physics",
  "topic": "Mechanics — Rotational Dynamics",
  "difficulty_estimate": "JEE Main 4-mark equivalent",
  "student_work_visible": true/false,
  "image_clarity": "clear" / "partial" / "unclear"
}
```

After recognition, pass `recognized_text` to existing `/api/ask` flow with subject context and retrieved PDF chunks. Use Socratic coach prompt by default for photo doubts (forces engagement, not just answer-dispensing).

#### Dependencies
- GPT-4o Vision API access
- Supabase Storage configured
- Existing `/api/ask` streaming infrastructure
- Existing RAG pipeline

#### Telemetry
- Photo doubt usage rate (target: 30%+ of mobile users use it weekly)
- Subjects most-photographed
- Image clarity success rate
- Conversion from free photo doubts to paid

#### MVP vs full
**MVP (Sprint 2):** Single photo per conversation, basic recognition + answer.
**Full (Sprint 3+):** Multi-photo conversations (compare your work to correct work), handwritten solution grading, "show me how you got there" follow-up flow.

---

## Sprint 3 features (Weeks 9-12)

### F3.1 — PYQ Database + Seed Content

#### What it is
A curated, tagged, AI-searchable database of past year questions for JEE Main, JEE Advanced, and NEET UG. By end of Sprint 3: 500-1000 questions indexed with metadata. Each PYQ has a public SEO page. AI can answer "show me JEE Main rotational dynamics PYQs 2018-2022."

#### Acceptance criteria
- [ ] Database supports questions tagged by: exam, year, subject, chapter, concept(s), difficulty, mark weight.
- [ ] Each PYQ has: question text, solution, similar questions list, official answer.
- [ ] 500+ PYQs indexed by end of Sprint 3.
- [ ] Each PYQ has a unique public URL (SEO indexable).
- [ ] PYQ search page: filterable by exam/year/subject/chapter.
- [ ] AI can query the PYQ corpus via natural language.
- [ ] PYQ practice mode: user can launch a custom set ("20 JEE Main mechanics PYQs").
- [ ] PYQ mastery tracked separately from PDF concept mastery.

#### Database changes
```sql
CREATE TABLE IF NOT EXISTS pyqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,  -- URL: /pyq/jee-main-2022-physics-mech-q47
  exam_type TEXT NOT NULL,
  exam_year INT NOT NULL,
  exam_session TEXT,  -- 'jan' | 'apr' | 'jul' (for JEE Main sessions)
  subject TEXT NOT NULL,
  chapter TEXT,
  concepts TEXT[],  -- linked concept names
  question_text TEXT NOT NULL,
  question_image_url TEXT,
  options JSONB,  -- for MCQs
  correct_answer TEXT,
  solution_text TEXT,
  solution_image_url TEXT,
  difficulty TEXT,  -- 'easy' | 'medium' | 'hard'
  mark_weight INT,
  question_type TEXT,  -- 'mcq' | 'numerical' | 'integer' | 'multi_correct'
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX pyqs_exam_year_subject_idx ON pyqs (exam_type, exam_year, subject);
CREATE INDEX pyqs_chapter_idx ON pyqs (chapter);
CREATE INDEX pyqs_concepts_idx ON pyqs USING GIN (concepts);
CREATE INDEX pyqs_embedding_idx ON pyqs USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE TABLE IF NOT EXISTS pyq_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  pyq_id UUID NOT NULL REFERENCES pyqs(id),
  user_answer TEXT,
  is_correct BOOLEAN,
  time_taken_seconds INT,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX pyq_attempts_user_idx ON pyq_attempts (user_id, attempted_at DESC);
```

#### API contracts
**`/api/pyqs/search` (new):**
```
GET /api/pyqs/search
Query: ?exam=jee_main&year=2022&subject=physics&chapter=mechanics&difficulty=hard
→ 200 { results: [{pyq summary}], total }
```

**`/api/pyqs/<slug>` (new, public for SEO):**
```
GET /api/pyqs/jee-main-2022-physics-mech-q47
→ 200 { full PYQ data }
```

**`/api/pyqs/ai-query` (new):**
```
POST /api/pyqs/ai-query
Body: { query: "JEE Main rotational dynamics 4-mark 2018-2022" }
→ 200 { interpreted_query, matching_pyqs: [...] }
```

**`/api/pyqs/practice` (new):**
```
POST /api/pyqs/practice
Body: { exam, subjects, chapters?, count: 20 }
→ 200 { session_id, pyqs: [...] }
```

**`/api/pyqs/submit` (new):**
```
POST /api/pyqs/submit
Body: { pyq_id, user_answer, time_taken_seconds }
→ 200 { is_correct, solution_text, similar_pyqs: [...] }
```

#### Logic and edge cases
- **Content acquisition (the actual work):** Sprint 3 dedicates ~30 hours to manual curation. Sources:
  - Official NTA papers (legally redistributable for educational use)
  - Allen / Aakash answer keys (educational fair use; cite source)
  - User contributions (post-launch)
  
- **Tagging at ingestion:**
  1. Upload PYQ content (text or scanned PDF)
  2. Auto-extract via gpt-4o (question text, options, correct answer, solution)
  3. Auto-classify chapter + concepts via existing classifier
  4. Manual review (5 minutes per question)
  5. Generate embedding
  6. Insert

- **Slug generation:** Format: `{exam}-{year}-{subject}-{chapter-abbr}-q{idx}`. Deduplicate manually for collisions.
- **AI query interpretation:** Parse natural language into structured filters via gpt-4o-mini. Example: "rotational dynamics 4-mark 2018-2022" → `{ chapter: "rotational_dynamics", mark_weight: 4, year_range: [2018, 2022] }`.
- **SEO pages:** Server-rendered (Next.js SSR). Include schema.org markup for Educational Question content type. Internal linking between similar questions.

#### UX requirements
PYQ search page (mobile-first):
```
┌─────────────────────────────────────────┐
│ Past Year Questions                     │
│                                         │
│ Exam: [JEE Main ▼]  Year: [Any ▼]      │
│ Subject: [Physics]  Chapter: [Mech]     │
│ Difficulty: [Hard]                      │
│                                         │
│ [187 questions match]                   │
│                                         │
│ [Q1] JEE Main 2022 — Newton's 2nd Law   │
│      Difficulty: Hard | 4 marks        │
│      [Practice this]                    │
│ [Q2] ...                                │
└─────────────────────────────────────────┘
```

Individual PYQ page (public, SEO-indexed):
- Full question + image
- Difficulty + tags
- "Try yourself" before showing solution
- Solution with step-by-step
- 3-5 similar PYQs at bottom
- "Practice 20 similar" CTA → user signup if not logged in

#### AI requirements
**Auto-classification on ingestion (gpt-4o):** Extract structured data from raw PYQ text/image. Single-shot, batched. ~$0.01 per question.

**Natural-language query parsing (gpt-4o-mini):** Cheap, fast. ~$0.0001 per query.

#### Dependencies
- pgvector already in use for embeddings
- Content acquisition pipeline (manual curation work)
- SEO infrastructure (sitemaps, schema.org)

#### Telemetry
- PYQ search count per user
- PYQ attempts per user
- PYQ accuracy by exam/year
- SEO traffic to PYQ pages
- Conversion from PYQ landing → signup

#### MVP vs full
**MVP (Sprint 3):** 500 PYQs, basic search, individual pages, practice mode.
**Full (Sprint 4+):** 5000+ PYQs (JEE Main + Advanced + NEET 10 years), video solutions, PYQ-based mock generation, weak-PYQ tracking, year-over-year trend analysis.

---

### F3.2 — FSRS Scheduler (Replaces SM-2)

#### What it is
Upgrade the SRS algorithm from SM-2 (1985 algorithm) to FSRS (Free Spaced Repetition Scheduler, 2023+). FSRS is what serious Anki users have migrated to. It's measurably more efficient per review.

#### Acceptance criteria
- [ ] FSRS algorithm implemented and tested.
- [ ] Existing SM-2 data migrated to FSRS state.
- [ ] New cards use FSRS by default.
- [ ] Mastery scoring adapted to use FSRS retrievability.
- [ ] Card review rating supports 4 states (Again/Hard/Good/Easy) — same as SM-2 from user perspective.
- [ ] Per-user FSRS parameters can be optimized (post-MVP).

#### Database changes
```sql
ALTER TABLE spaced_repetition_cards
  ADD COLUMN IF NOT EXISTS fsrs_stability FLOAT,
  ADD COLUMN IF NOT EXISTS fsrs_difficulty FLOAT,
  ADD COLUMN IF NOT EXISTS fsrs_state TEXT DEFAULT 'new',
    -- 'new' | 'learning' | 'review' | 'relearning'
  ADD COLUMN IF NOT EXISTS fsrs_last_review TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fsrs_lapses INT DEFAULT 0;

CREATE TABLE IF NOT EXISTS fsrs_parameters (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  w FLOAT[],  -- 19 weights, default to FSRS defaults
  desired_retention FLOAT DEFAULT 0.9,
  maximum_interval_days INT DEFAULT 36500,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Migration logic
Convert existing SM-2 cards:
```
for each existing card:
  if card.repetition == 0:
    fsrs_state = 'new'
  else:
    fsrs_state = 'review'
    fsrs_stability = card.interval_days
    fsrs_difficulty = 5.0 - (card.ease_factor - 1.3) * 4  # rough conversion
```

This is imperfect but preserves continuity. Cards will rebalance after 5-10 reviews under FSRS.

#### API contracts
**`/api/cards/<id>/review` (modify):**
```
POST /api/cards/<id>/review
Body: { rating: 1|2|3|4 }  // Again | Hard | Good | Easy
→ 200 {
  next_due_at,
  fsrs_state,
  predicted_retention_at_due
}
```

Internal logic uses FSRS algorithm (well-documented, open source — implement in `lib/fsrsScheduler.js`).

#### Logic and edge cases
- **FSRS parameters:** Use default w = [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61, 0.0, 0.0] for new users. Custom optimization is Sprint 4+.
- **Desired retention:** Default 0.9 (90%). Means: when card is due, user is expected to have 90% chance of recalling correctly.
- **Rating semantics:**
  - 1 (Again): forgot it
  - 2 (Hard): remembered with effort
  - 3 (Good): remembered comfortably
  - 4 (Easy): instant recall, too easy
- **Mastery scoring:** Replace SM-2-derived mastery with FSRS retrievability. A concept's mastery = average retrievability across its cards.
- **Edge: rapid review:** If user reviews a card and rates Good before the card was due, increase stability less than normal (FSRS handles this).

#### Dependencies
- Existing card review infrastructure
- Migration job for existing SM-2 cards

#### Telemetry
- Retrievability at due time (should approach 0.9)
- Reviews per card per month (should be lower than SM-2)
- User-reported "I felt I knew this" rate

#### MVP vs full
**MVP (Sprint 3):** FSRS algorithm, default parameters, migration.
**Full (Sprint 4+):** Per-user parameter optimization (FSRS optimizer), desired retention configurable, custom scheduling for exam cycles.

---

### F3.3 — Decompression Mode

#### What it is
The care pillar made operational. The system detects signs of overload (long sessions without breaks, frustrated language, accuracy regression, late-night use) and intervenes gently with a break suggestion or low-pressure activity option.

#### Acceptance criteria
- [ ] Detection runs in shadow mode for first 2 weeks (logs but doesn't surface to users).
- [ ] After 2 weeks of tuning: live, surfaces to users.
- [ ] Triggers (any of):
  - Session duration >180 minutes continuous
  - Accuracy on quiz/SRS drops below 50% in current session
  - Repeated wrong answers on same concept (3+ in session)
  - Late-night activity past 11pm with active studying
  - User opens app 10+ times in 30 minutes without starting a session
- [ ] Intervention is a single non-modal prompt: "Take 5? You've been at this 3 hours."
- [ ] Options: Take a break / Continue / Do something easier
- [ ] "Easier" option: 3 confidence-building flashcards from already-mastered concepts.
- [ ] Frequency limit: max 2 decompression nudges per user per day.
- [ ] User can disable in settings.

#### Database changes
```sql
CREATE TABLE IF NOT EXISTS decompression_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  trigger_type TEXT,
    -- 'long_session' | 'accuracy_drop' | 'repeat_errors' | 'late_night' | 'app_anxiety'
  context JSONB,  -- session_duration, accuracy, etc
  user_response TEXT,
    -- 'break' | 'continue' | 'easier' | 'dismissed' | null
  responded_at TIMESTAMPTZ
);

CREATE INDEX decompression_user_idx ON decompression_triggers (user_id, triggered_at DESC);
```

Add to profiles:
```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS decompression_enabled BOOLEAN DEFAULT TRUE;
```

#### API contracts
**`/api/decompression/trigger` (new, internal):**
Frontend posts session activity data; backend evaluates triggers.

**`/api/decompression/log-response` (new):**
```
POST /api/decompression/log-response
Body: { trigger_id, response: 'break'|'continue'|'easier'|'dismissed' }
→ 200
```

**`/api/decompression/easier-set` (new):**
```
GET /api/decompression/easier-set
→ 200 { cards: [3 high-mastery flashcards] }
```

#### Logic and edge cases
- **Detection logic** (client + server hybrid):
  - Client tracks session start time, accuracy in current session, recent activity timestamps.
  - Periodic check (every 5 min during active session): does any trigger fire?
  - If yes, surface the nudge. Log the trigger.
- **De-duplication:** Don't fire same trigger twice within 30 minutes.
- **Frequency cap:** 2 nudges/day per user. After cap, log triggers but don't surface.
- **Tone:** Always gentle. Never alarming. Never urgent.
- **Easier set selection:** Top 3 cards from `spaced_repetition_cards` where `fsrs_state = 'review'` AND mastery >0.85. Quick wins.
- **Sensitive detection:** Late-night trigger only fires for users not in declared "late_night" study window.

#### UX requirements
Nudge component (non-modal, dismissible):
```
┌─────────────────────────────────────────┐
│ You've been at this 3 hours. Take 5?    │
│                                         │
│ [Take a break]                          │
│ [Continue]                              │
│ [Something easier — 3 quick cards]      │
└─────────────────────────────────────────┘
```

Appears at top of screen, slides in subtly. Doesn't block. Auto-dismisses after 60 seconds if no response.

#### AI requirements
None for MVP. Pure rule-based detection.

Future (Sprint 4+): use sentiment from chat tone to detect frustration. Requires AI call.

#### Dependencies
- Session tracking already in place via `focus_progress`
- F2.4 streak/cumulative day data

#### Telemetry
- Trigger fire rate per type
- User response distribution (break/continue/easier/dismissed)
- Correlation between decompression use and Day-30 retention
- Self-reported "this helped" feedback (in-product mini-survey, monthly)

#### MVP vs full
**MVP (Sprint 3):** Rule-based detection, 4 trigger types, intervention nudge with 3 options.
**Full (Sprint 4+):** Sentiment-based detection from chat tone, per-user adaptive thresholds, integration with parent notifications (if opted-in), longer-form "wellness check-in" flow.

---

### F3.4 — Smart Mock Test Simulator (OR Voice Tutor Call Upgrade)

This is the **"pick one of two"** slot for Sprint 3.

**Recommendation:** Build Smart Mock Test Simulator over Voice Tutor Call upgrade because:
- Higher retention impact (weekly ritual)
- Direct value from PYQ database (F3.1) — strong synergy
- Lower operational cost than voice tutor at scale
- Less risky (mock test failures are recoverable; voice failures are abandonment events)

If Sprint 2 went so well that Sprint 3 has extra capacity, build both. If Sprint 2 ran over, build Mock Simulator only.

Specs for both below; reader can pick.

#### F3.4A — Smart Mock Test Simulator (recommended)

##### What it is
Full-length, time-pressured mock test mode. Same time pressure, question count, and rules as the real exam (JEE Main / JEE Advanced / NEET). Questions are personalized: a mix of fresh AI-generated questions calibrated to user mastery + PYQs from the corpus. After mock: detailed topic-level diagnostics, predicted cohort rank, 7-day recovery plan.

##### Acceptance criteria
- [ ] Mock modes: JEE Main, JEE Advanced (paper 1 only for MVP), NEET UG.
- [ ] JEE Main mock: 90 questions, 3 hours, +4/-1 marking.
- [ ] NEET mock: 200 questions, 3h 20m, +4/-1 marking.
- [ ] Question mix: 70% PYQs, 30% AI-generated calibrated to user mastery.
- [ ] Real-time timer with subject-switch tracking.
- [ ] Pause allowed (saves state, can resume within 24h).
- [ ] Submit: detailed analytics screen.
- [ ] Analytics include: overall score, by-subject breakdown, by-chapter breakdown, time-per-question heatmap, "silly mistakes" flagged.
- [ ] Predicted cohort rank: "Your score predicts rank 8,200-11,400 in JEE 2027 cohort of 8,234 active members."
- [ ] 7-day recovery plan: top 5 weak chapters with daily activities.

##### Database changes
```sql
CREATE TABLE IF NOT EXISTS mock_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  exam_type TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_questions INT,
  questions JSONB,  -- [{pyq_id, ai_generated?, subject, chapter, ...}]
  answers JSONB,  -- [{question_idx, answer, time_seconds}]
  score INT,
  marks_obtained INT,
  total_marks INT,
  topic_breakdown JSONB,
  predicted_rank_range JSONB
);

CREATE INDEX mock_tests_user_idx ON mock_tests (user_id, completed_at DESC);
```

##### API contracts
**`/api/mock/start` (new):**
```
POST /api/mock/start
Body: { exam_type: 'jee_main'|'jee_advanced'|'neet_ug' }
→ 200 {
  mock_id,
  questions: [{idx, subject, question_text, options, ...}],
  duration_minutes,
  marking_scheme
}
```

**`/api/mock/submit-answer` (new):**
```
POST /api/mock/submit-answer
Body: { mock_id, question_idx, answer, time_seconds }
→ 200 { logged: true }
```

**`/api/mock/complete` (new):**
```
POST /api/mock/complete
Body: { mock_id }
→ 200 {
  score, marks_obtained, total_marks,
  by_subject: [{subject, correct, total, time_avg}],
  by_chapter: [{chapter, correct, total}],
  predicted_rank_range: [low, high],
  recovery_plan: [{day, focus_chapter, activities}]
}
```

##### Logic and edge cases
- **Question selection:** 
  - Determine user's current mastery per chapter from mastery_state.
  - PYQ selection: weighted toward chapters with mastery 0.5-0.8 (marginal zone where mocks teach the most).
  - AI-generated: gpt-4o generates questions calibrated to user mastery using existing quiz infrastructure.
- **Predicted rank computation:**
  - Use historical correlation between mock score and final exam rank (from training data; for MVP, use rough linear model).
  - Adjust for cohort size and time-to-exam.
- **Recovery plan:** Top 5 weak chapters from this mock. Daily activities for next 7 days: review SRS cards + 10 PYQs/day in those chapters.
- **Edge: incomplete mock:** If user abandons mid-mock, save state. On return: option to resume or restart.
- **Edge: cheating:** Mock is for self-assessment, not certification. No anti-cheat needed.

##### UX requirements

Mock test session (full-screen, distraction-free):
```
┌─────────────────────────────────────────┐
│ JEE Main Mock | Q 12/90 | ⏱ 2:47:32     │
├─────────────────────────────────────────┤
│                                         │
│ A particle moves in a circle of radius  │
│ R with constant angular acceleration α. │
│ Its angular velocity changes from ω₀    │
│ to ω in time t. Find the displacement.  │
│                                         │
│  (a) Rω²t/2                            │
│  (b) Rω₀t + Rαt²/2                     │
│  (c) Rαt²                              │
│  (d) Cannot be determined              │
│                                         │
├─────────────────────────────────────────┤
│ [Previous]  [Mark for review]  [Next →] │
└─────────────────────────────────────────┘
```

Analytics screen post-mock (Mode A, deeply data-rich):
- Score banner: "192/300 — top 18% of cohort"
- Predicted rank range
- Subject-wise heatmap
- Time-management chart (time per question vs accuracy)
- Specific wrong-answer breakdown
- "Concepts to review" list
- 7-day recovery plan
- Share button (anonymous score share for cohort)

##### AI requirements
Question generation: existing `/api/generate-quiz` infrastructure.
Rank prediction: simple statistical model for MVP.

##### Dependencies
- F3.1 PYQ database (critical — mock relies on this)
- Existing quiz generation

##### Telemetry
- Mocks taken per user per month
- Completion rate (start → submit)
- Predicted vs actual rank accuracy (long-term metric)
- Recovery plan adherence rate

##### MVP vs full
**MVP (Sprint 3):** JEE Main mock only. Basic analytics.
**Full (Sprint 4+):** All 3 exam types, advanced analytics (compared to cohort average), team mock mode (cohort battle).

---

#### F3.4B — Voice Tutor Call Upgrade (alternative)

##### What it is
The existing voice tutor (5-phase pipeline) is good but reactive. The upgrade: the AI tutor can *initiate* a call. Once a week (or on-demand), the tutor conducts a 5-10 minute oral exam on a chapter the user has been studying. Asks Socratic questions, catches misconceptions, sends a transcript and follow-up SRS cards.

##### Acceptance criteria
- [ ] User can opt-in to weekly voice tutor calls.
- [ ] User chooses preferred day/time.
- [ ] On scheduled time, push notification: "Your tutor is ready to chat. 5 minutes."
- [ ] Tap notification → enters voice call interface.
- [ ] Tutor introduces topic, asks questions, gets answers, follows up.
- [ ] Voice quality: natural-sounding TTS, interrupt-tolerant.
- [ ] After call: transcript, key concepts discussed, follow-up SRS cards generated.
- [ ] Languages: English MVP. Hindi/Hinglish in Sprint 4+.
- [ ] Pro tier only (operational cost).

##### Database changes
```sql
CREATE TABLE IF NOT EXISTS voice_tutor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  topic TEXT,
  transcript TEXT,
  concepts_discussed TEXT[],
  follow_up_cards_generated INT,
  user_satisfaction_rating INT,  -- 1-5, asked post-call
  technical_quality TEXT  -- 'good' | 'fair' | 'poor', auto-detected
);
```

##### API contracts and logic
Extends existing `/api/voice/*` endpoints. New scheduling logic. Same TTS+STT infrastructure.

##### Why F3.4A might be the better choice
- Mock simulator has higher retention impact (weekly ritual vs. opt-in periodic).
- Mock simulator builds directly on PYQ corpus, doubling the value of Sprint 3 work.
- Mock simulator is less risky technically (no real-time voice complexity).
- Mock simulator is more demonstrable to investors.
- Voice tutor is a "neat" feature but doesn't move retention math as much.

Decision: build F3.4A. If extra time, *then* F3.4B.

---

## Cross-feature dependencies map

```
F1.1 (Foundation)
    │
    ├── F1.2 (Empty State) ────┐
    │                          │
    ├── F1.3 (Peer Percentile)─┼── Sprint 1 ships these
    │                          │
    ├── F1.4 (Brain Map) ──────┘
    │
    ├── F1.5 (Onboarding) ────────┐
    │                             ├── → F2.2 (Cohort)
    └── F1.6 (Pricing) ───────────┘

F2.1 (Audio Briefing) ── needs ── F2.3 (Push)
F2.2 (Cohort) ── needs ── F1.5 (Onboarding)
F2.4 (Streak Freeze) ── independent
F2.5 (Photo Doubt) ── needs ── F1.1 (Foundation)

F3.1 (PYQ Database) ── independent (content work)
F3.2 (FSRS) ── independent
F3.3 (Decompression) ── needs ── 2 weeks shadow data first
F3.4A (Mock Simulator) ── needs ── F3.1 (PYQ Database)
```

Critical path: F1.1 → F1.5 → F2.2 → F3.4A. If any link slips, downstream slips.

---

*Next: `RETENTION_ENGINE_BLUEPRINT.md` for the mechanics that bind these features together into daily/weekly/cycle habits.*
