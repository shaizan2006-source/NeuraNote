# AskMyNotes — System Map

> **ACCESS CONTROL:** This file is for HUMAN reference only.
> Do NOT read or use this file unless explicitly instructed: *"Read system_map.md"*
> Only update when: a new feature is added, a major change is made, or the user explicitly asks.

---

## Project Overview

**AskMyNotes** is an AI-powered study companion targeting Indian competitive exam students (JEE, NEET, GATE, UPSC, CA).

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Database | Supabase (PostgreSQL + pgvector) |
| AI | OpenAI gpt-4o-mini, text-embedding-3-small |
| Styling | Tailwind CSS, Framer Motion |
| Payments | Razorpay |
| PDF / OCR | pdf-parse, Tesseract.js |
| Charts | Recharts |
| Deploy | Vercel |

---

## 📁 Folder: / (Root)

### package.json
- **Type:** Config
- **Purpose:** Defines project dependencies and scripts
- **Key Functionality:** Lists all npm packages; defines `dev`, `build`, `start` scripts
- **Related Features:** All features
- **Dependencies:** Node.js, npm

### jsconfig.json
- **Type:** Config
- **Purpose:** Path alias configuration
- **Key Functionality:** Maps `@/*` → `./src/*` for clean imports
- **Related Features:** All files
- **Dependencies:** —

### .env.local / .env.example
- **Type:** Config
- **Purpose:** Environment secrets and API keys
- **Key Functionality:** Holds `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- **Related Features:** Auth, AI, Payments, Database
- **Dependencies:** Supabase, OpenAI, Razorpay

### vercel.json
- **Type:** Config
- **Purpose:** Vercel deployment configuration
- **Key Functionality:** Route handling, build overrides for serverless deployment
- **Related Features:** Deployment
- **Dependencies:** Vercel

### playwright.config.js
- **Type:** Config
- **Purpose:** End-to-end testing configuration
- **Key Functionality:** Defines test browser targets and base URL
- **Related Features:** Testing
- **Dependencies:** Playwright

---

## 📁 Folder: /src/app

### layout.js
- **Type:** Frontend
- **Purpose:** Root HTML layout wrapping all pages
- **Key Functionality:** Injects global fonts, metadata, and providers into every page
- **Related Features:** All pages
- **Dependencies:** Next.js App Router, Tailwind CSS

### page.js
- **Type:** Frontend
- **Purpose:** Public landing page
- **Key Functionality:** Hero section, feature highlights, social proof, testimonials, pricing CTA, signup/login links
- **Related Features:** Marketing, Onboarding
- **Dependencies:** Next.js Link, Framer Motion

---

## 📁 Folder: /src/app/auth

### page.js (or route.js)
- **Type:** Backend / Auth callback
- **Purpose:** Handles Supabase OAuth and email confirmation redirects
- **Key Functionality:** Exchanges auth code for session; redirects user to dashboard
- **Related Features:** Auth
- **Dependencies:** Supabase server client

---

## 📁 Folder: /src/app/login

### page.js
- **Type:** Frontend
- **Purpose:** User login page
- **Key Functionality:** Email/password form, error display, rate-limit lockout UI, redirect to dashboard on success
- **Related Features:** Auth
- **Dependencies:** `lib/auth.js`, Supabase client, DashboardContext

---

## 📁 Folder: /src/app/signup

### page.js
- **Type:** Frontend
- **Purpose:** New user registration
- **Key Functionality:** Email/password form with strength indicator, validation, Supabase `signUp()`, redirect to onboarding
- **Related Features:** Auth, Onboarding
- **Dependencies:** `lib/auth.js`, Supabase client

---

## 📁 Folder: /src/app/forgot-password

### page.js
- **Type:** Frontend
- **Purpose:** Password reset request form
- **Key Functionality:** Sends password reset email via Supabase `resetPasswordForEmail()`
- **Related Features:** Auth
- **Dependencies:** Supabase client, `lib/auth.js`

---

## 📁 Folder: /src/app/reset-password

### page.js
- **Type:** Frontend
- **Purpose:** Set new password after reset link is clicked
- **Key Functionality:** Validates new password strength, calls Supabase `updateUser()`, redirects to login
- **Related Features:** Auth
- **Dependencies:** Supabase client, `lib/auth.js`

---

## 📁 Folder: /src/app/onboarding

### page.js
- **Type:** Frontend
- **Purpose:** First-time user setup flow
- **Key Functionality:** Collects exam type, target date, subjects; stores in Supabase user profile
- **Related Features:** Onboarding, Study Plan, Exam Tracking
- **Dependencies:** Supabase client, Next.js Router

---

## 📁 Folder: /src/app/pricing

### page.js
- **Type:** Frontend
- **Purpose:** Subscription plan selection page
- **Key Functionality:** Displays Free / Student (₹299) / Pro (₹599) / School (₹50,000) plan cards; triggers Razorpay payment flow
- **Related Features:** Payments, Subscription
- **Dependencies:** `/api/payments/create-order`, Razorpay JS SDK

---

## 📁 Folder: /src/app/dashboard

### page.js
- **Type:** Frontend
- **Purpose:** Main authenticated user dashboard
- **Key Functionality:** Tab-based layout (Study → Practice → Analyze); renders all feature sections; wraps in DashboardContext
- **Related Features:** All dashboard features
- **Dependencies:** `DashboardContext`, all dashboard components, Supabase auth

---

## 📁 Folder: /src/app/chat

### page.js
- **Type:** Frontend
- **Purpose:** Standalone AI chat interface
- **Key Functionality:** Full-page chat with AI coach; distinct from inline ask-AI
- **Related Features:** AI Coach
- **Dependencies:** `/api/chat/send`, `/api/chat/history`, Supabase auth

---

## 📁 Folder: /src/app/api/upload

### route.js
- **Type:** Backend / API
- **Purpose:** PDF ingestion pipeline
- **Key Functionality:** Receives PDF → saves to Supabase Storage → extracts text via `pdf-parse` → splits into 1000-char chunks (200-char overlap) via LangChain → generates embeddings (text-embedding-3-small) → stores chunks + embeddings in `document_chunks` table
- **Related Features:** PDF Upload, Ask AI (RAG)
- **Dependencies:** Supabase server, OpenAI, LangChain `RecursiveCharacterTextSplitter`, `pdf-parse`

---

## 📁 Folder: /src/app/api/ask

### route.js
- **Type:** Backend / API
- **Purpose:** Core Q&A endpoint with RAG + streaming
- **Key Functionality:** Embeds question → vector searches `document_chunks` → builds context prompt → streams GPT-4o-mini response → detects export intent → detects confusion and simplifies → returns answer + sources
- **Related Features:** Ask AI
- **Dependencies:** OpenAI, `lib/rag.js`, `lib/detectExportIntent.js`, Supabase server, plan limits check

---

## 📁 Folder: /src/app/api/chat

### send/route.js
- **Type:** Backend / API
- **Purpose:** Chat message handler for AI Coach
- **Key Functionality:** Accepts user message → builds conversation history → calls GPT-4o-mini → stores exchange in `chat_messages` → returns AI reply
- **Related Features:** AI Coach
- **Dependencies:** OpenAI, Supabase server, `lib/chat.js`

### history/route.js
- **Type:** Backend / API
- **Purpose:** Fetch past chat messages
- **Key Functionality:** Returns paginated chat history from `chat_messages` table for authenticated user
- **Related Features:** AI Coach
- **Dependencies:** Supabase server

---

## 📁 Folder: /src/app/api/documents

### route.js
- **Type:** Backend / API
- **Purpose:** List user's uploaded PDFs
- **Key Functionality:** Queries `documents` table filtered by user ID; returns document name, ID, URL, upload date
- **Related Features:** PDF Upload, Document Management
- **Dependencies:** Supabase server

---

## 📁 Folder: /src/app/api/delete-pdf

### route.js
- **Type:** Backend / API
- **Purpose:** Remove a PDF and its data
- **Key Functionality:** Deletes file from Supabase Storage + removes rows from `documents` and `document_chunks` tables
- **Related Features:** Document Management
- **Dependencies:** Supabase server

---

## 📁 Folder: /src/app/api/get-pdfs

### route.js
- **Type:** Backend / API
- **Purpose:** Fetch saved PDF list (alternate to /documents)
- **Key Functionality:** Returns list of user's saved/linked PDFs
- **Related Features:** Document Management
- **Dependencies:** Supabase server

---

## 📁 Folder: /src/app/api/generate-quiz

### route.js
- **Type:** Backend / API
- **Purpose:** AI-generated MCQ quiz from weak topics
- **Key Functionality:** Fetches top 5 weak topics → retrieves relevant document chunks → prompts GPT-4o-mini for 5 MCQs in strict JSON → stores quiz in `quizzes` table → returns question array
- **Related Features:** Quiz, Weak Topics, Mastery
- **Dependencies:** OpenAI, Supabase server, `lib/planLimits.js`

---

## 📁 Folder: /src/app/api/exam

### route.js
- **Type:** Backend / API
- **Purpose:** Exam CRUD and countdown tracking
- **Key Functionality:** GET: fetch all exams, auto-mark expired as completed; POST: create exam with name + date; PATCH: manually update status
- **Related Features:** Exam Tracking, Study Plan
- **Dependencies:** Supabase server

---

## 📁 Folder: /src/app/api/daily-plan

### route.js
- **Type:** Backend / API
- **Purpose:** Generate today's personalized study plan
- **Key Functionality:** Fetches user memory, exam urgency, progress score, streak, SRS due topics, inactivity window → applies priority logic (weak topics > exam urgency > interests > progress > spaced repetition > inactivity warning) → returns ordered action list
- **Related Features:** Study Plan, Adaptive Learning
- **Dependencies:** Supabase server, `lib/adaptivePlanner.js`, `lib/memory.js`

---

## 📁 Folder: /src/app/api/study-plan/adaptive

### route.js
- **Type:** Backend / API
- **Purpose:** Fetch priority-ranked topic list for adaptive planner
- **Key Functionality:** Calls `getAdaptivePlan()` → returns top 5 topics sorted by priority score
- **Related Features:** Study Plan, Adaptive Learning
- **Dependencies:** `lib/adaptivePlanner.js`, Supabase server

---

## 📁 Folder: /src/app/api/progress

### route.js
- **Type:** Backend / API
- **Purpose:** Track daily Q&A activity score
- **Key Functionality:** POST: increment today's question count; GET: return today's count + score (questions × 10, max 100)
- **Related Features:** Progress Tracking, Analytics
- **Dependencies:** Supabase server

---

## 📁 Folder: /src/app/api/streak

### route.js
- **Type:** Backend / API
- **Purpose:** Manage study streak counter
- **Key Functionality:** On activity: check last_active_date → if yesterday → increment streak; else → reset to 1; GET returns current streak and 7-day history
- **Related Features:** Streak, Gamification
- **Dependencies:** Supabase server (`study_streaks` table)

---

## 📁 Folder: /src/app/api/weak-topics

### route.js
- **Type:** Backend / API
- **Purpose:** Detect and track topics the user struggles with
- **Key Functionality:** POST: extract topic via manual intent → AI extraction → stopword fallback → synonym normalization → increment `topic_attempts`; at count ≥ 3, promote to `weak_topics`; GET: return user's weak topic list
- **Related Features:** Weak Topics, Quiz, Study Plan
- **Dependencies:** OpenAI, Supabase server

---

## 📁 Folder: /src/app/api/mastery

### get/route.js
- **Type:** Backend / API
- **Purpose:** Retrieve mastery scores per topic
- **Key Functionality:** Queries `mastery_topics` table; returns topic + mastery % for authenticated user
- **Related Features:** Brain Map, Mastery Tracking
- **Dependencies:** Supabase server

### update/route.js
- **Type:** Backend / API
- **Purpose:** Recalculate and save mastery after quiz
- **Key Functionality:** Calls `updateMastery(userId, topic, quizScore, srsLevel)` → saves to `mastery_topics`
- **Related Features:** Mastery, Quiz
- **Dependencies:** `lib/mastery.js`, Supabase server

---

## 📁 Folder: /src/app/api/focus-progress

### route.js
- **Type:** Backend / API
- **Purpose:** Track completed tasks in Focus Mode
- **Key Functionality:** POST: record completed task (difficulty, task_index); GET: return all completed tasks for user
- **Related Features:** Focus Mode
- **Dependencies:** Supabase server (`focus_progress` table)

---

## 📁 Folder: /src/app/api/ai-coach

### route.js
- **Type:** Backend / API
- **Purpose:** Dedicated AI coach chat endpoint
- **Key Functionality:** Builds coaching system prompt → calls GPT-4o-mini → returns study advice, motivation, topic explanations
- **Related Features:** AI Coach
- **Dependencies:** OpenAI, Supabase server

---

## 📁 Folder: /src/app/api/voice

### start/route.js
- **Type:** Backend / API
- **Purpose:** Initialize a voice tutoring session
- **Key Functionality:** Auth check → `canStartCall()` rate-limit check → creates session in `voice_calls` → returns callId + plan limits
- **Related Features:** Voice AI Tutor
- **Dependencies:** `lib/voiceLimits.js`, Supabase server

### end/route.js
- **Type:** Backend / API
- **Purpose:** Close a voice session
- **Key Functionality:** Updates `voice_calls` row with ended_at, duration, message count
- **Related Features:** Voice AI Tutor
- **Dependencies:** Supabase server

### respond/route.js
- **Type:** Backend / API
- **Purpose:** Generate AI voice reply
- **Key Functionality:** Feynman-style system prompt (simple → intuition → depth); target 30–60s responses; no markdown; multi-language; detect `[END_CALL]` to terminate session
- **Related Features:** Voice AI Tutor
- **Dependencies:** OpenAI

### speak/route.js
- **Type:** Backend / API
- **Purpose:** Text-to-speech conversion
- **Key Functionality:** Converts AI text response to audio (OpenAI TTS or Web Speech API)
- **Related Features:** Voice AI Tutor
- **Dependencies:** OpenAI TTS / Web Speech API

### transcribe/route.js
- **Type:** Backend / API
- **Purpose:** Speech-to-text transcription
- **Key Functionality:** Transcribes user audio input (Whisper API or built-in browser STT)
- **Related Features:** Voice AI Tutor
- **Dependencies:** OpenAI Whisper

---

## 📁 Folder: /src/app/api/payments

### create-order/route.js
- **Type:** Backend / API
- **Purpose:** Create Razorpay payment order
- **Key Functionality:** Receives plan selection → calculates amount in paise → creates Razorpay order → returns order ID and metadata
- **Related Features:** Payments, Subscription
- **Dependencies:** Razorpay SDK

### verify/route.js
- **Type:** Backend / API
- **Purpose:** Verify payment and activate subscription
- **Key Functionality:** Validates `HMAC-SHA256(orderId|paymentId, secret)` → on success, upserts `user_plans` with plan + `expires_at` (today + 30 days)
- **Related Features:** Payments, Subscription
- **Dependencies:** Razorpay, Supabase server, Node.js `crypto`

### webhook/route.js
- **Type:** Backend / API
- **Purpose:** Handle Razorpay webhook events
- **Key Functionality:** Verifies webhook signature → handles `payment.captured` / `payment.failed` events → updates plan status
- **Related Features:** Payments, Subscription
- **Dependencies:** Razorpay, Supabase server

---

## 📁 Folder: /src/app/api/generate-document

### route.js
- **Type:** Backend / API
- **Purpose:** Export AI answer as PDF or DOCX
- **Key Functionality:** Receives answer text → generates PDF (`@react-pdf/renderer`) or DOCX (`docx` library) → returns file download URL
- **Related Features:** Ask AI, PDF Export
- **Dependencies:** `@react-pdf/renderer`, `docx`, Supabase Storage

---

## 📁 Folder: /src/app/api/activity

### route.js
- **Type:** Backend / API
- **Purpose:** Log user activity events
- **Key Functionality:** Records activity type + timestamp; used for inactivity detection in daily plan
- **Related Features:** Study Plan, Streak
- **Dependencies:** Supabase server

---

## 📁 Folder: /src/app/api/memory

### weak-topic/route.js
- **Type:** Backend / API
- **Purpose:** Persist user memory about weak topics and interests
- **Key Functionality:** POST: store topic to memory; GET: retrieve stored memory; used to personalize daily plan
- **Related Features:** Memory, Study Plan
- **Dependencies:** `lib/memory.js`, Supabase server

---

## 📁 Folder: /src/app/api/syllabus

### route.js
- **Type:** Backend / API
- **Purpose:** Fetch curriculum/syllabus topics
- **Key Functionality:** Returns predefined topic list for user's exam type; used in planner and quiz generation
- **Related Features:** Study Plan, Quiz
- **Dependencies:** Supabase server

---

## 📁 Folder: /src/components/dashboard

### AskAISection.jsx
- **Type:** Frontend
- **Purpose:** Main Q&A interface
- **Key Functionality:** Question input → streaming answer display → source chips → export button → confusion detection → follow-up suggestions
- **Related Features:** Ask AI
- **Dependencies:** DashboardContext, `/api/ask`, `/api/generate-document`

### UploadSection.jsx
- **Type:** Frontend
- **Purpose:** PDF upload interface
- **Key Functionality:** Drag-and-drop zone → upload progress bar → document list → delete button → PDF selector for Q&A context
- **Related Features:** PDF Upload
- **Dependencies:** DashboardContext, `/api/upload`, `/api/documents`, `/api/delete-pdf`

### QuizSection.jsx
- **Type:** Frontend
- **Purpose:** Quiz generation and taking interface
- **Key Functionality:** "Generate Quiz" button → renders 5 MCQs → tracks user answers → shows score + explanations on submit
- **Related Features:** Quiz, Weak Topics, Mastery
- **Dependencies:** DashboardContext, `/api/generate-quiz`, `/api/mastery/update`

### BrainSection.jsx
- **Type:** Frontend
- **Purpose:** Visual mastery map ("Brain Map")
- **Key Functionality:** Displays top 3 topics with animated mastery bars; color-coded: Red (<40%) / Orange (40–70%) / Green (70%+); click topic to open Ask AI
- **Related Features:** Mastery, Brain Map
- **Dependencies:** DashboardContext, `/api/mastery/get`, Framer Motion

### StudyPlanSection.jsx
- **Type:** Frontend
- **Purpose:** Display daily adaptive study plan
- **Key Functionality:** Renders task list from `/api/daily-plan`; shows priority labels, exam countdown, SRS due items
- **Related Features:** Study Plan, Adaptive Learning
- **Dependencies:** DashboardContext, `/api/daily-plan`

### AnalyticsSection.jsx
- **Type:** Frontend
- **Purpose:** Progress analytics and charts
- **Key Functionality:** Bar/line charts for daily activity, mastery progress, streak history, weak topic counts
- **Related Features:** Analytics, Progress Tracking
- **Dependencies:** DashboardContext, Recharts, `/api/progress`, `/api/streak`

### AICoachSection.jsx
- **Type:** Frontend
- **Purpose:** In-dashboard AI coaching chat
- **Key Functionality:** Chat interface with study coach; supports advice, topic explanation, motivation
- **Related Features:** AI Coach
- **Dependencies:** DashboardContext, `/api/ai-coach`

### ExamSection.jsx
- **Type:** Frontend
- **Purpose:** Exam countdown and management
- **Key Functionality:** Add exam (name + date) → live countdown → split into Active / History; auto-expire past exams
- **Related Features:** Exam Tracking
- **Dependencies:** DashboardContext, `/api/exam`

### FocusModeSection.jsx
- **Type:** Frontend
- **Purpose:** Focused study timer and task list
- **Key Functionality:** Pomodoro-style focus timer; task checklist with difficulty levels; tracks completions via API
- **Related Features:** Focus Mode
- **Dependencies:** DashboardContext, `/api/focus-progress`

### VoiceCallSection.jsx
- **Type:** Frontend
- **Purpose:** Voice AI tutor interface
- **Key Functionality:** Start/end call button → mic access → speech-to-text → display AI transcript → text-to-speech playback → message history
- **Related Features:** Voice AI Tutor
- **Dependencies:** DashboardContext, `/api/voice/*`, Web Audio API

### WeeklyRecapCard.jsx
- **Type:** Frontend
- **Purpose:** Weekly study summary widget
- **Key Functionality:** Displays questions asked, quizzes taken, streak, top topic of the week
- **Related Features:** Analytics, Gamification
- **Dependencies:** DashboardContext

### AISuggestionCard.jsx
- **Type:** Frontend
- **Purpose:** AI-generated improvement suggestions
- **Key Functionality:** Surfaces actionable tips based on weak topics, low mastery, or inactivity
- **Related Features:** Study Plan, AI Coach
- **Dependencies:** DashboardContext

### MilestoneToast.jsx
- **Type:** Frontend
- **Purpose:** Celebration notifications for achievements
- **Key Functionality:** Triggers pop-up toast for: first quiz completed, 10-day streak, first voice call, mastery milestone
- **Related Features:** Gamification
- **Dependencies:** DashboardContext, Framer Motion

### DashboardSidebar.jsx
- **Type:** Frontend
- **Purpose:** Left sidebar navigation
- **Key Functionality:** User avatar, plan badge, nav links (Study / Practice / Analyze), exam countdown, logout
- **Related Features:** Navigation, Auth
- **Dependencies:** DashboardContext, Supabase client

---

## 📁 Folder: /src/components/layout

### AppLayout.jsx
- **Type:** Frontend
- **Purpose:** Authenticated page wrapper
- **Key Functionality:** Applies consistent padding/structure to all app pages; handles auth redirect guard
- **Related Features:** All pages
- **Dependencies:** Next.js Router, Supabase client

### RightPanel.jsx
- **Type:** Frontend
- **Purpose:** Right sidebar container
- **Key Functionality:** Hosts secondary widgets (suggestions, recap, exam countdown overflow)
- **Related Features:** Dashboard
- **Dependencies:** DashboardContext

### Sidebar.jsx
- **Type:** Frontend
- **Purpose:** Shared sidebar wrapper
- **Key Functionality:** Renders navigation items based on active tab state
- **Related Features:** Navigation
- **Dependencies:** DashboardContext

---

## 📁 Folder: /src/components/ui

### ErrorBoundary.jsx
- **Type:** Frontend / Utility
- **Purpose:** React error boundary for graceful failure
- **Key Functionality:** Catches component-level errors; renders fallback UI instead of crashing the page
- **Related Features:** All dashboard components
- **Dependencies:** React `Component` class

---

## 📁 Folder: /src/context

### DashboardContext.jsx
- **Type:** Frontend / State Management
- **Purpose:** Global state store for the entire dashboard
- **Key Functionality:** Manages: documents, Q&A, upload, auth, exams, progress, streak, quiz, study plans, mastery, voice call state, active tab; exposes handlers: `fetchDocuments()`, `handleAsk()`, `handleInputChange()`, etc.; contains subject normalization map for 10+ CS subjects
- **Related Features:** All dashboard features
- **Dependencies:** All dashboard API routes, Supabase client, React Context API

---

## 📁 Folder: /src/lib

### supabase.js
- **Type:** Utility / Backend
- **Purpose:** Supabase browser client
- **Key Functionality:** Creates anonymous-key Supabase client for browser-side auth and queries
- **Related Features:** Auth, all client-side DB calls
- **Dependencies:** `@supabase/supabase-js`, `NEXT_PUBLIC_SUPABASE_*` env vars

### supabaseServer.js
- **Type:** Utility / Backend
- **Purpose:** Supabase server client (secure)
- **Key Functionality:** Creates service-role-key client for API routes; never exposed to the browser
- **Related Features:** All API routes
- **Dependencies:** `@supabase/supabase-js`, `SUPABASE_SERVICE_ROLE_KEY`

### auth.js
- **Type:** Utility
- **Purpose:** Auth validation and rate limiting
- **Key Functionality:** `validateEmail()` — regex check; `validatePassword()` — 8+ chars, upper, lower, number; `getPasswordStrength()` — 0-5 score; `checkRateLimit()` / `recordFailedAttempt()` — 5 attempts → 30s lockout; `safeAuthError()` — strips internal details
- **Related Features:** Login, Signup, Password Reset
- **Dependencies:** Browser `localStorage` for rate-limit state

### rag.js
- **Type:** Utility / AI
- **Purpose:** Retrieval-Augmented Generation core
- **Key Functionality:** `getRelevantChunks(query, documentId)` → embeds query → calls Supabase `match_documents` RPC → returns top 5 chunks with similarity scores as formatted context string
- **Related Features:** Ask AI
- **Dependencies:** OpenAI embeddings, Supabase server (`document_chunks` + pgvector)

### chat.js
- **Type:** Utility / AI
- **Purpose:** Chat message orchestration
- **Key Functionality:** `handleChat(messages, userId)` → fetches RAG context → builds system prompt → calls GPT-4o-mini → returns response
- **Related Features:** AI Coach, Ask AI
- **Dependencies:** OpenAI, `lib/rag.js`

### mastery.js
- **Type:** Utility
- **Purpose:** Mastery score calculation
- **Key Functionality:** `updateMastery(userId, topic, quizScore, srsLevel)` → formula: `Final = (srsLevel/5 * 100 * 0.4) + (quizScore * 0.6)` → upserts `mastery_topics` table
- **Related Features:** Mastery, Quiz, Brain Map
- **Dependencies:** Supabase server

### adaptivePlanner.js
- **Type:** Utility / AI Logic
- **Purpose:** Priority-based study topic ranking
- **Key Functionality:** `getAdaptivePlan(userId)` → fetches mastery, SRS, and weak topic data → calculates priority: `(100 - mastery) * 0.5 + (isDue ? 30 : 0) + weakWeight * 20` → returns top 5 sorted topics
- **Related Features:** Study Plan, Adaptive Learning
- **Dependencies:** Supabase server, `mastery_topics`, `revision_topics`, `weak_topics` tables

### planLimits.js
- **Type:** Utility / Business Logic
- **Purpose:** Subscription tier enforcement
- **Key Functionality:** Defines plan caps: Free (1 PDF, 20 Q&A/day), Student (10 PDFs, unlimited), Pro (unlimited), School (unlimited); exports `canUploadPDF()`, `canAskQuestion()`, `getUserPlan()`, `recordQAUsage()`
- **Related Features:** All gated features, Payments
- **Dependencies:** Supabase server (`user_plans` table)

### voiceLimits.js
- **Type:** Utility / Business Logic
- **Purpose:** Voice call rate limiting per plan
- **Key Functionality:** Caps: Free (2/day, 10 min), Student (5/day, 20 min), Pro (15/day, 40 min), School (unlimited, 60 min); exports `canStartCall()`, `startCallSession()`, `endCallSession()`, `countTodayCalls()`
- **Related Features:** Voice AI Tutor
- **Dependencies:** Supabase server (`voice_calls` table)

### memory.js
- **Type:** Utility / AI
- **Purpose:** Long-term user memory storage
- **Key Functionality:** `addMemory(userId, type, content)` — store; `getMemory(userId)` — retrieve; `boostMemory(userId, topic)` — reinforce; used to personalize daily plan and suggestions
- **Related Features:** Study Plan, Daily Plan, AI Coach
- **Dependencies:** Supabase server (`user_memory` table)

### detectExportIntent.js
- **Type:** Utility
- **Purpose:** Detect if user wants to export an answer
- **Key Functionality:** Pattern-matches answer + user query for keywords: "pdf", "export", "download", "word", "docx" → returns `{ export: true, format: 'pdf'|'docx' }`
- **Related Features:** Ask AI, PDF Export
- **Dependencies:** —

### detectTopic.js
- **Type:** Utility
- **Purpose:** Simple topic classification from text
- **Key Functionality:** Extracts likely subject domain from user question using keyword mapping
- **Related Features:** Weak Topics, Study Plan
- **Dependencies:** —

### chunkText.js
- **Type:** Utility
- **Purpose:** Basic text splitting
- **Key Functionality:** Splits long text into fixed-size chunks (fallback for LangChain splitter)
- **Related Features:** PDF Upload
- **Dependencies:** —

### askWithDownload.js
- **Type:** Utility
- **Purpose:** Combined Q&A + export flow
- **Key Functionality:** Runs full answer generation then triggers download without streaming; used when export intent is detected upfront
- **Related Features:** Ask AI, PDF Export
- **Dependencies:** OpenAI, `/api/generate-document`

### tokens.js
- **Type:** Utility / Design
- **Purpose:** Design system tokens
- **Key Functionality:** Exports `colors`, `radius`, `space`, `typography`, `motion`, `shadow`, `gradient` constants for consistent UI styling
- **Related Features:** All UI components
- **Dependencies:** —

---

## Database Tables (Supabase)

| Table | Purpose |
|---|---|
| `users` | User profiles, plan, onboarding data |
| `user_plans` | Active subscription (plan, expires_at) |
| `documents` | Uploaded PDF metadata |
| `document_chunks` | Text chunks + pgvector embeddings |
| `quizzes` | Generated MCQs |
| `chat_messages` | AI Coach conversation history |
| `weak_topics` | Confirmed weak topics (count ≥ 3) |
| `topic_attempts` | Weak topic candidate tracking |
| `mastery_topics` | Mastery score per topic |
| `revision_topics` | SRS schedule (next_review, level) |
| `study_streaks` | Daily streak counter + last_active_date |
| `voice_calls` | Voice session logs (duration, messages) |
| `user_memory` | Long-term memory (weak topics, interests) |
| `user_activity` | Activity event log (for inactivity detection) |
| `focus_progress` | Completed focus mode tasks |
| `exams` | User exams (name, date, status) |

---

## Key Data Flows

### PDF → Q&A
```
Upload PDF → Extract text → Chunk (1000 chars, 200 overlap)
→ Embed each chunk (text-embedding-3-small) → Store in document_chunks
→ User asks question → Embed question → pgvector similarity search
→ Top 5 chunks as context → GPT-4o-mini stream → Answer + sources
```

### Quiz → Mastery
```
Weak topic identified → count ≥ 3 → promoted to weak_topics
→ Generate 5 MCQs from weak topics + document context
→ User answers → score calculated
→ Mastery = (srsLevel/5 * 100 * 0.4) + (quizScore * 0.6)
→ Saved to mastery_topics → displayed in Brain Map
```

### Daily Plan Priority
```
1. Weak topics (highest priority)
2. Exam urgency (days until exam)
3. Interest topics (user memory)
4. Progress level (low → basics, high → harder)
5. SRS due topics (next_review ≤ today)
6. Inactivity (2+ days → light revision, 5+ days → restart basics)
```

### Payment → Subscription
```
Select plan → Create Razorpay order → User pays
→ Verify HMAC-SHA256 signature
→ Upsert user_plans (plan + expires_at = today + 30 days)
→ All gated API routes re-check getUserPlan() on each request
```

---

## 🔄 Recent Changes

| Date | Change |
|---|---|
| 2026-04-02 | Initial system_map.md created — full codebase scan documented |
