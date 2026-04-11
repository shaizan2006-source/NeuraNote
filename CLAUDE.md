# CLAUDE.md — Ask My Notes

> These rules override all other instructions if conflict occurs.

---

## TOKEN OPTIMIZATION LAYER (HIGHEST PRIORITY)

You are an execution-focused AI dev assistant optimized for MINIMUM token usage.

BEHAVIOR RULES:

1. TASK-FIRST — treat every input as a task; combine steps internally; no follow-up questions unless blocked.
2. ZERO FLUFF — no greetings, no filler, no trailing summaries.
3. NO REPETITION — never restate the problem or user input.
4. CODE HANDLING — modify only required parts; do NOT rewrite full files unless asked.
5. TASK BATCHING — complete all implied steps in ONE response.
6. STRICT OUTPUT — default = shortest correct answer.
7. ERROR HANDLING — make reasonable assumptions; ask ONLY if absolutely necessary.

FINAL RULE: If a response can be shorter without harming understanding, it MUST be shorter.

---

## PROJECT OVERVIEW

**Ask My Notes** — AI study assistant SaaS for Indian students (JEE/NEET/University exams).

---

## TECH STACK

| Layer           | Technology                                        |
| --------------- | ------------------------------------------------- |
| Framework       | Next.js 16 App Router (`src/app/`)                |
| AI — Q&A        | OpenAI `gpt-4o-mini` (streaming + non-streaming)  |
| AI — OCR        | OpenAI `gpt-4o` (Responses API, native PDF input) |
| AI — Embeddings | `text-embedding-3-small` (1536-dim vectors)       |
| Database        | Supabase (Postgres + pgvector)                    |
| Auth            | Supabase Auth (JWT bearer tokens)                 |
| State           | React Context (`DashboardContext.jsx`)            |
| Styling         | Tailwind CSS                                      |

---

## KEY FILES

| File                               | Purpose                                      |
| ---------------------------------- | -------------------------------------------- |
| `src/app/api/ask/route.js`         | Streaming Q&A — main AI endpoint             |
| `src/app/api/ask-ai/route.js`      | Non-streaming Q&A                            |
| `src/app/api/process-pdf/route.js` | PDF upload → text extract → embed → store    |
| `src/app/api/streak/route.js`      | Study streak GET/POST                        |
| `src/app/api/progress/route.js`    | Daily progress GET/POST                      |
| `src/app/api/weak-topics/route.js` | Weak topic tracking + GPT-4o-mini extraction |
| `src/context/DashboardContext.jsx` | Central state + all data fetching            |
| `src/lib/planLimits.js`            | Free tier Q&A usage limits                   |
| `next.config.mjs`                  | `serverExternalPackages: ["pdf-parse"]`      |

---

## DATABASE SCHEMA

| Table                    | Key Columns                                             |
| ------------------------ | ------------------------------------------------------- |
| `documents`              | `id, user_id, name, subject, content`                   |
| `document_chunks`        | `id, document_id, content, embedding, page_number`      |
| `daily_progress`         | `id, user_id, date, questions`                          |
| `study_streaks`          | `id, user*id, streak*                                   |
| count, last_active_date` |
| `weak_topics`            | `id, user_id, topic, subject, count, level, updated_at` |
| `topic_attempts`         | `id, user_id, topic, subject, count, updated_at`        |
| `qa_usage`               | `id, user_id, date, count`                              |

**Supabase RPC functions:**

- `match_documents(query_embedding, match_count, doc_id)` — single doc vector search
- `match_documents_multi(query_embedding, match_count, doc_ids)` — multi-doc vector search

---

## AUTH PATTERN

```js
// Client-side (get token for API calls)
const {
  data: { session },
} = await supabase.auth.getSession();
const authHeader = { Authorization: `Bearer ${session?.access_token}` };

// Server-side (verify token) — always use SERVICE_ROLE_KEY
const supabase = createClient(
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
);
const {
  data: { user },
} = await supabase.auth.getUser(token);
```

---

## TRACKING PATTERN (fire-and-forget)

```js
Promise.all([
  fetch("/api/streak", { method: "POST", headers: authHeader }),
  fetch("/api/progress", { method: "POST", headers: authHeader }),
  fetch("/api/weak-topics", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader },
    body: JSON.stringify({ question, subject }),
  }),
])
  .then(() => {
    fetchStreak();
    fetchProgress();
    fetchWeakTopics();
  })
  .catch(console.error);
```

---

## WEAK TOPIC LOGIC

- `topic_attempts`: staging table, counts 1–2
- `weak_topics`: promoted at count ≥3 (level: "medium"), count ≥6 → level: "hard"
- Manual intent phrases (e.g. "I struggle with X") → direct upsert at count=3, level="hard"
- AI extraction: GPT-4o-mini → max 3 topics → normalized via SYNONYM_MAP

---

## CODE STYLE

- Modify only required parts — no full file rewrites unless asked
- No extra comments on unchanged lines
- No error handling for internal/impossible scenarios
- Server routes: always `SUPABASE_SERVICE_ROLE_KEY`
- Client context: anon key via `createBrowserClient()`
- Prefer direct Supabase calls over abstraction layers
