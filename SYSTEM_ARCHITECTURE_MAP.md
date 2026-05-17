# System Architecture Map — Ask My Notes
*Generated: 2026-05-15*

---

## Table of Contents
1. [System Overview Diagram](#1-system-overview-diagram)
2. [Frontend Architecture](#2-frontend-architecture)
3. [Backend API Architecture](#3-backend-api-architecture)
4. [Database Schema Map](#4-database-schema-map)
5. [AI Pipeline Architecture](#5-ai-pipeline-architecture)
6. [Data Flow Diagrams](#6-data-flow-diagrams)
7. [Realtime Architecture](#7-realtime-architecture)
8. [Authentication Flow](#8-authentication-flow)
9. [Payment Flow](#9-payment-flow)
10. [Component Dependency Tree](#10-component-dependency-tree)

---

## 1. System Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                            │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Next.js App Router                        │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │   │
│  │  │/dashboard│  │ /ask-ai  │  │  /quiz   │  │ /focus   │   │   │
│  │  │/progress │  │ /study   │  │ /exams   │  │/call-tutor│  │   │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │   │
│  │       └─────────────┴─────────────┴──────────────┘         │   │
│  │                           │                                 │   │
│  │              ┌────────────▼────────────┐                   │   │
│  │              │    DashboardContext      │                   │   │
│  │              │  (1,467 lines — global) │                   │   │
│  │              └────────────┬────────────┘                   │   │
│  │                           │ fetch() + supabase client      │   │
│  └───────────────────────────┼─────────────────────────────────┘  │
└──────────────────────────────┼──────────────────────────────────────┘
                               │ HTTPS
            ┌──────────────────┴──────────────────┐
            │                                     │
            ▼                                     ▼
┌───────────────────────┐           ┌─────────────────────────┐
│  Next.js API Routes   │           │   Supabase Client SDK   │
│  (58+ route handlers) │           │  (browser-side queries) │
│                       │           └──────────┬──────────────┘
│  /api/ask             │                      │
│  /api/process-pdf     │           ┌──────────▼──────────────┐
│  /api/progress/*      │           │        Supabase          │
│  /api/cards/*         │           │  ┌─────────────────────┐│
│  /api/voice/*         │──────────▶│  │   PostgreSQL + RLS   ││
│  /api/payments/*      │ service   │  │   + pgvector        ││
│  /api/events          │ role key  │  ├─────────────────────┤│
│  /api/weak-topics     │           │  │   Supabase Auth     ││
│  /api/exam            │           │  │   (GoTrue + JWT)    ││
│  ...                  │           │  ├─────────────────────┤│
└──────────┬────────────┘           │  │   Supabase Storage  ││
           │                        │  │   (PDF files)       ││
           │ API calls              │  ├─────────────────────┤│
           ▼                        │  │  Supabase Realtime  ││
┌──────────────────────┐            │  │  (CDC WebSocket)    ││
│    OpenAI API        │            │  └─────────────────────┘│
│  ┌────────────────┐  │            └─────────────────────────┘
│  │ gpt-4o-mini    │  │
│  │ gpt-4o         │  │                      │
│  │ text-embed-3-sm│  │                      │ CDC events
│  └────────────────┘  │                      ▼
└──────────────────────┘            ┌─────────────────────────┐
                                    │  useRealtimeProgress()   │
┌──────────────────────┐            │  7 table subscriptions  │
│    Razorpay API      │            │  500ms debounce         │
│  (payment gateway)   │            │  60s polling fallback   │
└──────────────────────┘            └─────────────────────────┘
```

---

## 2. Frontend Architecture

### Context Provider Tree
```
<ThemeProvider>                    ← theme: dark|light|gradient
  <TrackingProvider>               ← event logging wrapper
    <DashboardProvider>            ← global state (auth, docs, Q&A, exams, quiz, focus, analytics)
      <DrawerProvider>             ← QuickChat drawer state
        <FocusSessionProvider>     ← session-scoped chat history
          <PageComponent />
        </FocusSessionProvider>
      </DrawerProvider>
    </DashboardProvider>
  </TrackingProvider>
</ThemeProvider>
```

### Page Component Architecture
```
Dashboard (/dashboard)
├── DashboardSidebar (nav, collapsible)
├── GreetingRow (time greeting + mode toggle + theme toggle)
├── BentoGrid
│   ├── Study Mode (default)
│   │   ├── FocusModeCard
│   │   ├── QuizCard
│   │   ├── CallTutorCard
│   │   └── ExamsCard
│   └── Progress Mode
│       └── ProgressLayout
│           ├── FocusScoreCard
│           ├── StreakCard
│           ├── StudyTimeCard
│           └── ...11 more metric cards
├── QuickChatDrawer (floating overlay)
└── MilestoneToast

Ask AI (/ask-ai)
├── AskAISidebar (conversation list + PDF selector)
└── AskAISection (chat interface)
    ├── PDF context indicators
    ├── Streaming answer display
    │   ├── ThinkingAnimation (during generation)
    │   ├── AnswerSection
    │   │   ├── ConfidenceBadge
    │   │   ├── QuickSummary
    │   │   └── DynamicFollowUps
    │   └── AnswerRating

Quiz (/quiz)
├── ContextualSidebar (filters)
├── QuizPDFSelector → state: selectingPdf
└── QuizDisplay → state: active
    ├── QuestionSkeleton (loading)
    └── QuestionCard + options

Focus (/focus)
├── ContextualSidebar
├── FocusSessionSetup → state: setup
├── FocusModeLoader → state: generating
├── FocusSessionActive → state: active
│   ├── Task list with progress
│   ├── Timer display
│   └── FocusInlineChat
└── FocusAmbientBackground (parallax layers)

Progress (/progress)
├── Animated metric grid (12 cards)
├── InsightsPanel (AI-generated text)
└── Celebration particle system
```

### State Management Data Flow
```
                    ┌─────────────────────────┐
                    │     DashboardContext     │
                    │                         │
         mount ────▶│ fetchExam()             │
         mount ────▶│ fetchWeakTopics()       │
         mount ────▶│ fetchSyllabus()         │
         mount ────▶│ fetchDailyPlan()        │
         mount ────▶│ fetchProgress()         │
         mount ────▶│ fetchFocusProgress()    │
                    │         │               │
                    │    useRealtimeProgress()│
                    │    (live subscriptions) │
                    │         │               │
                    └─────────┼───────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Consumer Comps    │
                    │  via useDashboard()│
                    │  hook              │
                    └────────────────────┘
```

---

## 3. Backend API Architecture

### Route Organization by Domain
```
/api/
├── Q&A Core
│   ├── ask/                  POST → Streaming RAG Q&A
│   ├── ask-ai/               POST → Non-streaming Q&A (legacy)
│   └── quick-chat/           POST → Fast RAG without persistence
│
├── PDF Pipeline
│   ├── process-pdf/          POST → Full pipeline (chunk+embed+concepts+cards)
│   ├── upload/               POST → Simple upload (chunks+embed only)
│   ├── parse-pdf/            POST → Extract text only
│   ├── store-pdf-only/       POST → Store without processing
│   ├── documents/            GET  → List user docs
│   ├── delete-document/      POST → Delete document
│   ├── delete-pdf/           DELETE → [SECURITY ISSUE] No ownership check
│   ├── save-pdf/             POST → Bookmark PDF
│   └── user-pdfs/            GET/PATCH/PUT → PDF metadata
│
├── Progress & Analytics
│   ├── progress/summary/     GET  → All 12 metrics in one call
│   ├── progress/ask/         POST → Progress-tracked Q&A
│   ├── streak/               GET/POST → Streak management
│   ├── focus-progress/       GET/POST → Focus session data
│   ├── events/               POST → Batch event logging
│   └── events/embed/         POST → Internal embedding trigger
│
├── Spaced Repetition
│   ├── cards/due/            GET  → Next due cards
│   ├── cards/sr_due/         GET  → SR via RPC
│   └── cards/[id]/review/    POST → Submit rating
│
├── Study Features
│   ├── generate-quiz/        POST → AI MCQ generation
│   ├── quiz-results/         POST → Record results + update mastery
│   ├── quiz/ai-coach/        POST → Coaching tip
│   ├── ai/evaluate-answer/   POST → Grade student response
│   ├── ai/generate-questions/ POST → Practice questions
│   ├── ai/search-topics/     GET  → Topic search
│   ├── ai/focus-tip/         GET  → Focus tip
│   ├── generate-focus-tasks/ POST → Two-pass task generation
│   └── study-plan/generate/  POST → LLM study plan
│
├── Weak Topics & Mastery
│   ├── weak-topics/          GET/POST → CRUD
│   ├── mastery/get/          GET  → Mastery scores
│   └── mastery/update/       POST → Update score
│
├── Exams
│   └── exam/                 GET/POST/PATCH → Exam CRUD
│
├── Conversations
│   ├── conversations/        GET  → [SECURITY ISSUE] No auth required
│   └── conversations/[id]/   GET/PATCH/DELETE → Single conversation
│
├── Voice Tutor
│   ├── voice/start/          POST → Init session (checks limits)
│   ├── voice/transcribe/     POST → Speech-to-text
│   ├── voice/respond/        POST → LLM response
│   ├── voice/speak/          POST → Text-to-speech
│   └── voice/end/            POST → End session
│
├── Payments
│   ├── payments/create-order/ POST → Razorpay order
│   ├── payments/verify/       POST → Client verification
│   └── payments/webhook/      POST → Razorpay webhook
│
├── Concept Graph (Dev/Internal)
│   ├── graph/[docId]/        GET  → Concept graph data
│   ├── concepts/backfill/    POST → Backfill old docs
│   └── artifacts/generate/   POST → Generate study artifacts
│
└── Utilities
    ├── generate-document/    POST → PDF/DOCX export
    ├── daily-plan/           POST → AI daily schedule
    ├── study-plan/adaptive/  GET  → Adaptive plan
    ├── answer-feedback/      POST → User feedback
    ├── syllabus/             GET  → Syllabus topics
    ├── memory/weak-topic/    POST → Memory trace
    └── activity/             POST → Activity ping
```

### API Request Lifecycle
```
Browser Request
      │
      ▼ Authorization: Bearer {jwt}
┌─────────────────────────────────┐
│     Next.js Route Handler       │
│                                 │
│  1. Extract token from header   │
│  2. supabase.auth.getUser(token)│
│  3. Return 401 if no user       │
│  4. Check plan limits           │
│  5. Execute business logic      │
│  6. Query Supabase (service key)│
│  7. Call OpenAI if needed       │
│  8. Return response             │
└─────────────────────────────────┘
      │
      ▼
   Response (JSON or streaming text/plain)
```

---

## 4. Database Schema Map

### Entity Relationship Diagram
```
auth.users (Supabase GoTrue)
      │
      ├──1:1──▶ profiles
      │          ├── id (FK → auth.users)
      │          ├── email
      │          ├── dashboard_mode
      │          ├── active_pdf_id (FK → pdfs_metadata)
      │          └── theme_preference
      │
      ├──1:1──▶ user_plans
      │          ├── user_id (FK)
      │          ├── plan: free|student|pro|school
      │          ├── order_id, payment_id
      │          └── expires_at
      │
      ├──1:N──▶ documents (❌ no migration)
      │          ├── id, user_id, name, subject, content
      │          ├── concept_extraction_status
      │          └── ─────────────┐
      │                           │
      │          ┌────────────────┘
      │          ├──1:N──▶ document_chunks (❌ no migration)
      │          │          ├── id, document_id
      │          │          ├── content (text)
      │          │          └── embedding (vector 1536)  ──▶ pgvector IVFFlat
      │          │
      │          └──1:N──▶ concepts
      │                     ├── id (UUID), user_id, document_id
      │                     ├── title, type, difficulty
      │                     ├── canonical_text
      │                     └── embedding (vector 1536)
      │                          │
      │                     ┌────┴──────────────┐
      │                     │                   │
      │                   concept_edges      mastery_state
      │                   (from_id, to_id,   (user_id, concept_id,
      │                    kind, strength)    strength, confidence,
      │                                       fsrs_state, lapses)
      │                     │
      │                   cards              questions
      │                   (type, front, back) (type, stem, answer,
      │                                        distractors, rubric)
      │
      ├──1:N──▶ learning_events
      │          ├── id, user_id, event_type, surface
      │          ├── topic, subject, session_id
      │          ├── metadata (JSONB), duration_ms
      │          └── embedding (vector 1536) ──▶ IVFFlat cosine
      │
      ├──1:N──▶ mastery_topics
      │          ├── user_id, topic, subject
      │          └── mastery_score (0-100), last_updated
      │
      ├──1:N──▶ weak_topics
      │          ├── user_id, topic, subject
      │          ├── count, level: easy|medium|hard
      │          └── promoted from topic_attempts at count≥3
      │
      ├──1:N──▶ topic_attempts (staging)
      │          └── user_id, topic, count
      │
      ├──1:N──▶ spaced_repetition_cards
      │          ├── user_id, topic, subject
      │          ├── ease_factor (1.3–2.5)
      │          ├── interval_days, repetition
      │          └── next_due_at ──▶ sr_next_due() RPC
      │
      ├──1:N──▶ focus_progress (❌ no base migration)
      │          ├── user_id, task, difficulty
      │          ├── active_time_seconds
      │          └── document_id, document_name
      │
      ├──1:N──▶ study_streaks (❌ no migration)
      │          └── user_id, streak_count, last_active_date
      │
      ├──1:N──▶ exams (❌ no migration)
      │          └── user_id, name, exam_date, subject, status
      │
      ├──1:N──▶ generated_artifacts
      │          ├── user_id, cluster_id
      │          ├── artifact_type: flashcard|micro_quiz
      │          └── content (JSONB)
      │
      ├──1:N──▶ conversations
      │          └── user_id, title, messages (JSONB[])
      │
      ├──1:N──▶ voice_calls
      │          └── user_id, started_at, ended_at, duration_seconds
      │
      ├──1:N──▶ qa_usage (daily limit counter)
      │          └── user_id, created_at (TTL: 2 days)
      │
      └──1:N──▶ answer_feedback
                 └── user_id, question_hash, rating, flag_type
```

### Tables Missing Migrations (13 tables)
```
❌ documents           → Core PDF storage
❌ document_chunks     → RAG vector storage
❌ focus_progress      → Focus Mode sessions (base table; ALTER exists)
❌ study_streaks       → Streak tracking
❌ exams               → Exam management
❌ pdfs_metadata       → FK target in profiles
❌ chat_messages       → Legacy chat
❌ user_memory         → Adaptive planning memory
❌ revision_topics     → Mastery computation
❌ syllabus_topics     → PDF subject mapping
❌ daily_progress      → Daily activity tracking
❌ pdfs                → Referenced alongside pdfs_metadata
❌ quizzes             → Quiz session tracking
```

---

## 5. AI Pipeline Architecture

### Q&A Pipeline (Main Flow)
```
User Question
      │
      ▼
┌─────────────────────────────────────────┐
│              /api/ask                   │
│                                         │
│  1. Classify query                      │
│     queryClassifier.js                  │
│     → domain (cs/physics/law/...)       │
│     → marks (1/2/5/10/15)             │
│     → type (theory/MCQ/numerical)      │
│     → language (en/hi/...)             │
│     → confidence score                  │
│        ↓ if low confidence:             │
│        llmClassifier.js → LLM classify  │
│                                         │
│  2. Detect intents                      │
│     → isConfused? → simpler prompt      │
│     → exportIntent? → skip cache        │
│                                         │
│  3. Vector search (if PDF selected)     │
│     rag.js: embed question              │
│     → match_documents() RPC            │
│     → top 5 chunks returned            │
│                                         │
│  4. Check Q&A cache                     │
│     qa_cache table (SHA256 key, 7-day)  │
│     → Cache hit: stream cached answer   │
│     → Cache miss: continue             │
│                                         │
│  5. Build prompt                        │
│     promptAssembler.js                  │
│     → System: domain-specific expert   │
│     → User: question + chunks context  │
│     → Temperature/tokens by type       │
│                                         │
│  6. Stream from OpenAI gpt-4o-mini     │
│     → Prepend __META__{json}\n          │
│     → Stream answer tokens             │
│     → Append __CONV__{json}            │
│                                         │
│  7. Post-response (fire-and-forget)     │
│     Promise.all([                       │
│       updateStreak(),                   │
│       trackWeakTopic(),                 │
│       writeQACache()                    │
│     ])                                  │
└─────────────────────────────────────────┘
```

### PDF Processing Pipeline
```
PDF Upload (FormData)
      │
      ▼
/api/process-pdf
      │
      ├── 1. Validate file presence
      │
      ├── 2. Extract text
      │       │
      │       ├── pdf-parse (pure text)
      │       │   text.length < 50?
      │       │       ↓ yes
      │       └── OpenAI gpt-4o Vision OCR (fallback)
      │
      ├── 3. Parallel Pipeline ──────────────────────┐
      │   │                                          │
      │   ├── Path A: Subject/Topic Detection        │
      │   │   → gpt-4o prompt                       │
      │   │   → Store in documents.subject           │
      │   │                                          │
      │   └── Path B: Chunking + Embedding           │
      │       → RecursiveCharacterTextSplitter       │
      │         (chunk: 1000 chars, overlap: 200)    │
      │       → text-embedding-3-small (batch)       │
      │       → INSERT INTO document_chunks          │
      │                                              │
      ├── 4. Async (next/server.after): ────────────┘
      │       Concept Extraction
      │       → gpt-4o: extract concepts + edges
      │       → validateConcepts.js: deduplicate
      │       → persistGraph.js: INSERT concepts, concept_edges
      │       → generateCards.js: SRS cards from concepts
      │       → persistCards.js: INSERT cards
      │
      └── 5. Return { documentId, chunksStored }
```

### Spaced Repetition Data Flow
```
PDF Processing
      │
      ▼ (async, after response)
generateCards.js
      │
      ▼
INSERT spaced_repetition_cards
(ease_factor: 2.5, interval: 1, rep: 0, next_due_at: tomorrow)
      │
      │ Daily
      ▼
sr_next_due() RPC ──▶ /api/cards/sr_due
      │                 (returns topics overdue)
      │
      ▼
/study page: flashcard review
      │
      ▼ user rates: Again(1)/Hard(2)/Good(3)/Easy(4)
/api/cards/[id]/review
      │
      ▼
sm2Scheduler.computeNextReview(card, quality)
      │
      ├── quality 0-3: reset interval to 1 day
      └── quality 4-5: interval *= ease_factor
      │
      ▼
UPDATE spaced_repetition_cards
(new ease_factor, interval_days, next_due_at)
      │
      ▼
/api/mastery/update → mastery_topics table
(mastery_score = SRS score × 0.4 + quiz score × 0.6)
```

---

## 6. Data Flow Diagrams

### User Study Session (Complete Flow)
```
[Login] ─────────────────────────────────────────────────┐
                                                          │ JWT token
[Dashboard loads] ←── DashboardContext mounts            │
      │                    │                             │
      │         6 parallel fetches:                      │
      │         ┌── fetchExam()                          │
      │         ├── fetchWeakTopics()                    │
      │         ├── fetchSyllabus()                      │
      │         ├── fetchDailyPlan()                     │
      │         ├── fetchProgress()                      │
      │         └── fetchFocusProgress()                 │
      │                                                  │
      │    [User uploads PDF]                            │
      │         │                                        │
      │    POST /api/process-pdf ──▶ OpenAI embed        │
      │         │                 ──▶ INSERT chunks      │
      │         │                 ──▶ async: concepts    │
      │         │                                        │
      │    [User asks question]                          │
      │         │                                        │
      │    POST /api/ask (streaming)                     │
      │         │                                        │
      │    ┌────▼────────────────────────────────┐       │
      │    │  classify → vector search → prompt  │       │
      │    │  → stream → post-process            │       │
      │    └────────────────────────────────────-┘       │
      │                                                  │
      │    [Answer displayed] ──▶ track weak topics      │
      │                       ──▶ update streak         │
      │                       ──▶ cache response        │
      │                                                  │
      │    [Supabase Realtime] ──▶ useRealtimeProgress   │
      │         │                   500ms debounce       │
      │         └──▶ fetchProgressSummary() ─────────────┘
      │                    │
      └────────────────────▼
           [Dashboard updates live]
```

### Weak Topic Promotion Pipeline
```
User asks question about "Newton's Laws" (1st time)
      │
      ▼
POST /api/weak-topics
      │
      ├── topic_attempts.count = 1
      │   (below threshold, staging)
      │
      ▼
User asks again (2nd time)
      │
      ▼
topic_attempts.count = 2 (still staging)
      │
      ▼
User asks again (3rd time)
      │
      ▼
topic_attempts.count = 3
      │ threshold reached
      ▼
UPSERT weak_topics (promoted!)
      │
      ├── Realtime event → dashboard updates
      │
      ├── generateAdaptivePlan() reprioritizes
      │
      └── computeWeakTopicClusters() groups semantically
```

---

## 7. Realtime Architecture

### Subscription Map
```
Client (useRealtimeProgress hook)
      │
      ├── Supabase channel: "progress-{user_id}"
      │
      ├── Subscribed tables:
      │   ├── learning_events    (postgres_changes: INSERT)
      │   ├── focus_progress     (postgres_changes: INSERT, UPDATE)
      │   ├── mastery_topics     (postgres_changes: INSERT, UPDATE)
      │   ├── study_streaks      (postgres_changes: UPDATE)
      │   ├── exams              (postgres_changes: INSERT, UPDATE, DELETE)
      │   ├── spaced_repetition_cards (postgres_changes: UPDATE)
      │   └── weak_topics        (postgres_changes: INSERT, UPDATE)
      │
      ├── On ANY event:
      │   → debounce 500ms (collapse burst events)
      │   → min 2s between actual refetches
      │   → fetchProgressSummary() → GET /api/progress/summary
      │
      ├── Connection states:
      │   connecting → connected → [polling if unhealthy] → disconnected
      │
      └── Fallback:
          → 60s polling when Realtime channel unhealthy
          → Pause on document hidden, resume on visible
```

---

## 8. Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      Signup Flow                                │
│                                                                 │
│  /signup → email + password                                     │
│      │                                                          │
│      ▼                                                          │
│  supabase.auth.signUp() ──▶ GoTrue service                      │
│      │                      → create auth.users row             │
│      │                      → send verification email           │
│      │                      → auto-trigger: handle_new_user()  │
│      │                        creates profiles row              │
│      │                        with default plan (free)          │
│      ▼                                                          │
│  Redirect → /dashboard (before email verification!)            │
│                                                                 │
│  ⚠️  NOTE: Email verification not enforced at redirect          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      Login Flow                                 │
│                                                                 │
│  /login → email + password OR Google OAuth                      │
│      │                                                          │
│      ▼                                                          │
│  supabase.auth.signInWithPassword() / signInWithOAuth()        │
│      │                                                          │
│      ▼ JWT (access_token + refresh_token)                       │
│  Stored in Supabase session (browser)                           │
│      │                                                          │
│      ▼                                                          │
│  All API calls: Authorization: Bearer {access_token}           │
│      │                                                          │
│      ▼ (server-side)                                            │
│  supabase.auth.getUser(token) → user object                     │
│      │                                                          │
│      ▼                                                          │
│  Route-level auth check (inline, no middleware)                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   Token Refresh Flow                            │
│                                                                 │
│  Supabase client auto-refreshes access token via refresh_token  │
│  No manual refresh needed in application code                   │
│  Supabase session persists in localStorage                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Payment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Razorpay Payment Flow                        │
│                                                                 │
│  1. POST /api/payments/create-order                             │
│     Auth: Bearer token required                                 │
│     → Razorpay.orders.create({ amount, currency: "INR" })      │
│     → Returns: { orderId, amount, currency, keyId }             │
│                                                                 │
│  2. Razorpay Checkout widget (client-side)                      │
│     User enters card/UPI details                                │
│     → Razorpay processes payment                                │
│     → Returns: { razorpay_payment_id, razorpay_signature }     │
│                                                                 │
│  3. POST /api/payments/verify                                   │
│     Auth: Bearer token required                                 │
│     → HMAC-SHA256 signature verification                        │
│     → UPSERT user_plans { plan: "student"|"pro", expires_at }  │
│                                                                 │
│  4. POST /api/payments/webhook (Razorpay → server)             │
│     Auth: X-Razorpay-Signature header                           │
│     → Signature verification via RAZORPAY_WEBHOOK_SECRET       │
│     → Handles: payment.captured, subscription.activated        │
│     → UPSERT user_plans                                         │
│                                                                 │
│  ⚠️  Risk: No idempotency keys on webhook handler               │
│  ⚠️  Risk: Double-activation possible if verify + webhook both  │
│            execute for same payment                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Component Dependency Tree

### Critical Path Components
```
DashboardContext (1,467 lines)
├── READS: Supabase (documents, weak_topics, mastery_topics, focus_progress, 
│         study_streaks, exams, daily_plan, qa_cache)
├── WRITES: answers, chatMode, dashboardMode, sidebarCollapsed to state
├── CALLS: /api/ask (streaming), /api/daily-plan, /api/generate-focus-tasks
├── USES: useRealtimeProgress, generateSmartPlan, generateAdaptivePlan,
│         generateAnalytics, generateInsights, generateReadiness
└── PROVIDES: useDashboard() hook to ALL child components

useRealtimeProgress (hook)
├── SUBSCRIBES: 7 Supabase tables via CDC
├── DEBOUNCES: 500ms window, 2s minimum between calls
├── CALLS: fetchProgressSummary() → /api/progress/summary
└── FALLBACK: 60s polling

/api/progress/summary (GET)
├── QUERIES: study_streaks, focus_progress, mastery_topics, 
│           exams, learning_events, sr_next_due()
├── COMPUTES: 12 metrics via progressUtils.js
├── CALLS: computeWeakTopicClusters() → OpenAI embeddings (500-1500ms)
└── RETURNS: 25+ fields in single response

progressUtils.js (pure functions)
├── computeFocusScore: streak×0.4 + time×0.4 + mastery×0.2
├── computePeerPercentile: focus×0.6 + streak×0.15 + masteryPct×0.25
├── computeStudyPlanProgress: unique active dates / 30
├── computeWeeklyChange: current vs prior 7 days
└── computeStrongestSubject: max avg mastery by subject group
```

### Library Dependency Graph
```
UI Rendering
  react@19 → react-dom@19
  next@16 (App Router)
  framer-motion@12 (animations)
  @shadcn/ui (base components)
  recharts@3 (charts — only /progress)
  reactflow@11 (graph — only /dev/graph)

AI & ML
  openai@6 (gpt-4o, gpt-4o-mini, text-embedding-3-small)
  @anthropic-ai/sdk@0.90 (installed, uncertain usage)
  langchain@1 + @langchain/textsplitters (PDF chunking)
  tesseract.js@7 (OCR fallback)

Database
  @supabase/supabase-js@2 (client + auth)
  pgvector (server-side, no client package)

Documents
  pdf-parse@1 (PDF text extraction)
  pdf-parser@1 (duplicate, should remove)
  @react-pdf/renderer@4 (PDF generation/export)
  docx@9 (DOCX generation)
  react-markdown@10 + marked@17 + markdown-it@14 (Markdown rendering)
  remark-gfm@4 (GFM plugin)

Payments
  razorpay@2 (server SDK)

Utilities
  uuid@13 (ID generation)
  fs-extra@11 (file system)
  ai@6 (Vercel AI SDK — streaming helpers)
```
