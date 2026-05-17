# Sprint 03 — Implementation
*Weeks 9-12: PYQ Engine, FSRS Scheduler, Mock Simulator, Decompression Mode, Polish*
*For: Ask-My-Notes solo founder — Claude Code execution-ready*
*Date: May 2026*

---

## 0. The explicit cut list for Sprint 3

By Week 9, reality has hit. You are tired. Some Sprint 2 tasks slipped. **This is normal and planned for.** Before starting Sprint 3, read this section and decide what to cut.

### Cut order (cut from top first)
1. **Voice Tutor Call upgrade (F3.4B)** — DEFAULT CUT. Already decided in `ELITE_FEATURE_ARCHITECTURE.md`. Mock Simulator chosen instead.
2. **Anki import (Sprint 3 stretch)** — defer to Sprint 4 unless you're ahead of schedule.
3. **NEET Mock Simulator** — ship JEE Main mock first; NEET mock can wait.
4. **JEE Advanced Mock Simulator** — same as above.
5. **Family tier polish from Sprint 2** — if it slipped, defer permanently. Family tier customers are <5% of revenue in 90 days.
6. **PYQ content beyond 500 questions** — stretch goal. 500 is the bar; 1000 is the dream.
7. **Decompression Mode advanced features** (sentiment-based detection from chat) — ship rule-based only.

### Never cut (mandatory by end of Sprint 3)
- PYQ database (≥500 questions tagged + indexed)
- PYQ SEO pages (≥20 indexed)
- FSRS scheduler (replacing SM-2)
- JEE Main Mock Simulator (basic version)
- Decompression Mode (shadow → live)
- Pre-exam mode transitions (T-30/T-7/T-1)
- Post-exam pivot screen (T+1)
- Lighthouse mobile ≥90 final pass

### Decision: review your Sprint 2 status before reading further

If <80% of Sprint 2 done test passed, cut Voice Tutor + NEET Mock + Family tier polish + Anki import without hesitation. Focus on the never-cut list.

---

## Sprint 3 outcome targets

By end of Week 12:
- 500+ PYQs tagged + indexed + searchable
- 20+ PYQ SEO pages indexed in Google
- FSRS scheduler live, SM-2 cards migrated
- JEE Main Mock Simulator working end-to-end
- Decompression detection live (post-shadow-mode)
- T-30/T-7/T-1 pre-exam UI transitions working
- T+1 post-exam pivot screen working
- Lighthouse mobile ≥90 on key pages
- First 3 organic creator partnerships in motion
- Day-30 retention ≥22%
- 100+ paying users
- Product presentable to seed investors

---

## Week 9 — PYQ Database + Content Engine

The goal of Week 9: **build the corpus that becomes the SEO + retention moat.** This week has ~30 hours of content curation work alongside engineering. The corpus is the moat; the engineering is the wrapper.

---

### Day 41 (Monday) — PYQ schema + ingestion API

**Acceptance criteria:**
- [ ] `pyqs` table created with all metadata fields
- [ ] `pyq_attempts` table created
- [ ] Vector embedding column on `pyqs`
- [ ] Indexes on exam, year, subject, chapter, concepts (GIN), embedding (ivfflat)
- [ ] `/api/admin/pyqs/ingest` endpoint (founder-only) for bulk insertion
- [ ] Auto-classification on ingestion (chapter + concepts via gpt-4o)

**Claude Code prompt:**

```
TASK: PYQ database schema + ingestion pipeline
SPRINT: 3, Week 9, Day 41
ARCHITECTURE REFERENCE: ELITE_FEATURE_ARCHITECTURE.md F3.1

ACCEPTANCE CRITERIA:
- Migration: pyqs + pyq_attempts tables
- pyqs has all metadata + embedding(1536) + slug (URL-friendly)
- Indexes: composite on (exam_type, exam_year, subject), GIN on concepts[], ivfflat on embedding
- /api/admin/pyqs/ingest endpoint:
  - Founder-only (env-gated email allowlist)
  - Accepts JSON array of PYQ data
  - For each PYQ:
    1. If chapter/concepts missing, auto-classify via gpt-4o
    2. Generate embedding of question_text
    3. Generate slug from exam-year-subject-chapter-id
    4. Insert into pyqs
- Bulk import script: scripts/import-pyqs.js (reads CSV/JSON, calls ingest API)

Files to create:
- supabase/migrations/<ts>_pyqs_schema.sql
- app/api/admin/pyqs/ingest/route.js
- lib/pyqs/autoClassify.js
- lib/pyqs/slugGenerator.js
- scripts/import-pyqs.js (Node script for bulk import)

Schema:
CREATE TABLE IF NOT EXISTS pyqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  exam_type TEXT NOT NULL,
  exam_year INT NOT NULL,
  exam_session TEXT,
  subject TEXT NOT NULL,
  chapter TEXT,
  concepts TEXT[],
  question_text TEXT NOT NULL,
  question_image_url TEXT,
  options JSONB,
  correct_answer TEXT,
  solution_text TEXT,
  solution_image_url TEXT,
  difficulty TEXT,
  mark_weight INT,
  question_type TEXT,
  embedding vector(1536),
  source_attribution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX pyqs_exam_year_subject_idx ON pyqs (exam_type, exam_year, subject);
CREATE INDEX pyqs_chapter_idx ON pyqs (chapter);
CREATE INDEX pyqs_concepts_idx ON pyqs USING GIN (concepts);
CREATE INDEX pyqs_embedding_idx ON pyqs USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX pyqs_slug_idx ON pyqs (slug);

CREATE TABLE IF NOT EXISTS pyq_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pyq_id UUID NOT NULL REFERENCES pyqs(id) ON DELETE CASCADE,
  user_answer TEXT,
  is_correct BOOLEAN,
  time_taken_seconds INT,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX pyq_attempts_user_idx ON pyq_attempts (user_id, attempted_at DESC);

ALTER TABLE pyqs ENABLE ROW LEVEL SECURITY;
-- pyqs are publicly readable (SEO)
CREATE POLICY "pyqs_public_read" ON pyqs FOR SELECT USING (true);

ALTER TABLE pyq_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pyq_attempts_owner_all" ON pyq_attempts 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

Ingest endpoint (founder-only):
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',');
const user = await verifyAuth(req);
if (!ADMIN_EMAILS.includes(user.email)) return 403;

Auto-classify pattern:
async function autoClassifyPyq(pyq) {
  if (pyq.chapter && pyq.concepts) return pyq; // already classified
  const result = await callOpenAI({
    model: 'gpt-4o-mini',
    prompt: PYQ_CLASSIFY_PROMPT.render({ 
      question: pyq.question_text,
      subject: pyq.subject,
      exam: pyq.exam_type 
    }),
    response_format: { type: 'json_object' }
  });
  return { ...pyq, ...result };
}

VERIFICATION:
1. Bulk import 50 PYQs → all rows inserted with embeddings
2. Vector search returns relevant matches
3. Auto-classification works
4. Non-admin user gets 403 on ingest endpoint
```

**Time estimate:** 5-6 hours.

---

### Day 42 (Tuesday) — PYQ search + public pages

**Acceptance criteria:**
- [ ] `/api/pyqs/search` with filters (exam, year, subject, chapter, difficulty)
- [ ] `/api/pyqs/<slug>` returns single PYQ (public, no auth)
- [ ] `/pyqs` browse page with filter chips
- [ ] `/pyqs/<slug>` individual question page (SEO-optimized)
- [ ] Server-rendered with schema.org markup
- [ ] Sitemap.xml includes all PYQ URLs

**Claude Code prompt:**

```
TASK: PYQ search + public SEO pages
SPRINT: 3, Week 9, Day 42
ARCHITECTURE REFERENCE: ELITE_FEATURE_ARCHITECTURE.md F3.1

ACCEPTANCE CRITERIA:
- /api/pyqs/search:
  - Query params: exam, year, subject, chapter, difficulty, page (1-indexed), per_page
  - Returns: { results: [], total, page, has_more }
- /api/pyqs/<slug> (public, no auth):
  - Returns full PYQ data
  - Cache headers (max-age=3600)
- /pyqs page (browse):
  - Filter chips at top
  - Paginated list (20 per page)
  - Click PYQ → /pyqs/<slug>
- /pyqs/<slug> page:
  - Server-rendered with Next.js SSR
  - schema.org Educational Question markup
  - Question + image (if any)
  - Difficulty + tags
  - "Try yourself" before showing solution
  - Solution with step-by-step
  - 3-5 similar PYQs at bottom
  - "Practice 20 similar" CTA → signup if not logged in
- sitemap.xml dynamically generated to include all PYQ URLs

Files to create:
- app/api/pyqs/search/route.js
- app/api/pyqs/[slug]/route.js
- app/pyqs/page.js (browse)
- app/pyqs/[slug]/page.js (individual)
- app/sitemap.ts (Next.js sitemap)

SSR pattern for SEO:
export async function generateMetadata({ params }) {
  const pyq = await getPyqBySlug(params.slug);
  return {
    title: `${pyq.exam_type.toUpperCase()} ${pyq.exam_year} - ${pyq.chapter} | Ask-My-Notes`,
    description: pyq.question_text.slice(0, 160),
    openGraph: { /*...*/ },
  };
}

schema.org markup pattern (inline JSON-LD):
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Question",
  "name": "{question_text}",
  "text": "{question_text}",
  "acceptedAnswer": {
    "@type": "Answer",
    "text": "{solution_text}"
  },
  "educationalAlignment": {
    "@type": "AlignmentObject",
    "alignmentType": "educationalSubject",
    "targetName": "{subject} - {chapter}",
  }
}
</script>

Sitemap (app/sitemap.ts):
export default async function sitemap() {
  const pyqs = await supabase.from('pyqs').select('slug, updated_at');
  return pyqs.data.map(p => ({
    url: `https://ask-my-notes.com/pyqs/${p.slug}`,
    lastModified: p.updated_at,
    changeFrequency: 'monthly',
    priority: 0.7
  }));
}

VERIFICATION:
1. /pyqs page lists PYQs with filters
2. /pyqs/<slug> renders SSR-correctly (View Source shows full content)
3. Lighthouse SEO score on PYQ page ≥95
4. /sitemap.xml lists all PYQ URLs
5. Schema.org validator passes for /pyqs/<slug>
6. Google Search Console can see at least one PYQ indexed within 48h
```

**Time estimate:** 5-6 hours.

---

### Day 43-45 (Wed-Fri) — Manual PYQ curation (PARALLEL TRACK)

**This is the moat work.** Set aside 6+ hours these 3 days for manual content curation.

### Curation tasks:

**Day 43 — Source acquisition (4 hours):**
- Download official JEE Main papers from NTA archive (2018-2024 = 28 sessions × ~90 questions = ~2500 questions available)
- Download official NEET UG papers (2018-2024 = 7 papers × 200 = 1400 questions)
- Note legal status: official NTA papers are publicly distributed, fair use for educational purposes when citing source

**Day 44 — Bulk ingestion + tagging (6 hours):**
- Run bulk ingest for 200-300 questions
- Spot-check auto-classification accuracy (sample 20, fix errors)
- For each PYQ, verify: chapter assignment, difficulty, mark weight, options correct, solution provided
- Target by end of Day 44: 300 PYQs tagged + indexed

**Day 45 — Quality pass + SEO check (5 hours):**
- Review top 50 most-popular topics (by user mastery data)
- Ensure PYQs exist for each topic
- Manually write better solutions for 30 high-traffic PYQs
- Submit sitemap.xml to Google Search Console
- Verify 10+ PYQ pages indexed
- Goal: 500 PYQs by end of Day 45

**Tooling for curation:**
- A simple admin UI at `/admin/pyqs/curate` for batch tagging
- Spreadsheet workflow: CSV → import script → API
- Admin can edit individual PYQs at `/admin/pyqs/<id>/edit`

```
TASK: Build admin curation UI
SPRINT: 3, Week 9, Day 43 (parallel with content work)

ACCEPTANCE CRITERIA:
- /admin/pyqs route (founder-only)
- List view: filter by exam/year/subject, show classification status
- Edit individual PYQ: chapter, concepts, difficulty, solution text
- Bulk operations: re-classify selection, batch-tag
- "Quality flag" for PYQs needing review

Files to create:
- app/admin/pyqs/page.js
- app/admin/pyqs/[id]/edit/page.js
- app/api/admin/pyqs/<id>/route.js (PATCH)
```

**Time estimate (engineering side):** 3 hours for admin UI. Content curation is separate from coding.

---

### Day 45 (Friday) — PYQ AI search + practice mode

**Acceptance criteria:**
- [ ] `/api/pyqs/ai-query` accepts natural language → parses to filters
- [ ] `/api/pyqs/practice` generates a practice set of N PYQs
- [ ] Q&A flow can answer "show me JEE Main mechanics PYQs from 2018-2022"
- [ ] PYQ practice mode UI: take N questions, see score, see solutions

**Claude Code prompt:**

```
TASK: PYQ AI search + practice mode
SPRINT: 3, Week 9, Day 45
ARCHITECTURE REFERENCE: ELITE_FEATURE_ARCHITECTURE.md F3.1

ACCEPTANCE CRITERIA:
- /api/pyqs/ai-query: 
  - Body: { query: "natural language" }
  - Parses via gpt-4o-mini to structured filters
  - Returns matching PYQs (top 20)
- /api/pyqs/practice:
  - Body: { exam, subjects, chapters?, count: 20 }
  - Returns 20 PYQs, weighted toward user's weak chapters
- /api/pyqs/submit:
  - Body: { pyq_id, user_answer, time_taken_seconds }
  - Returns: { is_correct, solution_text, similar_pyqs }
- /pyqs/practice route: practice mode UI
- Q&A integration: if classifier detects "PYQ search" intent, route to /api/pyqs/ai-query

Files to create:
- app/api/pyqs/ai-query/route.js
- app/api/pyqs/practice/route.js
- app/api/pyqs/submit/route.js
- app/pyqs/practice/page.js

AI query parser prompt:
"Parse this PYQ search query into structured filters. Return JSON with: exam, year_range, subject, chapter, difficulty, mark_weight."

Practice mode UI:
- Single PYQ at a time, multi-step navigation
- Timer
- Submit answer → see correct + explanation
- "Try similar" or "Next question"
- End: score + breakdown

VERIFICATION:
1. AI query "JEE Main rotational dynamics 4-mark 2018-2022" → returns matching PYQs
2. Practice mode generates 20 questions
3. Submit answer → correct/incorrect + solution
4. Tier limits: free user limited (10/day), paid unlimited
```

**Time estimate:** 5 hours.

---

### Week 9 done test

```
[ ] PYQ schema + 500+ questions indexed
[ ] /pyqs browse page works
[ ] /pyqs/<slug> SEO pages SSR-rendered
[ ] Sitemap submitted to Google
[ ] 10+ pages indexed within 48h
[ ] Admin curation UI usable
[ ] AI search + practice mode working
[ ] Vector search returns sensible results
```

---

## Week 10 — FSRS Scheduler + Decompression (Shadow)

The goal of Week 10: **upgrade SRS to FSRS + start decompression detection in shadow mode.** FSRS is invisible to users but improves study efficiency. Decompression mode is the care pillar made real.

---

### Day 46 (Monday) — FSRS implementation

**Acceptance criteria:**
- [ ] `lib/fsrs/scheduler.js` implements FSRS algorithm
- [ ] Existing SM-2 cards migrated to FSRS state
- [ ] Card review API updates use FSRS
- [ ] Mastery scoring uses FSRS retrievability

**Claude Code prompt:**

```
TASK: Implement FSRS scheduler, migrate from SM-2
SPRINT: 3, Week 10, Day 46
ARCHITECTURE REFERENCE: ELITE_FEATURE_ARCHITECTURE.md F3.2

ACCEPTANCE CRITERIA:
- Migration adds FSRS columns to spaced_repetition_cards:
  - fsrs_stability FLOAT
  - fsrs_difficulty FLOAT
  - fsrs_state TEXT ('new' | 'learning' | 'review' | 'relearning')
  - fsrs_last_review TIMESTAMPTZ
  - fsrs_lapses INT DEFAULT 0
- New table: fsrs_parameters (user_id, w[], desired_retention, maximum_interval_days)
- lib/fsrs/scheduler.js implements:
  - schedule(card, rating) → updated card
  - retrievability(card, now) → 0-1 probability
- Migration job converts SM-2 → FSRS state:
  - new cards: fsrs_state='new'
  - reviewed cards: fsrs_state='review', stability=interval_days, difficulty=5.0 - (ease - 1.3) * 4
- /api/cards/<id>/review updated to use FSRS
- Mastery scoring updated to use retrievability instead of SM-2 ease

Files to create:
- supabase/migrations/<ts>_fsrs_columns.sql
- lib/fsrs/scheduler.js (port from open-source ts-fsrs or implement from spec)
- scripts/migrate-sm2-to-fsrs.js

Files to modify:
- app/api/cards/[id]/review/route.js
- lib/mastery/score.js (or wherever mastery is computed)

FSRS algorithm:
Use ts-fsrs library: npm install ts-fsrs
import { FSRS, Rating, State, generatorParameters } from 'ts-fsrs';
const params = generatorParameters({ enable_fuzz: true });
const fsrs = new FSRS(params);

When reviewing:
const card = fetchCard();
const now = new Date();
const result = fsrs.repeat(card, now);
// result[Rating.Again|Hard|Good|Easy].card → new state
const updated = result[rating].card;
saveCard(updated);

Migration script:
async function migrateSM2ToFSRS() {
  const cards = await supabase.from('spaced_repetition_cards').select('*').is('fsrs_state', null);
  for (const card of cards) {
    if (card.repetition === 0) {
      card.fsrs_state = 'new';
    } else {
      card.fsrs_state = 'review';
      card.fsrs_stability = card.interval_days || 1;
      card.fsrs_difficulty = Math.max(1, Math.min(10, 5.0 - (card.ease_factor - 1.3) * 4));
      card.fsrs_last_review = card.last_reviewed_at;
    }
    await supabase.from('spaced_repetition_cards').update(card).eq('id', card.id);
  }
}

VERIFICATION:
1. Migration script runs successfully → all cards have FSRS state
2. Review a card → updated FSRS stability + scheduled next review
3. Mastery score for a concept reflects FSRS retrievability
4. No regressions in card review UI
```

**Time estimate:** 5-6 hours.

---

### Day 47 (Tuesday) — Decompression detection (shadow mode)

**Acceptance criteria:**
- [ ] `decompression_triggers` table created
- [ ] Trigger detection runs (server-side or client-side, depending on signal)
- [ ] All triggers logged but NO user-facing intervention
- [ ] Shadow mode runs 2 weeks before going live

**Claude Code prompt:**

```
TASK: Decompression detection — shadow mode
SPRINT: 3, Week 10, Day 47
ARCHITECTURE REFERENCE: ELITE_FEATURE_ARCHITECTURE.md F3.3 + RETENTION_ENGINE_BLUEPRINT.md Section 8

ACCEPTANCE CRITERIA:
- Schema: decompression_triggers table
- 5 trigger types implemented as detection logic:
  1. long_session (>180 min continuous)
  2. accuracy_drop (<50% on current session)
  3. repeat_errors (3+ wrong on same concept in session)
  4. late_night (active studying 11pm+, outside declared window)
  5. app_anxiety (10+ pageviews in 30 min, no session started)
- Each trigger logs to decompression_triggers with context
- SHADOW MODE: log only, no UI intervention
- /admin/decompression dashboard to monitor trigger rates

Files to create:
- supabase/migrations/<ts>_decompression_triggers_schema.sql
- lib/care/decompressionDetector.js
- app/api/care/decompression/log/route.js
- app/admin/decompression/page.js

Schema:
CREATE TABLE IF NOT EXISTS decompression_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  trigger_type TEXT,
  context JSONB,
  user_response TEXT,
  responded_at TIMESTAMPTZ,
  shadow_mode BOOLEAN DEFAULT TRUE
);
CREATE INDEX decompression_user_idx ON decompression_triggers (user_id, triggered_at DESC);

Detection patterns:
// long_session: check every 5 min during active session
async function checkLongSession(userId, sessionStart) {
  const duration = (Date.now() - sessionStart) / 1000 / 60;
  if (duration > 180) {
    await logTrigger(userId, 'long_session', { duration_minutes: duration });
  }
}

// accuracy_drop: after each quiz answer in session
async function checkAccuracyDrop(userId, sessionAnswers) {
  if (sessionAnswers.length < 5) return;
  const last10 = sessionAnswers.slice(-10);
  const accuracy = last10.filter(a => a.correct).length / last10.length;
  if (accuracy < 0.5) {
    await logTrigger(userId, 'accuracy_drop', { recent_accuracy: accuracy });
  }
}

// late_night: scheduled check at 11pm + each minute
async function checkLateNight(userId) {
  const hour = getUserLocalHour(userId);
  if (hour >= 23 || hour < 1) {
    const declaredWindow = await getStudyWindow(userId);
    if (declaredWindow !== 'late_night') {
      await logTrigger(userId, 'late_night', { hour });
    }
  }
}

// app_anxiety: client-side tracking, posted server-side
// 10+ pageviews in 30 min without session start

Frequency cap (for live mode later):
- Max 2 triggers acted upon per user per day
- 30-min dedup window per trigger type

VERIFICATION:
1. Test scenarios trigger correctly
2. decompression_triggers rows logged
3. /admin/decompression shows daily aggregates
4. No user-facing UI yet (shadow mode confirmed)
5. After 2 weeks: review trigger rates, calibrate thresholds, plan live launch
```

**Time estimate:** 5 hours.

---

### Day 48 (Wednesday) — Pre-exam mode transitions

**Acceptance criteria:**
- [ ] T-30: cycle marker screen + Briefing tone shift + Decompression nudges increase
- [ ] T-7: lockdown lite (no new chapters, only review)
- [ ] T-1: lockdown full + "Tomorrow. You're ready. Sleep early."
- [ ] T-0: exam day silence (all notifications off, special screen)
- [ ] All pricing/upsell surfaces hidden during T-30 to T-1

**Claude Code prompt:**

```
TASK: Pre-exam mode transitions (T-30, T-7, T-1, T-0)
SPRINT: 3, Week 10, Day 48
ARCHITECTURE REFERENCE: RETENTION_ENGINE_BLUEPRINT.md Section 4 (Cycle phases) + STUDENT_PSYCHOLOGY_EXECUTION.md Section 7-8

ACCEPTANCE CRITERIA:
- Compute days_to_exam from profile.exam_date
- UI state determined by days_to_exam:
  - >30: normal
  - 30 to 8: "pre-exam tension" mode (subtle)
  - 7 to 2: "lockdown lite" (no new content offered)
  - 1: "lockdown full" (calming UI)
  - 0: "exam day" (silent)
- T-30 marker: special screen on first open: "30 days. The hardest 30. We're with you."
- T-7 marker: special screen: "Seven days. You've built a Brain Map of N concepts."
- T-1 marker: "Tomorrow. You're ready. Sleep early. We're here."
- T-0 screen: "We're with you today. Come back tomorrow."
- Notification dispatcher checks days_to_exam:
  - T-7 to T-1: reduce frequency
  - T-0: skip entirely
- Hide pricing/upsell during T-30 to T-1
- Suppress new feature push during T-30 to T-1

Files to create:
- lib/cycle/examPhase.js (computes phase)
- components/cycle/CycleMarker.jsx (special screens)
- components/cycle/ExamDayScreen.jsx

Files to modify:
- Dashboard component (check phase, render markers)
- Notification dispatcher (check phase, modify behavior)
- Any pricing surface (hide if in pre-exam phase)

Phase logic:
function determineCyclePhase(examDate) {
  if (!examDate) return 'no_exam';
  const days = differenceInDays(examDate, new Date());
  if (days < 0) return 'post_exam';
  if (days === 0) return 'exam_day';
  if (days === 1) return 'lockdown_full';
  if (days <= 7) return 'lockdown_lite';
  if (days <= 30) return 'pre_exam_tension';
  if (days <= 60) return 'final_push';
  return 'building';
}

Marker shown logic:
- On first dashboard open of the day in T-30/T-7/T-1: show marker as full-screen, then close to dashboard
- Track shown date in localStorage to prevent re-showing same day

CRITICAL UX rules during T-30 to T-1:
- Hide aggressive metric pulses
- Hide pricing reminders
- Hide upsell prompts
- Surface "anxiety supports" (existing breathing exercise if any, or text reassurance)
- Brain Map review animations more prominent

VERIFICATION:
1. Set test user's exam_date to today → exam day screen shown
2. Set to tomorrow → T-1 marker on next open
3. Set to 7 days from now → T-7 marker, lockdown lite active
4. Set to 30 days → T-30 marker
5. Notifications skipped on T-0
```

**Time estimate:** 5 hours.

---

### Day 49 (Thursday) — Post-exam pivot screen (T+1)

**Acceptance criteria:**
- [ ] Day after exam: special "How did it go?" screen on first open
- [ ] 4 options: did okay, did fine, did rough, don't want to talk
- [ ] T+1 to T+7: reduced notification frequency, no upsell, no feature push
- [ ] T+7: gentle pivot conversation

**Claude Code prompt:**

```
TASK: Post-exam pivot — T+1 special screen + T+1 to T+7 reduced frequency
SPRINT: 3, Week 10, Day 49
ARCHITECTURE REFERENCE: RETENTION_ENGINE_BLUEPRINT.md Section 4 (Phase E) + STUDENT_PSYCHOLOGY_EXECUTION.md Section 9

ACCEPTANCE CRITERIA:
- T+1 first open: special screen, not the regular dashboard
- Screen: "Yesterday was a big day. However it went, you did the thing. Tell me how it went — or take your time."
- 4 options:
  - Did okay / better than expected
  - Did fine — wait and see
  - Did rough — needed to vent
  - Don't want to talk about it yet
- Each option leads to a calibrated conversational flow
- T+1 to T+7: notification frequency reduced (1/day max), no upsell, no pricing reminders
- T+7+: gentle "what's next" pivot conversation

Files to create:
- app/post-exam/page.js
- components/cycle/PostExamFlow.jsx

Files to modify:
- Dashboard / middleware: redirect to /post-exam on T+1 if no response yet
- Notification dispatcher: detect T+1 to T+7, reduce frequency
- ProfilesData add: post_exam_response, post_exam_responded_at

UX flow:
1. T+1, user opens app → /post-exam screen
2. Pick option → store in profile.post_exam_response
3. Calibrated next-step:
   - "Did okay": optional pivot to next phase (JEE Adv if Main was T-0)
   - "Did fine": wait-and-see, app stays quiet for a week
   - "Did rough": vent flow, then "let's wait" suggestion
   - "Don't want to talk": "Take your time. I'll be here when you're ready." → dashboard, but quiet
4. T+1 to T+7: dashboard in "quiet mode" — no metric flashing, no feature pushes

VERIFICATION:
1. Test user with exam_date yesterday → /post-exam shown
2. Pick "did rough" → vent flow, no upsell
3. Pick "don't want to talk" → quiet dashboard
4. T+2 to T+7: max 1 notification/day, no upgrade prompts
5. T+8+: regular flow resumes with gentle pivot
```

**Time estimate:** 4 hours.

---

### Day 50 (Friday) — Polish Week 10

Reserved for bugs + edge cases discovered during the week.

---

### Week 10 done test

```
[ ] FSRS scheduler in production
[ ] SM-2 cards migrated to FSRS state
[ ] Decompression detection running in shadow mode
[ ] /admin/decompression dashboard working
[ ] Pre-exam mode transitions implemented (T-30/T-7/T-1)
[ ] Exam day silence (T-0) works
[ ] Post-exam pivot screen (T+1) works
[ ] No regressions
```

---

## Week 11 — Mock Test Simulator + Decompression Live

The goal of Week 11: **the highest-leverage Sprint 3 feature.** Mock Simulator becomes a weekly ritual; Decompression Mode goes live.

---

### Day 51 (Monday) — Mock simulator schema + backend

**Acceptance criteria:**
- [ ] `mock_tests` table created
- [ ] `/api/mock/start` generates question set (JEE Main MVP)
- [ ] Mock state persists (resumable within 24h)
- [ ] Each answer logged

**Claude Code prompt:**

```
TASK: Mock test simulator — backend pipeline
SPRINT: 3, Week 11, Day 51
ARCHITECTURE REFERENCE: ELITE_FEATURE_ARCHITECTURE.md F3.4A

ACCEPTANCE CRITERIA:
- Migration: mock_tests table
- /api/mock/start (POST):
  - Body: { exam_type: 'jee_main' }
  - For JEE Main: 90 questions (30 each Physics/Chem/Math), 3 hours, +4/-1
  - Question mix: 70% from pyqs (weighted toward user's weak chapters), 30% AI-generated
  - Returns: { mock_id, questions, duration_minutes, marking_scheme }
- /api/mock/submit-answer (POST):
  - Body: { mock_id, question_idx, answer, time_seconds }
  - Logs but doesn't reveal correctness yet
- /api/mock/complete (POST):
  - Body: { mock_id }
  - Computes score, by-subject breakdown, predicted rank range
  - Returns full analytics + recovery plan

Files to create:
- supabase/migrations/<ts>_mock_tests_schema.sql
- app/api/mock/start/route.js
- app/api/mock/submit-answer/route.js
- app/api/mock/complete/route.js
- lib/mock/questionSelection.js (70/30 mix)
- lib/mock/rankPrediction.js
- lib/mock/recoveryPlan.js

Schema:
CREATE TABLE IF NOT EXISTS mock_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_type TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_questions INT,
  questions JSONB,
  answers JSONB DEFAULT '[]',
  score INT,
  marks_obtained INT,
  total_marks INT,
  topic_breakdown JSONB,
  predicted_rank_range INT[],
  status TEXT DEFAULT 'active',  -- 'active' | 'completed' | 'abandoned'
  duration_seconds INT
);
CREATE INDEX mock_tests_user_idx ON mock_tests (user_id, completed_at DESC NULLS LAST);

ALTER TABLE mock_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mock_tests_owner_all" ON mock_tests 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

Question selection algorithm:
async function selectQuestionsForMock(userId, examType) {
  // Get user's chapter mastery
  const weakChapters = await getWeakChapters(userId); // mastery 0.4-0.75
  
  // 70% from PYQs, weighted toward weak chapters
  const pyqCount = Math.floor(90 * 0.7);  // 63 PYQs
  const pyqs = await selectPyqsForMock(examType, weakChapters, pyqCount);
  
  // 30% AI-generated, calibrated to user mastery
  const aiCount = 90 - pyqs.length;  // 27 generated
  const generated = await generateMockQuestions(userId, examType, aiCount);
  
  // Interleave by subject (30 Physics + 30 Chem + 30 Math for JEE Main)
  return interleaveBySubject([...pyqs, ...generated]);
}

Rank prediction (rough linear model for MVP):
function predictRankRange(marksObtained, totalMarks, examType, cohortSize) {
  const percentage = marksObtained / totalMarks;
  // Rough historical data: JEE Main 65% ≈ top 20K, 80% ≈ top 5K
  const rankMidpoint = examType === 'jee_main' 
    ? Math.max(100, 100000 * Math.exp(-4 * percentage))
    : 30000 * Math.exp(-4 * percentage);
  const spread = rankMidpoint * 0.3;  // ±30% range
  return [Math.floor(rankMidpoint - spread), Math.ceil(rankMidpoint + spread)];
}

Recovery plan generation:
async function generateRecoveryPlan(mockResults, userId) {
  // Top 5 weak chapters from this mock
  const weakChapters = mockResults.byChapter
    .filter(c => c.accuracy < 0.6)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5);
  
  // For each, daily activities for next 7 days
  return weakChapters.map((chapter, i) => ({
    day: i + 1,
    focus_chapter: chapter.name,
    activities: [
      `Review SRS cards for ${chapter.name} (10 min)`,
      `Practice 5 PYQs in ${chapter.name} (20 min)`,
      `One concept deep-dive with tutor (15 min)`
    ]
  }));
}

VERIFICATION:
1. POST /api/mock/start → returns 90 questions
2. Question mix: 70% PYQs, 30% AI
3. Distribution: 30 each Physics/Chem/Math
4. Answers logged
5. Complete mock → analytics + recovery plan returned
```

**Time estimate:** 6-7 hours.

---

### Day 52 (Tuesday) — Mock simulator UI

**Acceptance criteria:**
- [ ] /mock route launches mock test
- [ ] Full-screen distraction-free interface
- [ ] Real-time timer with subject-switch tracking
- [ ] Pause + resume (within 24h)
- [ ] Mark for review feature
- [ ] Question navigation panel

**Claude Code prompt:**

```
TASK: Mock test simulator — UI
SPRINT: 3, Week 11, Day 52
ARCHITECTURE REFERENCE: ELITE_FEATURE_ARCHITECTURE.md F3.4A + UI_UX_SYSTEM.md

ACCEPTANCE CRITERIA:
- /mock/start: confirmation screen + launch
- /mock/<id>: active mock session, full-screen
- UI elements:
  - Top bar: exam name | Q X/90 | timer 2:47:32
  - Question + image + 4 options
  - Bottom: [Previous] [Mark for review] [Next →]
  - Side panel: question grid (visual map of answered/unanswered/marked)
- Real-time timer (counts down from duration_minutes)
- Auto-save answer to backend on selection
- Pause: closes mock, can resume from /mock/active
- Submit: triggers /api/mock/complete → /mock/<id>/results

Files to create:
- app/mock/start/page.js
- app/mock/[id]/page.js
- app/mock/[id]/results/page.js
- components/mock/MockSession.jsx
- components/mock/QuestionGrid.jsx
- components/mock/MockTimer.jsx
- components/mock/MockResults.jsx
- components/mock/RecoveryPlanCard.jsx

Mock session pattern:
- LocalStorage backup of state (in case of crash)
- Timer pauses on tab inactivity? NO — competitive exams don't pause for distractions
- Submit modal on timeout
- Submit confirmation prompt (5-min warning)

Results screen:
- Score banner
- Predicted rank range
- Subject heatmap
- Time/accuracy chart
- Wrong answers breakdown
- Recovery plan
- "Share anonymous score" button

VERIFICATION:
1. Start mock → 90 questions load
2. Timer counts down accurately
3. Answer questions → auto-saves
4. Pause → close → resume from same Q
5. Submit → results screen with analytics
6. Recovery plan generated
```

**Time estimate:** 6-7 hours.

---

### Day 53 (Wednesday) — Decompression mode live

**Acceptance criteria:**
- [ ] Decompression triggers from Week 10 now surface UI intervention
- [ ] Single non-modal nudge with 3 options
- [ ] Max 2 nudges/day per user
- [ ] User can disable in settings
- [ ] "Easier" option provides 3 mastered cards

**Claude Code prompt:**

```
TASK: Decompression Mode — live with user-facing intervention
SPRINT: 3, Week 11, Day 53
ARCHITECTURE REFERENCE: ELITE_FEATURE_ARCHITECTURE.md F3.3 + RETENTION_ENGINE_BLUEPRINT.md Section 8

ACCEPTANCE CRITERIA:
- After 2 weeks of shadow mode (verify trigger calibration), shadow_mode=false
- When trigger fires (and frequency cap allows), show non-modal nudge:
  - Top of screen, slides in from top
  - "Take 5? You've been at this 3 hours." (or per-trigger copy)
  - 3 options: [Take a break] [Continue] [Something easier — 3 quick cards]
- Auto-dismiss after 60s if no response
- Log user response
- "Easier" option: GET /api/care/easier-set returns 3 high-mastery cards
- Settings: toggle decompression_enabled

Files to modify:
- lib/care/decompressionDetector.js (set shadow_mode=false)
- Add UI component: components/care/DecompressionNudge.jsx
- App-level component to render nudge based on state

Files to create:
- app/api/care/easier-set/route.js
- components/care/DecompressionNudge.jsx
- hooks/useDecompressionNudge.js

Nudge UX:
- Slide in from top, 250ms ease-out
- Calm colors, no urgency
- Single line + 3 options
- Tap response → animate out + log response
- Auto-dismiss after 60s

Frequency rules:
- Max 2 acted-upon triggers per user per day
- 30-min dedup per trigger type
- Don't fire during Focus Mode (respect deep work)

Copy per trigger:
- long_session: "Take 5? You've been at this 3 hours."
- accuracy_drop: "Tough stretch. Want to try something easier?"
- repeat_errors: "This one's sticky. Step back or push through?"
- late_night: "Late night. Sleep is also study."
- app_anxiety: "I notice you're scrolling. Sleep, one quick win, or just chilling?"

VERIFICATION:
1. Disable shadow_mode for test user
2. Trigger long_session manually → nudge appears
3. Pick "Take a break" → app suggests close
4. Pick "Continue" → nudge dismisses
5. Pick "Easier" → 3 mastered cards shown
6. 3rd trigger same day → suppressed (cap)
7. Settings toggle disables all nudges
```

**Time estimate:** 4 hours.

---

### Day 54 (Thursday) — Brain Map snapshot sharing

**Acceptance criteria:**
- [ ] "Share my Brain Map" button on /brain-map page
- [ ] Generates 1080x1920 image server-side
- [ ] Web Share API on mobile (native share sheet)
- [ ] Download fallback on desktop
- [ ] Image includes anonymous identity (no name leak)

**Claude Code prompt:**

```
TASK: Brain Map snapshot sharing
SPRINT: 3, Week 11, Day 54
ARCHITECTURE REFERENCE: ELITE_FEATURE_ARCHITECTURE.md F1.4 (snapshot) + MOBILE_AND_GAMIFICATION.md Section 5

ACCEPTANCE CRITERIA:
- /api/brain-map/snapshot generates 1080x1920 PNG
- Uses @vercel/og or puppeteer to render
- Image content:
  - "my brain — week N"
  - Visual representation of concept graph (simplified for static render)
  - Stats: N concepts, X strong, Y growing
  - Branding: ask-my-notes
- NO real name, NO percentile, NO identifying info unless user opts in
- Cache result (same day, same user → reuse)
- Share button on /brain-map:
  - Web Share API on mobile → native share sheet
  - Download fallback on desktop
  - Copy URL fallback

Files to create:
- app/api/brain-map/snapshot/route.js
- components/brain-map/ShareButton.jsx
- lib/brainMap/imageRenderer.js

Implementation note:
The Brain Map is interactive (ReactFlow); the snapshot is a STATIC representation. Don't try to render the exact ReactFlow graph. Instead, generate a stylized static composition with the key stats.

Pattern using @vercel/og:
export async function POST(req) {
  const user = await verifyAuth(req);
  const stats = await getBrainMapStats(user.id);
  
  const imageResponse = new ImageResponse(
    <div style={{ width: 1080, height: 1920, display: 'flex', flexDirection: 'column', /*...*/ }}>
      <h1>my brain — week {weekNumber}</h1>
      <div>
        {/* Stylized concept dots arranged */}
        {/* Could be a simple visual: scattered dots colored by mastery */}
      </div>
      <div>{stats.total} concepts</div>
      <div>{stats.strong} strong, {stats.growing} growing</div>
      <footer>ask-my-notes</footer>
    </div>,
    { width: 1080, height: 1920 }
  );
  
  const buffer = await imageResponse.arrayBuffer();
  const path = `brain-map-snapshots/${user.id}/${today()}.png`;
  await supabase.storage.from('brain-map-snapshots').upload(path, buffer);
  const { data: { signedUrl } } = await supabase.storage
    .from('brain-map-snapshots').createSignedUrl(path, 86400);
  
  return Response.json({ url: signedUrl });
}

Client share:
async function shareBrainMap() {
  const res = await fetch('/api/brain-map/snapshot', { method: 'POST' });
  const { url } = await res.json();
  const blob = await (await fetch(url)).blob();
  const file = new File([blob], 'my-brain-map.png', { type: 'image/png' });
  
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: 'My Brain Map',
      files: [file]
    });
  } else {
    // Fallback: download
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-brain-map.png';
    a.click();
  }
}

VERIFICATION:
1. Click "Share my Brain Map" on /brain-map
2. Image generates within 3s
3. Mobile: native share sheet opens (Instagram, WhatsApp, etc.)
4. Desktop: download starts
5. Image has no real name / identifying info
```

**Time estimate:** 5 hours.

---

### Day 55 (Friday) — Week 11 polish

Reserved for bugs + integration testing.

Verify:
- Mock test end-to-end on real device
- Decompression nudges feel right (not annoying, not invisible)
- Brain Map share works on iOS + Android
- All Week 11 features stable

---

### Week 11 done test

```
[ ] JEE Main Mock Simulator working end-to-end
[ ] Mock analytics + recovery plan generated
[ ] Decompression Mode live with user-facing intervention
[ ] Brain Map snapshot sharing works
[ ] Pre-exam transitions tested
[ ] Post-exam pivot tested
[ ] No regressions
```

---

## Week 12 — Polish, Audit, Ship

The goal of Week 12: **ship for users.** No new features. Pure polish, performance, accessibility, content, marketing prep.

---

### Day 56 (Monday) — Lighthouse audit + performance fixes

**Acceptance criteria:**
- [ ] Lighthouse mobile ≥90 on: landing, dashboard, brain map, q&a, pricing, library, mock results, pyqs browse
- [ ] First Contentful Paint ≤1.8s on average 4G
- [ ] Time to Interactive ≤3.5s on Slow 3G
- [ ] Initial JS bundle ≤180KB gzipped

**Tasks:**
- Run Lighthouse on each key page
- Identify top performance issues
- Optimize images (next/image, AVIF/WebP)
- Code-split below-fold sections
- Lazy-load heavy components (ReactFlow, Brain Map)
- Defer non-critical scripts
- Preload key fonts (Inter)
- Service worker caching strategy

**Time estimate:** 6-7 hours.

---

### Day 57 (Tuesday) — Accessibility audit (WCAG AA)

**Acceptance criteria:**
- [ ] axe DevTools shows no critical issues on key pages
- [ ] Keyboard navigation works on all interactive elements
- [ ] Focus visible everywhere
- [ ] Touch targets ≥44×44px on mobile
- [ ] Color contrast ratios meet AA
- [ ] Alt text on all functional images
- [ ] Screen reader test on dashboard

**Tasks:**
- axe DevTools full audit
- Manual keyboard navigation pass
- Mobile touch target audit
- Color contrast verification
- Add missing alt text
- Test with screen reader (VoiceOver on iOS / TalkBack on Android)

**Time estimate:** 4-5 hours.

---

### Day 58 (Wednesday) — Final content + copy pass

**Tasks:**
- Review all user-facing copy against `STUDENT_PSYCHOLOGY_EXECUTION.md`
- Check for forbidden vocabulary (Section 13 of psychology doc)
- Polish empty states
- Polish error messages
- Cancellation flow copy review
- Landing page final polish
- Pricing page final polish

**Time estimate:** 4 hours.

---

### Day 59 (Thursday) — Final testing pass

**Comprehensive smoke test on real devices:**
- [ ] New user signup flow → onboarding → empty state → upload PDF → first Q&A
- [ ] Existing user: login → dashboard mode correctly → ask question → review concepts
- [ ] Mobile signup → PWA install prompt → install → notifications enabled
- [ ] Receive Morning Briefing on phone → tap → app opens to player
- [ ] Photo Doubt Cam workflow on phone
- [ ] Payment flow → trial → upgrade → subscription active
- [ ] Mock test from start to results
- [ ] PYQ search → individual page → "Try yourself"
- [ ] Cohort presence + leaderboard
- [ ] Decompression nudge appears at right moments
- [ ] Pre-exam mode transitions (mock exam date)
- [ ] Pause subscription → data preserved
- [ ] Cancel subscription → polite confirmation
- [ ] Welcome back flow after 8-day absence

**Time estimate:** 5-6 hours including bug fixes.

---

### Day 60 (Friday) — Beta release prep + handoff documentation

**Tasks:**
- [ ] Update README with current state
- [ ] Document all env vars in `.env.example`
- [ ] Create "release notes" v1.0 doc
- [ ] Tag release: `git tag v1.0 && git push --tags`
- [ ] Write founder-narrative blog post: "What 90 days built"
- [ ] Prepare investor-ready demo flow (5 min walk-through)
- [ ] Open issues for known bugs / Sprint 4+ items
- [ ] Take Saturday and Sunday completely off

**Acceptance criteria:**
- [ ] Repository state is handoffable
- [ ] All 14 docs are current
- [ ] Live product matches the spec
- [ ] Founder is rested for Sprint 4 decision-making

**Time estimate:** 4-5 hours.

---

## Sprint 3 done test

```
[ ] 500+ PYQs in database, tagged + indexed
[ ] 20+ PYQ SEO pages indexed in Google
[ ] FSRS scheduler in production
[ ] SM-2 cards migrated to FSRS state
[ ] JEE Main Mock Simulator working end-to-end
[ ] Mock analytics + recovery plan
[ ] Decompression Mode live (post shadow-mode)
[ ] Pre-exam mode transitions (T-30/T-7/T-1)
[ ] Exam day silence (T-0)
[ ] Post-exam pivot screen (T+1)
[ ] Brain Map snapshot sharing
[ ] Lighthouse mobile ≥90
[ ] WCAG AA accessibility
[ ] Day-30 retention ≥22%
[ ] 100+ paying users
[ ] No critical bugs
[ ] Product presentable to seed investors
```

If all checked: 90-day plan succeeded. Tag: `git tag sprint-3-done && git tag v1.0-public-ready && git push --tags`.

---

## What gets cut if Sprint 3 runs over

In order of cut (after the Sprint 3 cut list at top):
1. Brain Map snapshot sharing (Day 54) — defer to Sprint 4
2. Mock simulator polish features (replay, share score) — keep basic submit-and-see-results
3. Decompression Mode advanced features (per-user adaptive thresholds) — keep rule-based defaults
4. Family tier polish — keep what shipped in Sprint 2
5. Friday Quiz polish from Sprint 2 — keep basic version
6. NEET Mock Simulator — JEE Main only is enough for v1.0

Never cut (mandatory v1.0):
- PYQ database (500+ questions)
- 20+ PYQ SEO pages indexed
- FSRS scheduler
- JEE Main Mock Simulator (basic)
- Decompression Mode (rule-based)
- Pre-exam + post-exam UI transitions
- Lighthouse mobile ≥85 (90 is ideal, 85 is acceptable)

---

## After Sprint 3: the 5-day rest mandate

For 5 days after Sprint 3 ends:
- No code commits
- No new feature planning
- Light user feedback only (read, don't respond at length)
- Sleep, eat, walk, see family

The product is shipped. The retention engine is working. The next iteration deserves a rested founder.

Then: read `CLAUDE_CODE_EXECUTION_MASTER.md` Section 12 (end-of-90-days) and plan months 4-6 from the metrics actual performance, not from speculation.

---

*Next (and final): `MVP_CRITICAL_TASKS_AND_HIGH_LEVERAGE_FEATURES.md` — the prioritization document that helps you cut when reality forces it.*
