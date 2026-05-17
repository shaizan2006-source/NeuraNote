# Feature Status Matrix — Ask My Notes
*Generated: 2026-05-15 | Updated: 2026-05-16*

---

## Table of Contents
1. [Legend](#legend)
2. [Core Learning Features](#1-core-learning-features)
3. [AI & Intelligence Features](#2-ai--intelligence-features)
4. [Progress & Analytics](#3-progress--analytics)
5. [User System & Auth](#4-user-system--auth)
6. [UI & Design System](#5-ui--design-system)
7. [Backend Infrastructure](#6-backend-infrastructure)
8. [Database & Data Layer](#7-database--data-layer)
9. [Payments & Subscriptions](#8-payments--subscriptions)
10. [DevOps & Operations](#9-devops--operations)
11. [Admin & Management](#10-admin--management)
12. [Overall Completion Summary](#11-overall-completion-summary)

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ Complete | Production-ready, fully functional |
| 🟡 Partial | Core works, significant gaps remain |
| 🔴 Missing | Not implemented |
| ⚠️ Issue | Implemented but has bugs/security issues |
| 🧪 Dev-only | Exists only in /dev routes, not user-facing |

---

## 1. Core Learning Features

| Feature | Status | Frontend | Backend | DB | Notes |
|---------|--------|----------|---------|-----|-------|
| PDF Upload (text PDFs) | ✅ | ✅ | ✅ | 🔴 missing migration | Works end-to-end |
| PDF Upload (scanned/OCR) | ✅ | ✅ | ✅ | 🔴 | gpt-4o vision fallback |
| Multi-PDF selection for Q&A | ✅ | ✅ | ✅ | ✅ | match_documents_multi RPC |
| PDF deletion | ⚠️ | ✅ | ⚠️ | ✅ | No ownership check on delete |
| PDF library management | 🟡 | ✅ | ✅ | 🔴 | No rename/tag/folder UI |
| PDF processing status indicator | 🔴 | 🔴 | 🔴 | — | User has no feedback during processing |
| Q&A (text PDF context) | ✅ | ✅ | ✅ | ✅ | RAG with vector search |
| Q&A (no PDF / general knowledge) | ✅ | ✅ | ✅ | ✅ | Cached 7 days |
| Q&A streaming responses | ✅ | ✅ | ✅ | — | Custom __META__ protocol |
| AI Coach Mode (Socratic) | ✅ | ✅ | ✅ | — | No Q&A limit on coach |
| Conversation history | ✅ | ✅ | ⚠️ | ✅ | Auth bypass on GET |
| Conversation persistence | ✅ | ✅ | ✅ | ✅ | JSON array in DB |
| Follow-up question suggestions | ✅ | ✅ | ✅ | — | DynamicFollowUps component |
| Answer rating / feedback | ✅ | ✅ | ✅ | ✅ | 👍/👎 + flag type |
| Answer confidence display | ✅ | ✅ | ✅ | — | ConfidenceBadge component |
| Source citation | ✅ | ✅ | ✅ | — | Top 5 chunks via __META__ |
| Quiz generation (MCQ) | ✅ | ✅ | ✅ | 🔴 | No quiz session migration |
| Quiz answer evaluation (AI grading) | ✅ | ✅ | ✅ | — | Marks, rubric, explanation |
| Quiz difficulty selection | 🔴 | 🔴 | 🔴 | — | Fixed difficulty currently |
| Quiz history | 🔴 | 🔴 | 🔴 | — | No past quiz review |
| Quiz session resume | ✅ | ✅ | — | — | sessionStorage-based |
| Spaced Repetition (SRS) flashcards | ✅ | ✅ | ✅ | ✅ | SM-2 algorithm |
| SRS card review (keyboard) | ✅ | ✅ | — | — | Keys 1-4, spacebar flip |
| Manual SRS card creation | 🔴 | 🔴 | 🔴 | — | Only auto-generated |
| SRS card editing | 🔴 | 🔴 | 🔴 | — | Not implemented |
| Focus Mode (Pomodoro) | ✅ | ✅ | ✅ | ⚠️ | Base table migration missing |
| Focus task AI generation | ✅ | ✅ | ✅ | — | Two-pass: gpt-4o + gpt-4o-mini |
| Focus session recovery | ✅ | ✅ | — | — | localStorage, 24h expiry |
| Focus inline chat | ✅ | ✅ | ✅ | — | Session-scoped context |
| Focus ambient background | ✅ | ✅ | — | — | Parallax + breathing CSS |
| Focus session timer pause | 🔴 | 🔴 | — | — | Not implemented |
| Voice AI Tutor | ✅ | ✅ | ✅ | ✅ | 5-phase pipeline |
| Voice multi-language | 🟡 | ✅ | ✅ | — | EN/HI/FR; others untested |
| Voice transcript display | ✅ | ✅ | ✅ | — | In-session |
| Voice call history | 🔴 | 🔴 | 🟡 | ✅ | DB has logs, no UI |
| Voice transcript download | 🔴 | 🔴 | 🔴 | — | Not implemented |
| Exam creation | ✅ | ✅ | ✅ | 🔴 | No migration |
| Exam countdown | ✅ | ✅ | — | — | Client-side calculation |
| Exam weak topic analysis | ✅ | ✅ | ✅ | ✅ | Per-exam weak topics |
| Exam study plan generation | ✅ | ✅ | ✅ | — | StudyPlanModal |
| Exam bulk import | 🔴 | 🔴 | 🔴 | — | Not implemented |
| Syllabus editor | 🔴 | 🔴 | 🔴 | — | Not implemented |
| Daily study plan | ✅ | ✅ | ✅ | — | AI-ranked, exam-aware |
| Adaptive study plan | ✅ | ✅ | ✅ | — | Client-side ranking |
| Quick chat drawer | ✅ | ✅ | ✅ | — | RAG-enabled floating chat |

---

## 2. AI & Intelligence Features

| Feature | Status | Model | Notes |
|---------|--------|-------|-------|
| RAG (Retrieval-Augmented Generation) | ✅ | text-embed-3-small | Vector search via pgvector |
| Query domain classification | ✅ | keyword + gpt-4o-mini | 11 domains supported |
| Domain-specific prompts | ✅ | — | CS, Physics, Math, Bio, Chem, Med, Law, Finance, Elec, Mech, Biz |
| Prompt assembly by question type | ✅ | — | Theory/MCQ/numerical × temperature |
| Socratic coaching prompt | ✅ | gpt-4o-mini | coach.js (3 sentences max, guides only) |
| PDF concept graph extraction | ✅ | gpt-4o | Definition/theorem/procedure/formula nodes |
| Concept edge detection | ✅ | gpt-4o | prerequisite_of, related_to, specializes |
| Concept graph visualization | 🧪 | — | Only at /dev/graph/[docId] |
| Semantic weak topic clustering | ✅ | text-embed-3-small | Greedy cosine (threshold: 0.72) |
| Cluster visualization | 🔴 | — | Computed but no UI |
| Focus task generation (2-pass) | ✅ | gpt-4o + gpt-4o-mini | Blueprint → tasks |
| Daily plan with exam urgency | ✅ | gpt-4o-mini | SRS + weak topics + inactivity |
| AI answer caching | ✅ | — | SHA256 key, 7-day TTL |
| AI quiz question generation | ✅ | gpt-4o-mini | 5 MCQs from PDF + weak topics |
| AI answer evaluation (grading) | ✅ | gpt-4o-mini | Marks, rubric, explanation |
| AI practice question generation | ✅ | gpt-4o-mini | /api/ai/generate-questions |
| AI study artifact generation | ✅ | gpt-4o-mini | Flashcard/micro-quiz artifacts |
| Inactivity detection | ✅ | — | 2+ days → light tasks, 5+ → restart |
| Subject normalization | ✅ | — | 100+ subject variants mapped |
| LLM-based export detection | ✅ | — | detectExportIntent.js |
| Token cost awareness | 🔴 | — | No tracking or capping |
| Claude/Anthropic integration | 🔴 | — | SDK installed, no confirmed usage |

---

## 3. Progress & Analytics

| Feature | Status | Source | Notes |
|---------|--------|--------|-------|
| Study streak | ✅ | study_streaks | Daily tracking |
| Focus score (0-100) | ✅ | Computed | Streak×0.4 + time×0.4 + mastery×0.2 |
| Peer percentile (10-95) | ✅ | Computed | Focus×0.6 + streak×0.15 + mastery×0.25 |
| Total study time | ✅ | focus_progress | Sum of active_time_seconds |
| Weekly study time | ✅ | focus_progress | Last 7 days |
| Weekly change (%) | ✅ | Computed | Current vs prior week |
| Topics mastered count | ✅ | mastery_topics | mastery_score ≥ 50 |
| Average accuracy | ✅ | mastery_topics | Mean mastery_score |
| Retention score | ✅ | mastery_topics | % topics with score ≥ 70 |
| Top 5 topic accuracy | ✅ | mastery_topics | Sorted by score |
| Strongest subject | ✅ | Computed | Max avg mastery by subject |
| Session depth (avg mins) | ✅ | focus_progress | Mean active time per session |
| Daily study time chart | ✅ | focus_progress | Last 14 days |
| Difficulty breakdown | ✅ | focus_progress | Easy/medium/hard counts |
| Exam readiness score | ✅ | Computed | avgAccuracy×0.6 + retention×0.4 |
| Exam days left | ✅ | exams | Client-side calculation |
| Syllabus completion % | ✅ | Computed | topicsMastered / totalTopics |
| Study plan completion % | ✅ | focus_progress | Unique active dates / 30 |
| Engagement score | ✅ | learning_events | Derived from event types |
| Mode balance | ✅ | learning_events | Study vs quiz vs coach |
| Follow-up depth | ✅ | learning_events | Continuation behavior |
| Learning trend | ✅ | learning_events | 2-week trajectory |
| AI-generated insights | ✅ | Computed | Text recommendations |
| Realtime progress updates | ✅ | Supabase Realtime | 7 tables, 500ms debounce |
| Progress date range filter | 🔴 | — | Not implemented |
| Progress export (PDF/CSV) | 🔴 | — | Not implemented |
| Leaderboard / social comparison | 🔴 | — | Peer percentile calculated, no UI |
| Historical trend charts | 🟡 | — | Basic chart, no date controls |
| Admin analytics panel | 🔴 | — | Not implemented |

---

## 4. User System & Auth

| Feature | Status | Notes |
|---------|--------|-------|
| Email + password signup | ✅ | Supabase GoTrue |
| Google OAuth | ✅ | /auth/callback handler |
| Email verification | 🟡 | Email sent, not enforced before access |
| Password reset flow | ✅ | forgot-password + reset-password pages |
| 4-step onboarding wizard | ✅ | exam type → date → PDF → demo Q |
| JWT session management | ✅ | Supabase auto-refresh |
| Plan management (Free/Student/Pro) | ✅ | user_plans table |
| Plan enforcement at API level | ✅ | planLimits.js on each route |
| Internal dev bypass | ✅ | app_metadata.role check |
| Account lockout (backend) | 🔴 | Frontend 5-attempt limit only |
| 2FA / MFA | 🔴 | Not implemented |
| Session invalidation (all devices) | 🔴 | Not implemented |
| User profile editing | 🔴 | No UI for name/avatar change |
| Social login (GitHub, LinkedIn) | 🔴 | Only Google OAuth |
| Role-based access control | 🔴 | Only internal_dev flag |
| Account deletion | 🔴 | Not implemented |

---

## 5. UI & Design System

| Feature | Status | Notes |
|---------|--------|-------|
| Dark theme | ✅ | Full CSS custom properties |
| Gradient theme | ✅ | Variant of dark with gradient accents |
| Light theme (CSS) | 🔴 | UI toggle exists, variables empty |
| Theme persistence (Supabase) | ✅ | user_profiles.theme_preference |
| Theme persistence (localStorage) | ✅ | Fallback |
| Responsive design (desktop) | ✅ | 2-3 column grids |
| Responsive design (mobile) | 🟡 | Breakpoints exist, some layouts break |
| Mobile bottom navigation | 🔴 | Sidebar doesn't convert on mobile |
| Skeleton loading screens | ✅ | DashboardSkeleton, QuizSkeleton |
| Error boundary | ✅ | ErrorBoundary.jsx (Progress section) |
| Empty states (new users) | 🔴 | Missing for dashboard, SRS, progress |
| Framer Motion animations | ✅ | Scroll, hover, enter, number counters |
| AI thinking animation | ✅ | Domain-specific vortex + shimmer |
| Ambient particle effects | ✅ | Canvas-based AIDust (idle-triggered) |
| Ambient parallax (Focus Mode) | ✅ | 3-layer CSS + RAF lerp |
| Celebration particles | ✅ | 24-particle burst on milestones |
| Milestone toast notifications | ✅ | MilestoneToast component |
| QuickChat drawer | ✅ | FloatingQuickChatDrawer |
| AISkeleton / loading states | ✅ | Per-section skeletons |
| Accessibility (ARIA) | 🔴 | No documented ARIA attributes |
| Keyboard navigation | 🟡 | SRS has shortcuts; navigation missing |
| Reduced motion support | ✅ | prefers-reduced-motion checks |
| SEO (landing page) | 🟡 | No metadata/og tags found |
| SEO (app pages) | 🔴 | None (expected for auth-gated pages) |
| Error messaging (user-facing) | 🟡 | Generic messages; no specific errors |

---

## 6. Backend Infrastructure

| Feature | Status | Notes |
|---------|--------|-------|
| API routes (58+) | ✅ | All major features covered |
| Centralized auth middleware | 🔴 | Auth duplicated across 58 routes |
| Input validation | 🟡 | Strong on webhooks, weak on uploads |
| Rate limiting (plan-based) | ✅ | planLimits.js on sensitive routes |
| Q&A response caching | ✅ | qa_cache, 7-day TTL, SHA256 |
| Error handling | 🟡 | Inconsistent — some swallow errors |
| Structured error logging | 🔴 | console.error only |
| Error monitoring (Sentry) | 🔴 | Not integrated |
| Request logging | 🔴 | No access logs |
| API versioning | 🔴 | No versioning strategy |
| Background jobs | 🟡 | next/server.after() for concepts |
| Queue system | 🔴 | No job queue |
| Webhooks (Razorpay) | ✅ | HMAC verified |
| Webhook idempotency | 🔴 | No idempotency keys |
| File upload (PDF to Supabase) | ✅ | documents bucket |
| File size limits | 🟡 | Not explicitly enforced server-side |
| CORS configuration | — | Next.js default |
| Security headers | ✅ | X-Content-Type-Options, X-Frame-Options |

---

## 7. Database & Data Layer

| Feature | Status | Notes |
|---------|--------|-------|
| Core schema (auth tables) | ✅ | profiles, user_plans, qa_cache, etc. |
| Learning events table | ✅ | Full migration with RLS + indexes |
| Concept graph tables | ✅ | concepts, edges, mastery_state, cards |
| SRS cards table | ✅ | spaced_repetition_cards + sr_next_due() |
| Weak topics / topic attempts | ✅ | Full migration |
| Generated artifacts | ✅ | Full migration |
| Conversations table | ✅ | quickchat_migration.sql |
| Voice calls | ✅ | voice_migration.sql |
| Documents table | 🔴 | No CREATE TABLE migration |
| Document chunks | 🔴 | No migration |
| Focus progress (base) | 🔴 | Only ALTER columns exist |
| Study streaks | 🔴 | No migration |
| Exams | 🔴 | No migration |
| Chat messages | 🔴 | No migration |
| User memory | 🔴 | No migration |
| Revision topics | 🔴 | No migration |
| Syllabus topics | 🔴 | No migration |
| Row Level Security (RLS) | ✅ | On all documented tables |
| pgvector extension | ✅ | IVFFlat indexes, 1536 dims |
| Realtime subscriptions | ✅ | 7 tables configured |
| Database functions/RPCs | ✅ | sr_next_due, match_learning_events |
| match_documents RPC | 🔴 | Used in code, not in migrations |
| match_documents_multi RPC | 🔴 | Used in code, not in migrations |
| Auto table purge (cron) | 🔴 | qa_cache + qa_usage need purge jobs |
| Schema reproducibility | 🔴 | 13 tables undocumented |

---

## 8. Payments & Subscriptions

| Feature | Status | Notes |
|---------|--------|-------|
| Razorpay order creation | ✅ | Amount in paise (INR) |
| Client payment flow | ✅ | Checkout widget |
| Signature verification | ✅ | HMAC-SHA256 correct |
| Webhook handler | ✅ | Razorpay-Signature validated |
| Subscription activation | ✅ | user_plans upsert on verify/webhook |
| Subscription expiry | 🟡 | expires_at stored, not enforced on access |
| Subscription renewal | 🔴 | No auto-renewal logic |
| Subscription cancellation | 🔴 | No cancellation flow |
| Invoice/receipt generation | 🔴 | Not implemented |
| Refund handling | 🔴 | Not implemented |
| Plan downgrade | 🔴 | Not implemented |
| Webhook idempotency | 🔴 | Risk of double-activation |
| Payment history UI | 🔴 | Not implemented |
| Plan comparison page | ✅ | /pricing page exists |
| Free trial | 🔴 | Not implemented |

---

## 9. DevOps & Operations

| Feature | Status | Notes |
|---------|--------|-------|
| Vercel deployment | ✅ | vercel.json configured |
| Environment variable management | ✅ | @secrets via Vercel |
| Security headers | ✅ | X-Content-Type-Options, X-Frame-Options |
| CI/CD pipeline | 🔴 | No GitHub Actions |
| Automated testing in CI | 🔴 | Tests run manually only |
| Unit tests (15 files) | ✅ | Node.js native test runner |
| E2E tests (Playwright) | 🟡 | Configured, coverage unknown |
| Load tests | 🟡 | Script exists (tests/load/load-test.mjs) |
| Error monitoring | 🔴 | No Sentry/Datadog |
| Uptime monitoring | 🔴 | Not configured |
| Database backups | 🟡 | Supabase managed backups |
| Log aggregation | 🔴 | No external log service |
| Performance monitoring | 🔴 | No APM tool |
| Database purge jobs | 🔴 | No pg_cron configured |
| Dependency audit | 🔴 | No npm audit in pipeline |

---

## 10. Admin & Management

| Feature | Status | Notes |
|---------|--------|-------|
| Admin dashboard | 🔴 | Not implemented |
| User list / management | 🔴 | Not implemented |
| User plan override | 🔴 | Must edit DB directly |
| Usage analytics (operator) | 🔴 | Not implemented |
| Content moderation | 🔴 | Not implemented |
| Conversation review | 🔴 | Not implemented |
| API key management | 🔴 | Not implemented |
| System health dashboard | 🔴 | Not implemented |
| Concept backfill utility | 🧪 | /dev/backfill route only |
| Concept graph viewer | 🧪 | /dev/graph/[docId] only |
| Plan management UI | 🔴 | Not implemented |
| Bulk user operations | 🔴 | Not implemented |

---

## 11. Overall Completion Summary

### By Category

| Category | Complete | Partial | Missing | Total Items | % Done |
|----------|---------|---------|---------|------------|--------|
| Core Learning | 29 | 7 | 11 | 47 | 62% |
| AI & Intelligence | 18 | 1 | 3 | 22 | 82% |
| Progress & Analytics | 21 | 2 | 5 | 28 | 75% |
| User System & Auth | 8 | 2 | 7 | 17 | 47% |
| UI & Design System | 16 | 5 | 8 | 29 | 55% |
| Backend Infrastructure | 8 | 4 | 7 | 19 | 42% |
| Database & Data Layer | 12 | 1 | 12 | 25 | 48% |
| Payments | 5 | 1 | 8 | 14 | 36% |
| DevOps & Operations | 4 | 3 | 8 | 15 | 27% |
| Admin & Management | 0 | 0 | 12 | 12 | 0% |

### Weighted Overall Completion

| Layer | Weight | Score | Weighted |
|-------|--------|-------|---------|
| Core AI Q&A | 20% | 90% | 18% |
| Frontend (pages + components) | 15% | 85% | 12.75% |
| Backend (API routes) | 15% | 70% | 10.5% |
| Database (schema + migrations) | 15% | 50% | 7.5% |
| Auth & User System | 10% | 65% | 6.5% |
| Progress & Analytics | 10% | 80% | 8% |
| Payments | 5% | 40% | 2% |
| DevOps & Ops | 5% | 25% | 1.25% |
| Admin | 5% | 0% | 0% |

**Total Weighted Score: ~66.5%**

### Production Blockers (Must Fix Before Launch)
1. 🔴 `/api/conversations` auth bypass — CRITICAL
2. 🔴 `/api/delete-pdf` no ownership check — CRITICAL
3. 🔴 13 missing database migrations — HIGH
4. 🔴 No error monitoring (Sentry) — HIGH
5. 🔴 Empty state for new user dashboard — HIGH
6. 🔴 PDF processing status indicator — HIGH
7. 🔴 No CI/CD pipeline — MEDIUM

### Investor Demo Readiness (Can Show, Should Mention)
| Flow | Demo Ready? |
|------|------------|
| PDF upload + Q&A | ✅ Yes |
| Streaming AI answer | ✅ Yes |
| Quiz generation + grading | ✅ Yes |
| Focus mode session | ✅ Yes |
| Progress analytics dashboard | ✅ Yes |
| Voice AI tutor | ✅ Yes |
| SRS flashcard review | ✅ Yes |
| Exam countdown | ✅ Yes |
| Realtime updates | ✅ Yes |
| Payment flow | 🟡 Need real keys |
| Admin dashboard | 🔴 Not available |
| Light mode | 🔴 Broken |
