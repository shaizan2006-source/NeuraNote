# Ask My Notes — Project Progress Report
*Principal Engineering Audit | Generated: 2026-05-15*

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Full File & Folder Breakdown](#3-full-file--folder-breakdown)
4. [Frontend System Audit](#4-frontend-system-audit)
5. [Backend System Audit](#5-backend-system-audit)
6. [Database & Data Models](#6-database--data-models)
7. [Authentication & User System](#7-authentication--user-system)
8. [Student Platform Features Audit](#8-student-platform-features-audit)
9. [Admin & Management Systems](#9-admin--management-systems)
10. [API & Integration Mapping](#10-api--integration-mapping)
11. [UI/UX Quality Review](#11-uiux-quality-review)
12. [Code Quality Audit](#12-code-quality-audit)
13. [Performance Audit](#13-performance-audit)
14. [Security Audit](#14-security-audit)
15. [Missing Features & Gaps](#15-missing-features--gaps)
16. [Production Readiness Assessment](#16-production-readiness-assessment)
17. [Recommended Next Development Roadmap](#17-recommended-next-development-roadmap)
18. [Final Technical Verdict](#18-final-technical-verdict)

---

## 1. Executive Summary

### What the Platform Does
Ask My Notes is an AI-powered study assistant platform targeting Indian competitive exam students (JEE, NEET, UPSC, CA, Law, MBBS). Students upload their PDFs and course notes, then use an AI tutor to ask questions with RAG-backed contextual answers, generate quizzes, practice spaced repetition flashcards, track their mastery, and receive AI-coached focus sessions.

### Core Mission
Democratize high-quality tutoring for Indian students by embedding an AI learning layer on top of their own study material — transforming passive notes into active, adaptive learning experiences.

### Main User Types
| Type | Description |
|------|-------------|
| **Free Student** | 1 PDF, 20 Q&A/day, limited voice calls |
| **Student (₹299/mo)** | 10 PDFs, unlimited Q&A, 5 voice calls/day |
| **Pro (₹599/mo)** | Unlimited PDFs, unlimited Q&A, 15 voice calls |
| **School** | Institutional tier, unlimited everything |
| **Internal Dev** | Full bypass on all limits |

### Overall Completion Estimate

| Layer | Completion |
|-------|-----------|
| Core AI Q&A (RAG) | 95% |
| Dashboard & Navigation | 90% |
| Progress Analytics | 85% |
| Quiz System | 85% |
| Focus Mode | 80% |
| Spaced Repetition (SRS) | 80% |
| Exams Tracking | 85% |
| Voice AI Tutor | 75% |
| Payment Integration | 70% |
| Authentication Flows | 85% |
| Admin/Moderation | 10% |
| Light Mode CSS | 15% |
| Schema Migration Coverage | 55% |

**Overall Platform Completion: ~72%**
**MVP Readiness: ~80%**
**Production Readiness: ~55% (blocked by security issues and missing migrations)**

### Current Product Maturity Level
**Late Alpha / Early Beta.** Core features work end-to-end. The product has a real user-facing value loop. However, critical security vulnerabilities, missing database migrations, no admin tooling, and an undertested backend prevent production launch without remediation.

### Main Strengths
1. Exceptionally deep AI feature set — Q&A with RAG, streaming, coaching, OCR, quiz generation, voice, concept graphs, spaced repetition
2. Sophisticated progress tracking — focus score, peer percentile, exam readiness, retention score
3. Realtime architecture — 7 tables with live subscriptions, debounced aggregation, fallback polling
4. Well-designed UI — dark theme, Framer Motion animations, skeleton screens, responsive layout
5. SM-2 spaced repetition correctly implemented
6. Plan-based rate limiting enforced at backend
7. 15 unit tests + Playwright E2E setup

### Biggest Missing Systems
1. **Security fixes** — 2 critical vulnerabilities in API layer
2. **Missing migrations** — 13 tables not version-controlled
3. **No admin dashboard** — zero moderation or user management
4. **No error monitoring** — no Sentry or equivalent
5. **No CI/CD pipeline** — no GitHub Actions
6. **Light mode** — UI exists, CSS not complete
7. **No payment webhook reliability** — missing idempotency keys

### Current Technical Health Assessment
> The codebase is ambitious and well-structured for a solo/small team build. The AI integration is genuinely impressive in breadth and quality. The main weaknesses are infrastructure-level: missing migrations, no middleware, critical auth bypasses in a few endpoints, and a 1,467-line monolithic context. These are addressable issues, not architectural failures.

---

## 2. High-Level Architecture

### Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | Next.js App Router | 16.1.6 | Full-stack React framework |
| UI Library | React | 19.2.3 | Component model |
| Styling | Tailwind CSS v4 + CSS Custom Properties | 4.x | Design tokens + utility classes |
| Animation | Framer Motion | 12.38.0 | Page/component animations |
| Database | Supabase (PostgreSQL + pgvector) | 2.99.1 | Data storage + vector search |
| Auth | Supabase Auth (GoTrue) | — | JWT auth, email/password, OAuth |
| AI — Chat | OpenAI gpt-4o-mini / gpt-4o | 6.34.0 | Q&A, coaching, quiz, planning |
| AI — Embeddings | OpenAI text-embedding-3-small | — | RAG, semantic clustering |
| AI — Claude | Anthropic SDK | 0.90.0 | Installed, integration status unclear |
| Text Processing | LangChain + Splitters | 1.2.33 | PDF chunking (1000 chars, 200 overlap) |
| Payments | Razorpay | 2.9.6 | INR subscriptions |
| Charts | Recharts | 3.8.0 | Progress visualizations |
| Graph Viz | ReactFlow | 11.11.4 | Concept graph display |
| OCR (fallback) | Tesseract.js | 7.0.0 | Scanned PDF text extraction |
| E2E Testing | Playwright | 1.58.2 | Browser automation tests |

### Frontend Architecture
```
Next.js App Router (src/app/)
├── Server Components (layouts, metadata)
└── Client Components ("use client")
    ├── DashboardContext.jsx (1,467 lines — global state)
    ├── ThemeContext.tsx (dark/gradient/light)
    ├── FocusSessionContext.jsx (session-scoped)
    └── DrawerContext.jsx (QuickChat drawer)
```

**Rendering Strategy:**
- Landing page: Server-rendered (SSR) for SEO
- Dashboard and all app pages: Client Components (CSR) after auth hydration
- API routes: Pure server-side (Node.js, no edge runtime)
- No static generation (ISR/SSG) for any page currently

### Backend Architecture
```
Next.js API Routes (src/app/api/)
58+ route handlers, organized by feature domain
All routes: async functions, Supabase client (service role), inline auth checks
No centralized middleware, no request interceptors
```

### Database Architecture
```
Supabase PostgreSQL
├── pgvector extension (1536-dim embeddings)
├── GoTrue (auth)
├── PostgREST (auto-generated REST API)
├── Realtime (Postgres CDC → websocket)
└── Storage (PDF files in 'documents' bucket)

Tables: 27+ (13 missing from version-controlled migrations)
RPC Functions: 5 documented (match_documents, match_documents_multi, 
               sr_next_due, match_learning_events, handle_new_user)
```

### API Structure
```
/api/ask              — Streaming Q&A (main endpoint)
/api/ask-ai           — Non-streaming Q&A (legacy)
/api/process-pdf      — Upload + embed + concept extract
/api/progress/*       — Analytics & progress summary
/api/cards/*          — Spaced repetition
/api/voice/*          — Voice AI tutor pipeline
/api/payments/*       — Razorpay integration
/api/events           — Event logging (analytics)
/api/conversations/*  — Chat history
/api/weak-topics      — Weak area tracking
/api/exam             — Exam management
/api/mastery/*        — Mastery scoring
/api/focus-progress   — Focus session tracking
```

### State Management
**Pattern:** React Context API only (no Redux/Zustand/Jotai)

```
DashboardContext.jsx — All dashboard state (auth, docs, Q&A, exams, 
                       quiz, mastery, focus, analytics, plans, realtime)
ThemeContext.tsx     — Theme persistence (Supabase + localStorage)
FocusSessionContext  — Session chat (sessionStorage)
DrawerContext        — QuickChat drawer UI state
```

**Data Fetching:** Direct Supabase client + fetch() with Authorization: Bearer headers

### Routing System
```
/ (homepage)
/login, /signup, /forgot-password, /reset-password
/auth/callback
/onboarding
/dashboard
/ask-ai
/quiz
/focus
/study
/exams
/progress
/call-tutor
/chat (legacy)
/pricing
/dev/graph/[docId] (dev-only)
/dev/backfill (dev-only)
```

### Authentication Flow
```
1. Signup → Supabase GoTrue → email verification
2. Login → Supabase JWT (access_token + refresh_token)
3. Client stores JWT → Authorization: Bearer {token} header on all API calls
4. API routes: supabase.auth.getUser(token) → user object
5. New user trigger → auto-creates profiles row
6. Plan check: user_plans table (default: free)
```

### Hosting/Deployment Architecture
```
Vercel (framework: nextjs)
├── Build: npm run build → .next/
├── Security headers: X-Content-Type-Options, X-Frame-Options on /api/*
├── Env vars: @supabase_url, @openai_api_key, @razorpay_* via Vercel secrets
└── No GitHub Actions CI/CD (Vercel auto-deploy from git push)

Supabase (managed cloud)
├── Database: PostgreSQL 15+
├── Auth: GoTrue service
├── Storage: 'documents' bucket
└── Realtime: 7 tables with CDC subscriptions
```

---

## 3. Full File & Folder Breakdown

```
ask-my-notes/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.js                   # Landing/homepage (SSR)
│   │   ├── layout.js                 # Root layout (fonts, providers)
│   │   ├── globals.css               # CSS custom properties, design tokens, animations
│   │   ├── dashboard/page.jsx        # Main dashboard (study/progress modes)
│   │   ├── ask-ai/page.jsx           # Q&A chat interface
│   │   ├── quiz/page.jsx             # Quiz generator + session
│   │   ├── focus/page.jsx            # Pomodoro focus mode
│   │   ├── study/page.jsx            # SRS flashcard review
│   │   ├── exams/page.jsx            # Exam countdown + weak topics
│   │   ├── progress/page.jsx         # Analytics dashboard
│   │   ├── chat/page.jsx             # Legacy chat (partial)
│   │   ├── call-tutor/page.jsx       # Voice AI tutor
│   │   ├── pricing/page.jsx          # Pricing page
│   │   ├── onboarding/page.jsx       # 4-step onboarding wizard
│   │   ├── login/page.jsx            # Email + Google auth
│   │   ├── signup/page.jsx           # Registration
│   │   ├── forgot-password/page.jsx  # Password recovery
│   │   ├── reset-password/page.jsx   # Password reset
│   │   ├── auth/callback/route.js    # OAuth callback handler
│   │   ├── dev/                      # Dev-only utilities (not production)
│   │   │   ├── graph/[docId]/        # Concept graph visualizer
│   │   │   └── backfill/             # Concept backfill utility
│   │   └── api/                      # 58+ API route handlers
│   │       ├── ask/route.js          # Streaming Q&A (CRITICAL PATH)
│   │       ├── ask-ai/route.js       # Non-streaming Q&A (legacy)
│   │       ├── quick-chat/route.js   # Fast RAG chat
│   │       ├── process-pdf/route.js  # PDF upload pipeline
│   │       ├── upload/route.js       # Simpler PDF upload
│   │       ├── progress/
│   │       │   ├── summary/route.js  # Aggregate metrics endpoint
│   │       │   └── ask/route.js      # Progress Q&A
│   │       ├── cards/
│   │       │   ├── due/route.js      # Fetch SRS due cards
│   │       │   ├── sr_due/route.js   # SR due via RPC
│   │       │   └── [id]/review/route.js  # Submit card rating
│   │       ├── voice/
│   │       │   ├── start/route.js    # Init voice session
│   │       │   ├── transcribe/route.js  # Speech-to-text
│   │       │   ├── respond/route.js  # LLM response
│   │       │   ├── speak/route.js    # Text-to-speech
│   │       │   └── end/route.js      # End session
│   │       ├── payments/
│   │       │   ├── create-order/route.js  # Razorpay order
│   │       │   ├── verify/route.js   # Client verification
│   │       │   └── webhook/route.js  # Razorpay webhook
│   │       ├── conversations/
│   │       │   ├── route.js          # List conversations [SECURITY ISSUE]
│   │       │   └── [id]/route.js     # CRUD single conversation
│   │       ├── events/
│   │       │   ├── route.js          # Event logging (max 50/batch)
│   │       │   └── embed/route.js    # Internal embedding trigger
│   │       ├── mastery/
│   │       │   ├── get/route.js      # Get mastery scores
│   │       │   └── update/route.js   # Update mastery score
│   │       ├── ai/
│   │       │   ├── evaluate-answer/route.js    # Grade student answer
│   │       │   ├── generate-questions/route.js # Practice questions
│   │       │   ├── search-topics/route.js      # Topic search
│   │       │   └── focus-tip/route.js          # Focus session tip
│   │       ├── generate-quiz/route.js      # Quiz generation
│   │       ├── quiz-results/route.js        # Record quiz + update mastery
│   │       ├── quiz/ai-coach/route.js       # Quiz coaching
│   │       ├── generate-focus-tasks/route.js # Focus task AI generation
│   │       ├── artifacts/generate/route.js  # Study artifacts
│   │       ├── study-plan/
│   │       │   ├── generate/route.js        # LLM study plan
│   │       │   └── adaptive/route.js        # Adaptive plan
│   │       ├── daily-plan/route.js          # Daily plan generator
│   │       ├── weak-topics/route.js         # Weak topics CRUD
│   │       ├── focus-progress/route.js      # Focus session tracking
│   │       ├── streak/route.js              # Streak GET/POST
│   │       ├── exam/route.js                # Exam CRUD
│   │       ├── syllabus/route.js            # Syllabus topics
│   │       ├── documents/route.js           # List documents
│   │       ├── delete-document/route.js     # Delete document
│   │       ├── delete-pdf/route.js          # Delete PDF [SECURITY ISSUE]
│   │       ├── user-pdfs/route.js           # User PDF management
│   │       ├── chat/
│   │       │   ├── send/route.js            # Send chat message
│   │       │   └── history/route.js         # Chat history
│   │       ├── generate-document/route.js   # PDF export generation
│   │       ├── activity/route.js            # Activity tracking
│   │       ├── answer-feedback/route.js     # User feedback on answers
│   │       ├── concepts/backfill/route.js   # Dev: concept backfill
│   │       └── graph/[docId]/route.js       # Concept graph data
│   ├── components/                          # UI components
│   │   ├── dashboard/                       # Dashboard-specific
│   │   │   ├── DashboardSidebar.jsx
│   │   │   ├── BentoGrid.jsx
│   │   │   ├── GreetingRow.jsx
│   │   │   ├── StudyModeCards.jsx
│   │   │   ├── AskAIHeroCard.jsx
│   │   │   ├── StudyPlanSection.jsx
│   │   │   ├── QuizSection.jsx
│   │   │   └── ProgressLayout.jsx
│   │   ├── progress/                        # Analytics components
│   │   │   ├── AnimatedNumber.jsx           # Counter animation
│   │   │   ├── CognitiveProgressCard.jsx
│   │   │   ├── FocusScoreCard.jsx
│   │   │   ├── StreakCard.jsx
│   │   │   ├── StudyTimeCard.jsx
│   │   │   ├── AccuracyCard.jsx
│   │   │   ├── SessionDepthCard.jsx
│   │   │   ├── WeeklyRecapCard.jsx
│   │   │   ├── InsightsPanel.jsx
│   │   │   ├── StudyPlanCard.jsx
│   │   │   ├── ExamCountdownCard.jsx
│   │   │   ├── Celebration.jsx              # Particle burst animation
│   │   │   └── LiveIndicator.jsx
│   │   ├── focus/                           # Focus mode components
│   │   │   ├── FocusSessionSetup.jsx
│   │   │   ├── FocusModeLoader.jsx
│   │   │   ├── FocusSessionActive.jsx
│   │   │   ├── FocusInlineChat.jsx
│   │   │   ├── FocusAmbience.jsx
│   │   │   └── FocusAmbientBackground.tsx
│   │   ├── quiz/                            # Quiz components
│   │   │   ├── QuizPDFSelector.jsx
│   │   │   └── QuestionSkeleton.jsx
│   │   ├── exams/                           # Exam components
│   │   │   ├── ExamsSidebar.jsx
│   │   │   ├── ExamCountdownSection.jsx
│   │   │   ├── WeakTopicsSection.jsx
│   │   │   ├── AddExamModal.jsx
│   │   │   ├── ExamCard.jsx
│   │   │   ├── WeakTopicCard.jsx
│   │   │   └── StudyPlanModal.jsx
│   │   ├── ask-ai/                          # Ask AI components
│   │   │   ├── AskAISidebar.jsx
│   │   │   ├── ModelSwitcher.jsx
│   │   │   └── ModeSwitcher.jsx
│   │   ├── answer/                          # Answer display
│   │   │   ├── AnswerSection.jsx
│   │   │   ├── ConfidenceBadge.jsx
│   │   │   ├── DynamicFollowUps.jsx
│   │   │   ├── SessionCallout.jsx
│   │   │   ├── AnswerRating.jsx
│   │   │   └── QuickSummary.jsx
│   │   ├── ai-dust/                         # Ambient particle system
│   │   │   ├── AIDustLayer.tsx              # Canvas particle renderer
│   │   │   ├── useIdleDetection.ts          # Idle state hook
│   │   │   ├── ai-dust.config.ts            # Particle configuration
│   │   │   └── ai-dust.css
│   │   ├── ThinkingAnimation.jsx            # Domain-specific AI thinking
│   │   ├── ThemeToggle.tsx                  # Theme selector dropdown
│   │   ├── QuickChatDrawer.jsx              # Floating chat overlay
│   │   ├── QuickChatVortex.jsx              # Vortex loading animation
│   │   ├── MilestoneToast.jsx               # Achievement notifications
│   │   ├── TopBar.jsx
│   │   ├── ContextualSidebar.jsx
│   │   ├── DashboardSkeleton.jsx
│   │   ├── QuizSkeleton.jsx
│   │   ├── ErrorBoundary.jsx
│   │   ├── ProgressBar.jsx
│   │   ├── UserProfile.jsx
│   │   ├── UploadModal.jsx
│   │   ├── DeleteConfirmationModal.jsx
│   │   └── TrackingProvider.jsx
│   ├── context/                             # React context providers
│   │   ├── DashboardContext.jsx             # 1,467 lines — global state
│   │   ├── ThemeContext.tsx                 # Theme management
│   │   ├── FocusSessionContext.jsx          # Focus session scope
│   │   └── DrawerContext.jsx                # QuickChat drawer state
│   ├── hooks/                               # Custom React hooks
│   │   ├── useProgressData.js               # Fetch /api/progress/summary
│   │   ├── useActivePDF.js                  # Track active document
│   │   ├── useFocusScore.js                 # Focus concentration metric
│   │   ├── useAccuracy.js                   # Quiz accuracy
│   │   ├── useTrends.js                     # Study trend analysis
│   │   ├── useStudyInsights.js              # AI-generated insights
│   │   ├── useQuizStream.js                 # Streaming quiz generation
│   │   ├── useExamReminders.js              # Exam notification setup
│   │   ├── useRealtimeProgress.js           # Supabase Realtime (7 tables)
│   │   ├── useChangePulse.js                # Pulse animation on change
│   │   └── useSlowLoad.js                   # Skeleton delay trigger
│   └── lib/                                 # Utilities & business logic
│       ├── supabase.js                       # Supabase client factory
│       ├── auth.js                           # Auth helpers
│       ├── rag.js                            # Retrieval-Augmented Generation
│       ├── mastery.js                        # Mastery score computation
│       ├── sm2Scheduler.js                   # SM-2 SRS algorithm
│       ├── focusPlanner.js                   # Two-pass focus task generation
│       ├── topicClusters.js                  # Semantic clustering
│       ├── queryClassifier.js                # Domain classification
│       ├── llmClassifier.js                  # LLM fallback classifier
│       ├── promptAssembler.js                # Dynamic prompt builder
│       ├── progressBackend.js                # Progress data shaping
│       ├── progressUtils.js                  # Pure metric calculations
│       ├── planLimits.js                     # Plan enforcement
│       ├── voiceLimits.js                    # Voice call limits
│       ├── internalAccess.js                 # Dev bypass logic
│       ├── examUtils.js                      # Exam formatting
│       ├── subjectOptions.js                 # Subject/exam type lists
│       ├── chatStorage.js                    # Conversation persistence
│       ├── track.js                          # Event logging
│       ├── eventRegistry.js                  # Event type definitions
│       ├── realtimeDebounce.js               # Debounce strategy
│       ├── skeletonStyles.js                 # Skeleton CSS generation
│       ├── styles.js                         # Design token constants
│       ├── memory.js                         # User memory traces
│       ├── analytics/                        # Analytics helpers
│       │   ├── computeFocusScore.js
│       │   ├── computeTrends.js
│       │   ├── computeStreak.js
│       │   ├── computeProgress.js
│       │   ├── computeAccuracy.js
│       │   └── generateInsights.js
│       ├── ingest/                           # PDF processing pipeline
│       │   ├── extractConcepts.js
│       │   ├── validateConcepts.js
│       │   ├── persistGraph.js
│       │   ├── generateCards.js
│       │   └── persistCards.js
│       └── prompts/                          # AI prompt definitions
│           ├── coach.js                      # Socratic coach prompt
│           └── domains/                      # Domain-specific prompts
│               ├── cs.js, physics.js, math.js
│               ├── biology.js, chemistry.js
│               ├── medical.js, law.js
│               ├── finance.js, electrical.js
│               ├── mechanical.js, business.js
├── supabase/
│   ├── migrations/                           # SQL migration files (partial)
│   └── quickchat_migration.sql               # conversations table
├── tests/
│   ├── unit/                                 # 15 unit test files
│   └── e2e/                                  # Playwright E2E tests
├── docs/
│   └── superpowers/
│       ├── plans/                            # Implementation plans
│       └── specs/                            # Feature specifications
├── next.config.mjs                           # React compiler, redirects
├── tailwind.config.js (via postcss)          # Tailwind v4
├── vercel.json                               # Vercel deployment config
├── playwright.config.js                      # E2E test config
├── eslint.config.mjs                         # ESLint v9 flat config
└── jsconfig.json                             # @/* path alias
```

---

## 4. Frontend System Audit

### UI Architecture
- **App Router:** Next.js 16 App Router with `"use client"` on all interactive components
- **Component Model:** Function components + hooks only (no class components)
- **Styling System:** CSS custom properties (design tokens) + Tailwind v4 utility classes + some inline styles
- **Animation:** Framer Motion for transitions, CSS keyframes for ambient effects, Canvas API for particles

### Design System
**Brand:** Purple (#7c3aed), dark background (#0a0a0a), card surfaces (#0f172a → #1e293b)

**Typography:** Geist Sans + Geist Mono (Next.js Google Fonts)
**Scale:** body 13px, label 12px, caption 11px — unusually small for desktop readability

**Component Library:** Mix of custom components + shadcn/ui (`@shadcn/ui@0.0.4`)

**Status:** Dark theme complete. Light mode togglable in UI but CSS variables not populated — switching to light mode renders incorrectly.

### Page-by-Page Analysis

#### Landing Page (`/`)
- **Status:** Complete, polished
- **Implementation:** Server-rendered, Framer Motion scroll animations
- **Components:** FadeUp wrapper, feature cards, testimonials, CTA
- **APIs:** None (static)
- **UX gaps:** No demo video, no live interactive demo

#### Dashboard (`/dashboard`)
- **Status:** Complete, dual-mode (Study/Progress)
- **Components:** DashboardSidebar, BentoGrid, GreetingRow, StudyModeCards, QuickChatDrawer
- **APIs:** `/api/progress/summary`, realtime subscriptions
- **Loading:** DashboardSkeleton shown while `userReady = false`
- **UX gaps:** No empty state for new users with 0 PDFs uploaded

#### Ask AI (`/ask-ai`)
- **Status:** Complete, advanced conversation management
- **Components:** AskAISidebar, AskAISection, conversation URL params (?cid=)
- **APIs:** `/api/ask` (streaming), `/api/conversations`
- **Streaming:** Custom `__META__` protocol parsed in frontend
- **UX gaps:** No clear indication when cache is hit vs fresh answer

#### Quiz (`/quiz`)
- **Status:** Complete with resilience/retry logic
- **Components:** QuizPDFSelector, QuestionSkeleton, streaming generation via `useQuizStream`
- **APIs:** `/api/generate-quiz`, `/api/ai/evaluate-answer`, `/api/quiz-results`
- **State Machine:** init → resumeDialog → selectingPdf → active → completed
- **UX gaps:** No difficulty selector before quiz starts, no history of past quizzes

#### Focus Mode (`/focus`)
- **Status:** Complete, immersive layout
- **Components:** FocusSessionSetup, FocusSessionActive, FocusInlineChat, FocusAmbientBackground
- **APIs:** `/api/generate-focus-tasks`, `/api/focus-progress`
- **Recovery:** localStorage session recovery up to 24h
- **UX gaps:** No pause/resume for timer, no task skipping

#### Study/SRS (`/study`)
- **Status:** Complete, keyboard-first UX
- **APIs:** `/api/cards/due`, `/api/cards/[id]/review`
- **SRS:** SM-2 algorithm, quality ratings 0–5 (keys 1–4 = Again/Hard/Good/Easy)
- **UX gaps:** No card creation UI (cards only come from PDF processing), no stats screen

#### Exams (`/exams`)
- **Status:** Complete
- **Components:** ExamCountdownSection, WeakTopicsSection, AddExamModal
- **APIs:** `/api/exam`, `/api/weak-topics`
- **UX gaps:** No bulk exam import, no syllabus editor

#### Progress (`/progress`)
- **Status:** Complete, rich analytics
- **Components:** 12 metric cards, AnimatedNumber, Celebration particles
- **APIs:** `/api/progress/summary` (single aggregation endpoint)
- **Metrics:** Focus score, peer percentile, streak, study time, accuracy, retention, exam readiness
- **UX gaps:** No date range filter, no export to PDF/CSV

#### Voice AI (`/call-tutor`)
- **Status:** Complete with full voice pipeline
- **Flow:** idle → connecting → greeting → listening → thinking → speaking → ended
- **APIs:** 5 voice endpoints (start/transcribe/respond/speak/end)
- **Audio:** 7-bar frequency visualizer, 1.6s silence detection, 30s max utterance
- **Languages:** English, Hindi, French
- **UX gaps:** No call history, no transcript download

### Animations & Motion Quality
| Animation | Implementation | Quality |
|-----------|---------------|---------|
| Scroll fade-ups | Framer Motion useInView | Excellent |
| Card hover glow | whileHover scale + shadow | Excellent |
| Timer ring pulse | Framer Motion opacity loop | Very Good |
| Thinking steps | Vortex SVG + shimmer text | Excellent — domain-specific |
| Celebration burst | 24 canvas particles | Very Good |
| Ambient parallax | CSS + RAF LERP scroll | Very Good |
| AI dust particles | Canvas requestAnimationFrame | Good — respects prefers-reduced-motion |
| Skeleton screens | CSS pulse keyframes | Good |
| Number counters | Framer Motion animate() | Good |

### Performance: Frontend Observations
- No code splitting beyond Next.js automatic route-level splitting
- Framer Motion imported fully (no tree-shaking configured)
- ReactFlow (heavy library) potentially loading on all routes
- Recharts loaded even when no charts visible
- DashboardContext fetches 6+ API calls on mount (potential waterfall)
- No lazy loading for off-screen progress components

---

## 5. Backend System Audit

### API Architecture
**58+ route handlers** organized by feature domain. No centralized middleware. All routes are standalone async functions with inline auth and error handling.

### Authentication Pattern
Every protected route repeats this pattern:
```javascript
const token = req.headers.get("authorization")?.replace("Bearer ", "");
if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const { data: { user } } = await supabase.auth.getUser(token);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```
This is duplicated across all 58 routes with no abstraction layer.

### Critical Security Issues
1. **`GET /api/conversations?user_id=X`** — Accepts user_id from query params without auth verification. Any unauthenticated request can fetch another user's conversation list.
2. **`DELETE /api/delete-pdf?id=X`** — No ownership verification. Any authenticated user can delete any PDF by guessing/knowing its UUID.
3. **`POST /api/upload`** — Accepts `userId` from formData body without cross-checking against auth token.

### Rate Limiting & Caching
**Rate Limiting:**
- Q&A: 20/day free, unlimited Student/Pro (queried from qa_usage table per request)
- PDFs: 1 free, 10 Student, unlimited Pro (counted from documents table)
- Voice calls: plan-dependent (tracked in voice_calls table)
- Events: 50 max per batch

**Caching:**
- Q&A responses: 7-day TTL, SHA256(question+domain+marks) key in qa_cache table
- Only caches non-PDF-context general knowledge questions
- Cache hit returned via `X-From-Cache: true` header

### Streaming Protocol
Main Q&A endpoint (`/api/ask`) uses a custom streaming protocol:
```
Stream chunk 1: __META__{json}\n  (sources, classification, fromCache)
Stream chunk 2-N: answer text tokens
Stream chunk N+1: __CONV__{json}  (conversation ID, if new)
```
Frontend must parse and strip these markers before rendering. This is brittle — any change to marker format breaks the client without a versioning strategy.

### AI Integration
| Endpoint | Model | Streaming | Tokens/call (est.) |
|----------|-------|-----------|-------------------|
| /api/ask (answering mode) | gpt-4o-mini | Yes | ~2,000–4,000 |
| /api/ask (coach mode) | gpt-4o-mini | Yes | ~1,500–3,000 |
| /api/process-pdf (OCR) | gpt-4o | No | ~5,000–20,000 |
| /api/process-pdf (concepts) | gpt-4o | No | ~3,000–6,000 |
| /api/generate-quiz | gpt-4o-mini | No | ~2,000 |
| /api/ai/evaluate-answer | gpt-4o-mini | No | ~1,500 |
| /api/generate-focus-tasks | gpt-4o + gpt-4o-mini | No | ~4,000–8,000 |
| /api/daily-plan | gpt-4o-mini | No | ~2,000 |
| /api/voice/respond | gpt-4o-mini | No | ~1,000 |

### Error Handling Assessment
**Inconsistent patterns found:**
- `/api/ask` → try/catch → 500 "Something went wrong"
- `/api/documents` → try/catch → returns `[]` (silent failure)
- `/api/conversations` → DB error → returns `[]` (no error logged)
- `/api/progress/summary` → catches individual query errors, continues with nulls
- `/api/payments/webhook` → validates signature → returns 400 on failure (correct)

**No error monitoring** (no Sentry, no Datadog, no structured logging to external service).

### Middleware Status
**No middleware.ts/middleware.js exists.** All cross-cutting concerns (auth, logging, rate limiting) are duplicated inline. This is the single biggest backend architecture debt.

---

## 6. Database & Data Models

### Complete Table Inventory

| Table | Migration Status | RLS | Realtime | Notes |
|-------|-----------------|-----|---------|-------|
| profiles | ✅ Migrated | ✅ | — | Auto-created by trigger |
| user_plans | ✅ Migrated | ✅ | — | Free/Student/Pro/School |
| qa_usage | ✅ Migrated | Service role | — | Daily Q&A counter |
| qa_cache | ✅ Migrated | None | — | 7-day TTL answers |
| answer_feedback | ✅ Migrated | ✅ | — | User ratings |
| voice_calls | ✅ Migrated | ✅ | — | Session tracking |
| learning_events | ✅ Migrated | ✅ | ✅ | Canonical event log |
| mastery_topics | ✅ Migrated (today) | ✅ | ✅ | Mastery scores |
| weak_topics | ✅ Migrated | ✅ | ✅ | Promoted weak areas |
| topic_attempts | ✅ Migrated | ✅ | — | Staging for promotion |
| spaced_repetition_cards | ✅ Migrated | ✅ | ✅ | SM-2 state |
| generated_artifacts | ✅ Migrated | ✅ | — | AI-generated content |
| concepts | ✅ Migrated | ✅ | — | PDF concept nodes |
| concept_edges | ✅ Migrated | ✅ | — | Knowledge graph edges |
| mastery_state | ✅ Migrated | ✅ | — | FSRS state per concept |
| cards | ✅ Migrated | ✅ | — | SRS review items |
| questions | ✅ Migrated | ✅ | — | Quiz questions |
| conversations | ✅ Migrated | ✅ | — | Chat threads (JSON) |
| documents | ❌ Missing | Assumed | — | PDF metadata |
| document_chunks | ❌ Missing | Assumed | — | RAG vector storage |
| focus_progress | ❌ Missing (ALTER only) | Assumed | ✅ | Focus session data |
| study_streaks | ❌ Missing | Assumed | ✅ | Streak counter |
| exams | ❌ Missing | Assumed | ✅ | Exam schedule |
| pdfs_metadata | ❌ Missing | — | — | FK target in profiles |
| chat_messages | ❌ Missing | Assumed | — | Legacy chat |
| user_memory | ❌ Missing | — | — | Used in memory.js |
| revision_topics | ❌ Missing | — | — | Used in mastery.js |
| syllabus_topics | ❌ Missing | — | — | PDF subject mapping |

### Entity Relationship Summary
```
auth.users (Supabase Auth)
  ├── profiles (1:1)
  ├── user_plans (1:1)
  ├── documents (1:N)
  │   └── document_chunks (1:N, vector indexed)
  │   └── concepts (1:N)
  │       ├── concept_edges (M:N self-referential)
  │       ├── mastery_state (1:N per user)
  │       ├── cards (1:N)
  │       └── questions (1:N)
  ├── learning_events (1:N, canonical log)
  ├── mastery_topics (1:N, per topic string)
  ├── weak_topics (1:N, promoted from topic_attempts)
  ├── topic_attempts (1:N, staging)
  ├── spaced_repetition_cards (1:N, per topic string)
  ├── focus_progress (1:N, session tasks)
  ├── study_streaks (1:1)
  ├── exams (1:N)
  ├── generated_artifacts (1:N)
  ├── conversations (1:N)
  ├── voice_calls (1:N)
  ├── qa_usage (1:N, daily counter)
  └── answer_feedback (1:N)
```

### Vector Search Architecture
- Extension: pgvector
- Dimension: 1536 (OpenAI text-embedding-3-small)
- Index type: IVFFlat with `lists=100`
- Distance metric: cosine (`<=>` operator)
- Tables with embeddings: learning_events, concepts, document_chunks
- RPC functions: `match_documents`, `match_documents_multi`, `match_learning_events`

### Realtime Architecture
7 tables broadcast Postgres CDC via Supabase Realtime:
- `learning_events` — REPLICA IDENTITY DEFAULT (append-only, no UPDATE payloads needed)
- `focus_progress`, `mastery_topics`, `weak_topics`, `exams`, `spaced_repetition_cards`, `study_streaks` — REPLICA IDENTITY FULL (UPDATE includes old row for diffs)

Client subscribes via `useRealtimeProgress()` hook with 500ms debounce + 2s minimum between refetches + 60s polling fallback.

---

## 7. Authentication & User System

### Login/Signup Flow
```
Email/Password:
  Signup → Supabase GoTrue → email verification sent → redirect /dashboard
  Login → Supabase JWT issued → stored in session → Authorization header

Google OAuth:
  Click → Supabase OAuth redirect → Google consent → /auth/callback → 
  Exchange code → JWT issued → redirect /dashboard
```

### Session Management
- JWT access token stored in Supabase session (httpOnly cookie + localStorage hybrid)
- Token passed as `Authorization: Bearer {token}` header manually on every API call
- Refresh token auto-refreshed by Supabase client
- Session timeout: 10s on login page before redirect

### Plan/Role System
```
user_plans.plan ∈ { free, student, pro, school }
user.app_metadata.role === "internal_dev" → bypass all limits
```
No RBAC (role-based access control) beyond the single internal_dev flag.

### Security Weaknesses
1. **No centralized auth middleware** — every route independently validates
2. **No refresh token rotation** — standard Supabase behavior, acceptable
3. **Rate limit bypass** via dev flag has no audit trail
4. **Password reset flow** — implemented but no account lockout on failed attempts (frontend does 5-attempt limit, backend doesn't)

### Missing Auth Features
- Email verification enforcement before dashboard access
- Account lockout at backend level
- Session invalidation API (force logout on all devices)
- 2FA/MFA
- Social login beyond Google (GitHub, LinkedIn)

---

## 8. Student Platform Features Audit

### Core Features Status Matrix

| Feature | Status | Backend | Frontend | UX Quality | Notes |
|---------|--------|---------|----------|-----------|-------|
| PDF Upload | ✅ Complete | Real | Real | Good | OCR fallback for scanned PDFs |
| Q&A with RAG | ✅ Complete | Real | Real | Excellent | Streaming, caching, multi-PDF |
| AI Coach Mode | ✅ Complete | Real | Real | Very Good | Socratic method, guided questions |
| Quiz Generation | ✅ Complete | Real | Real | Good | MCQs from PDF topics |
| Answer Evaluation | ✅ Complete | Real | Real | Good | Grades with marks, rubric, explanation |
| Focus Mode | ✅ Complete | Real | Real | Very Good | Two-pass AI task generation |
| SRS Flashcards | ✅ Complete | Real | Real | Good | SM-2 algorithm, keyboard shortcuts |
| Exam Tracking | ✅ Complete | Real | Real | Good | Countdown, weak topics per exam |
| Progress Analytics | ✅ Complete | Real | Real | Excellent | 12+ metrics, realtime updates |
| Voice AI Tutor | ✅ Complete | Real | Real | Good | 5-phase pipeline, 3 languages |
| Study Streak | ✅ Complete | Real | Real | Good | Daily tracking |
| Weak Topic Detection | ✅ Complete | Real | Real | Good | Auto-promoted at 3+ attempts |
| Mastery Scoring | ✅ Complete | Real | Real | Good | SRS + quiz weighted formula |
| Daily Plan | ✅ Complete | Real | Real | Good | AI-generated, priority-ranked |
| Concept Graph | ✅ Complete | Real | Dev-only | Partial | Graph UI only at /dev/graph |
| Semantic Clustering | ✅ Complete | Real | No UI | Partial | Clusters computed, not visualized |
| Conversation History | ✅ Complete | Real | Real | Good | Per-conversation threads |
| Export (PDF/DOCX) | ✅ Complete | Real | Partial | Fair | Generation works, export UI unclear |
| Leaderboard/Social | ❌ Missing | None | None | — | Peer percentile calculated but no display |
| Notifications | ⚠️ Partial | Partial | Partial | Fair | Milestone toasts only, no push/email |
| Admin Dashboard | ❌ Missing | None | None | — | No moderation or user management |
| Gamification | ⚠️ Partial | Partial | Partial | Fair | Streaks + milestone toasts only |

---

## 9. Admin & Management Systems

### Current State: Non-Existent
There is zero admin functionality:
- No admin UI
- No moderation dashboard
- No content management
- No user management
- No analytics panel for operators
- No way to view system health

### Dev Utilities (Partial Replacement)
- `/dev/graph/[docId]` — concept graph visualizer for any document
- `/dev/backfill` — trigger concept extraction on old documents
- Both require manual URL access, no authentication gates

### Implications
For a SaaS product with paying users:
- No ability to investigate failed payments
- No ability to reset user plan
- No ability to view flagged content
- No operational visibility

---

## 10. API & Integration Mapping

### Third-Party Services

| Service | SDK | Usage | Status |
|---------|-----|-------|--------|
| OpenAI | openai@6.34.0 | Q&A, embeddings, OCR, quiz, coaching, planning | Active, production |
| Supabase | @supabase/supabase-js@2.99.1 | DB, auth, storage, realtime | Active, production |
| Razorpay | razorpay@2.9.6 | INR subscription payments | Implemented, needs testing |
| Anthropic | @anthropic-ai/sdk@0.90.0 | Installed, no confirmed usage found | Unused/exploratory |
| LangChain | langchain@1.2.33 + splitters | Text chunking for RAG | Active, text splitting only |
| Tesseract.js | tesseract.js@7.0.0 | OCR fallback | Active, fallback only |

### Environment Variable Security
All secrets (OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY, RAZORPAY_KEY_SECRET) are server-only and never exposed to the client. `NEXT_PUBLIC_*` vars are correctly limited to non-sensitive values.

---

## 11. UI/UX Quality Review

### Visual Consistency
**Score: 8.5/10**
Design system is cohesive — purple brand, dark surfaces, consistent border radius (10–20px), consistent typography scale. Some inconsistency between pages (some use inline styles, some Tailwind, some CSS custom properties).

### Design Maturity
**Score: 7.5/10**
The design is genuinely impressive for a student project / early startup. Ambient particle effects, domain-specific thinking animations, parallax focus mode backgrounds are unusual polish for this stage. Main weakness: information density is high and typography is small (13px body), which strains readability.

### Mobile Experience
**Score: 6.5/10**
Responsive breakpoints exist (480/640/768px). Grid layouts collapse correctly. However, the sidebar doesn't become a bottom nav on mobile, complex analytics cards lose information at small sizes, and voice UI is untested on touch.

### Empty States
**Missing:** New user with 0 PDFs sees a blank dashboard. No onboarding nudge to upload first PDF after completing onboarding. This will hurt activation rate.

### Error Messaging
**Inconsistent.** API errors surface as console.error in many routes with generic "Something went wrong" shown to users. No descriptive error UI components.

### Key UX Gaps
1. No empty state for new user dashboard
2. No progress/loading indicator on PDF processing (user doesn't know when it's done)
3. No clear differentiation between cached and fresh AI answers
4. Quiz has no difficulty selection before start
5. No way to create custom SRS cards manually
6. No date range filter on progress analytics
7. Mobile sidebar doesn't convert to bottom navigation

---

## 12. Code Quality Audit

### Code Consistency
**Score: 6/10**
Mix of `.js`/`.jsx`/`.tsx` files with no clear rule. ThemeContext is TypeScript; everything else is JavaScript. No consistent import ordering. Some components use `export default`, others use named exports.

### Technical Debt Summary
1. **DashboardContext.jsx (1,467 lines):** God object. Manages auth, exams, Q&A, quiz, mastery, focus sessions, plans, analytics, and realtime subscriptions. Should be split into 6-8 feature-scoped contexts.
2. **No middleware:** Auth duplication across 58 routes creates significant maintenance burden.
3. **Custom streaming protocol:** `__META__`/`__CONV__` markers have no versioning. Any format change breaks all clients silently.
4. **No TypeScript:** No compile-time safety on API response shapes. Frontend/backend contract not enforced.
5. **`adaptivePlanner.js` referenced but not a separate file:** Adaptive planning is inline in DashboardContext.
6. **Duplicate parsers:** Both `pdf-parse` and `pdf-parser` installed for the same job.
7. **Dead dependency:** `@anthropic-ai/sdk` installed but no confirmed production usage.
8. **Error swallowing:** Many async calls wrapped in `.catch(() => {})` silently drop errors.

### Naming Conventions
Generally good. Snake_case for DB columns, camelCase for JS variables. Some inconsistency: `get-pdfs` vs `user-pdfs` as API route names for similar operations.

### Test Coverage Assessment
- **Unit tests:** 15 files covering auth, plan limits, cache, OCR parsing, streaming, progress utils, exam utils, animations — **Good**
- **E2E tests:** Playwright configured for chromium + mobile-chrome — **Partially implemented**
- **Integration tests:** None — **Missing**
- **API contract tests:** None — **Missing**

---

## 13. Performance Audit

### Bundle Size Risks
- `framer-motion@12.38.0` — large (100KB+ gzipped), imported fully
- `reactflow@11.11.4` — very large (200KB+ gzipped), used only in `/dev/graph`
- `recharts@3.8.0` — 80KB+ gzipped, only used in progress page
- `langchain@1.2.33` — 400KB+ gzipped (includes many peer deps), only used for text splitting

### Slow Rendering Areas
- `/api/progress/summary` runs 6 parallel DB queries on every request, some of which trigger secondary computations
- `computeWeakTopicClusters()` calls OpenAI embeddings API before returning — adds 500-1500ms to progress page load
- DashboardContext mounts with 6+ API calls in parallel — some may waterfall

### Database Query Concerns
- Rate limit checks (canAskQuestion, canUploadPDF) run separate DB queries on every API call — not cached
- `qa_cache` table has no automatic purge mechanism (manual cron job recommended but not set up)
- IVFFlat indexes with `lists=100` appropriate for <1M vectors; will need tuning at scale

### Optimization Recommendations
1. Lazy-load ReactFlow only in `/dev/graph` — saves ~200KB on all other routes
2. Cache rate limit results in Redis/Supabase edge cache (5-minute TTL)
3. Move `computeWeakTopicClusters` to background job, serve from cache
4. Dynamic import Recharts only on progress page
5. Set up `pg_cron` for automatic qa_cache + qa_usage purge

---

## 14. Security Audit

### Critical Issues

#### CRITICAL-1: Unauthenticated Conversation Fetch
```
GET /api/conversations?user_id=<any_uuid>
```
No auth token required. Any caller can enumerate a user's conversation metadata.
**Fix:** Remove `user_id` query param. Extract user ID from authenticated token only.

#### CRITICAL-2: Unauthorized PDF Deletion
```
DELETE /api/delete-pdf?id=<any_uuid>
```
Authenticated users can delete any PDF by UUID (no ownership check).
**Fix:** Add `WHERE id = ? AND user_id = auth_user.id` to delete query.

#### HIGH-1: Upload Without Auth Verification
```
POST /api/upload
FormData { userId: "..." }
```
userId comes from form data, not verified against auth token.
**Fix:** Extract userId exclusively from `supabase.auth.getUser(token)`.

### Other Security Observations
| Risk | Severity | Status |
|------|---------|--------|
| HMAC-SHA256 signature on Razorpay webhook | ✅ Correct | — |
| Service role key used only server-side | ✅ Correct | — |
| No CSRF (SPA + Bearer auth = acceptable) | ✅ Acceptable | — |
| Event type whitelist in /api/events | ✅ Good | — |
| Input length caps on AI endpoints | ✅ Good | — |
| Error messages expose system state occasionally | ⚠️ Low | — |
| No structured error logging | ⚠️ Medium | Missing Sentry |
| No dependency audit in CI | ⚠️ Low | No npm audit in pipeline |
| Anthropic SDK dependency unexplained | ⚠️ Low | Clarify or remove |

---

## 15. Missing Features & Gaps

### Critical (Production Blockers)
1. Fix 2 critical API security vulnerabilities
2. Create missing SQL migrations for 13 tables
3. Add error monitoring (Sentry)
4. Set up GitHub Actions CI/CD with test gate
5. Implement PDF processing status feedback (polling or realtime)

### High Priority
1. Centralize auth middleware
2. Admin dashboard (basic user/plan management)
3. Light mode CSS completion
4. Empty state for new user dashboard
5. PDF upload progress indicator
6. Payment webhook idempotency keys

### Medium Priority
1. Split DashboardContext into feature contexts
2. TypeScript migration (at least for API routes)
3. Add pg_cron for cache/usage table purge
4. Quiz difficulty selection
5. Manual SRS card creation
6. Progress date range filter
7. Leaderboard/social comparison
8. Push notifications for exam reminders

### Low Priority
1. Remove duplicate pdf-parse / pdf-parser dependency
2. Clarify/remove @anthropic-ai/sdk usage
3. Lazy-load ReactFlow (only in dev pages)
4. Concept graph visualization on production pages
5. Semantic cluster visualization on dashboard
6. DOCX/PDF export UI improvement
7. Custom prompt templates per user

---

## 16. Production Readiness Assessment

### Scoring

| Category | Score | Notes |
|----------|-------|-------|
| Feature Completeness | 72/100 | Core flows work, admin missing |
| Security | 45/100 | 2 critical vulnerabilities unpatched |
| Database Integrity | 55/100 | 13 tables without migrations |
| Error Handling | 40/100 | Silent failures, no monitoring |
| Test Coverage | 55/100 | Unit tests good, integration missing |
| Performance | 65/100 | No obvious blockers, optimization needed |
| Deployment Readiness | 75/100 | Vercel config good, no CI gate |
| Scalability | 60/100 | Architecture sound, rate limits not scalable |
| Documentation | 50/100 | system_map.md good, API undocumented |
| Observability | 20/100 | No logging, no metrics, no alerting |

**Overall Production Readiness Score: 54/100**

### Major Blockers
1. Security vulnerabilities (CRITICAL-1, CRITICAL-2) — user data at risk
2. Missing migrations — schema cannot be reproduced in new environment
3. No error monitoring — blind to production failures
4. No admin tooling — cannot support paying customers

---

## 17. Recommended Next Development Roadmap

### Sprint 0 (Now, 1-2 days): Security Patches
- Fix `/api/conversations` auth bypass
- Fix `/api/delete-pdf` ownership check
- Fix `/api/upload` userId validation

### Sprint 1 (Week 1): Foundation Hardening
- Create missing migrations for all 13 tables
- Add centralized auth middleware
- Set up GitHub Actions: lint → unit tests → build
- Set up Sentry error monitoring

### Sprint 2 (Week 2): Core UX Gaps
- Empty state for new user dashboard
- PDF processing progress indicator (realtime or polling)
- Light mode CSS variables completion
- Payment webhook idempotency

### Sprint 3 (Week 3): Code Architecture
- Split DashboardContext into feature contexts (ExamContext, QuizContext, FocusContext)
- Migrate API routes to TypeScript
- Replace custom streaming protocol with SSE or structured format

### Sprint 4 (Week 4): Admin & Operations
- Basic admin dashboard: user list, plan management, usage stats
- pg_cron for cache/usage purge
- Performance: lazy-load ReactFlow, cache rate limits

### Month 2: Product Expansion
- Leaderboard/social comparison features
- Concept graph on production pages (not just /dev)
- Manual SRS card creation
- Quiz history and difficulty selection
- Push notifications for exam reminders

---

## 18. Final Technical Verdict

### Engineering Assessment
This is a genuinely sophisticated codebase for its stage. The AI integration depth — RAG with semantic search, domain-specific prompts, SM-2 spaced repetition, Socratic coaching, voice pipeline, concept graph extraction — is unusually advanced for an early-stage product. The realtime architecture with intelligent debouncing and fallback polling shows architectural thoughtfulness.

The weaknesses are concentrated in infrastructure (no middleware, missing migrations, no monitoring) and represent correctable technical debt rather than fundamental design flaws.

### Product Maturity
**Late Alpha.** The core value proposition (AI tutoring over your own PDFs) is demonstrable and works. Several supporting features (voice, focus mode, analytics) add real depth. Missing: admin tooling, production hardening, onboarding polish.

### Startup Readiness
**Demo-ready, not investor-ready.** Can demo all core flows convincingly. But paying users can't be confidently onboarded at scale due to security issues and absent operational tooling.

### Investor/Demo Readiness
**7/10.** Strong AI feature surface, polished UI, real working product. Gaps in security and admin would surface in technical due diligence.

### Biggest Risks
1. Security vulnerabilities before user data grows
2. Schema reproducibility (missing migrations = production fragility)
3. DashboardContext becoming increasingly unmaintainable as features grow
4. No observability — flying blind in production

### Biggest Strengths
1. Best-in-class AI feature set for the EdTech vertical
2. Realtime progress architecture is genuinely impressive
3. SM-2 SRS correctly integrated across document processing → review → mastery feedback loop
4. Dark-theme UI polish is significantly above typical early-stage quality
5. Plan-based rate limiting enforced correctly at backend

### Estimated Remaining Work
- **Security fixes:** 2-3 days
- **Missing migrations:** 3-5 days
- **Admin dashboard (basic):** 1-2 weeks
- **Production readiness (monitoring, CI, testing):** 1-2 weeks
- **Light mode completion:** 3-5 days
- **Total to production-ready state:** ~6-8 weeks of focused engineering
