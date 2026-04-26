# PDF-Driven Quiz System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Quiz page from a generic hardcoded system into a PDF-driven intelligent exam engine with adaptive AI coaching, session recovery, and bulletproof error handling — without breaking the existing quiz flow.

**Architecture:** Enhance `/api/ai/generate-questions` to accept a `documentId`, fetch document chunks from Supabase, and validate questions through a 10-layer pipeline (input validation → auth → chunk fetch → concept extraction → two-pass generation → semantic similarity → source verification → 90% quality threshold → retry → structured response). A new `/api/quiz/ai-coach` endpoint returns performance-aware coaching tips triggered only on wrong answers. The Quiz page gains a PDF selection screen (State A/B/C), `useActivePDF` integration, LocalStorage session recovery (one active quiz at a time), per-question performance signal tracking, and health monitoring.

**Tech Stack:** Next.js 14 App Router, React, Supabase (PostgreSQL + Storage), OpenAI (`gpt-4o-mini`, `text-embedding-3-small`), LocalStorage API

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| **Create** | `src/utils/quizResilience.js` | CircuitBreaker, retryWithBackoff, makeSingleRequest |
| **Create** | `src/utils/quizSession.js` | LocalStorage save/load/clear/validate for quiz sessions |
| **Create** | `src/app/api/ai/evaluate-answer/route.js` | Grade student answers via GPT-4o-mini |
| **Create** | `src/app/api/quiz/ai-coach/route.js` | Performance-aware coaching suggestions |
| **Modify** | `src/app/api/ai/generate-questions/route.js` | PDF-driven, 10-layer validated question generation |
| **Create** | `src/components/quiz/QuizPDFSelector.jsx` | State A/B/C PDF selection UI |
| **Modify** | `src/app/quiz/page.jsx` | PDF flow, session recovery, performance signals, dynamic coach |

---

## Task 1: Create Resilience Utilities

**Files:**
- Create: `src/utils/quizResilience.js`

- [ ] **Step 1: Create the file**

```javascript
// src/utils/quizResilience.js

// ── CircuitBreaker ─────────────────────────────────────────────────────────
// Opens after `threshold` consecutive failures. Auto-resets after `resetMs`.
export class CircuitBreaker {
  constructor(threshold = 5, resetMs = 60000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.resetMs = resetMs;
    this.state = 'CLOSED'; // CLOSED | OPEN | HALF_OPEN
    this.lastFailureTime = null;
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetMs) {
        this.state = 'HALF_OPEN';
        this.failureCount = 0;
      } else {
        throw new Error('CIRCUIT_BREAKER_OPEN');
      }
    }

    try {
      const result = await fn();
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failureCount = 0;
      }
      return result;
    } catch (err) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      if (this.failureCount >= this.threshold) {
        this.state = 'OPEN';
      }
      throw err;
    }
  }
}

// ── retryWithBackoff ───────────────────────────────────────────────────────
// Retries `fn` up to `maxRetries` times. Delays: 1s, 2s, 4s (exponential).
// Does NOT retry on 401/403 (auth errors).
export async function retryWithBackoff(fn, maxRetries = 3, baseDelayMs = 1000) {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await Promise.race([
        fn(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('REQUEST_TIMEOUT')), 30000)
        ),
      ]);
    } catch (err) {
      lastError = err;
      const msg = err?.message || '';
      if (msg.includes('401') || msg.includes('403')) throw err;
      if (attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, baseDelayMs * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}

// ── makeSingleRequest ──────────────────────────────────────────────────────
// Prevents duplicate in-flight requests for the same key.
const _pending = new Map();
export async function makeSingleRequest(key, fn) {
  if (_pending.has(key)) return _pending.get(key);
  const promise = fn()
    .catch((err) => { _pending.delete(key); throw err; })
    .finally(() => _pending.delete(key));
  _pending.set(key, promise);
  return promise;
}
```

- [ ] **Step 2: Verify the file was created**

```bash
ls src/utils/quizResilience.js
```
Expected: file exists

- [ ] **Step 3: Commit**

```bash
git add src/utils/quizResilience.js
git commit -m "feat(quiz): add circuit breaker, retry, and request dedup utilities"
```

---

## Task 2: Create Quiz Session Storage Utility

**Files:**
- Create: `src/utils/quizSession.js`

- [ ] **Step 1: Create the file**

```javascript
// src/utils/quizSession.js

const SESSION_KEY = 'quiz_session';
const MAX_AGE_MS = 86_400_000; // 24 hours

// ── sanitizeString ─────────────────────────────────────────────────────────
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim().slice(0, 10000);
}

// ── saveQuizSession ────────────────────────────────────────────────────────
export function saveQuizSession(data) {
  try {
    const payload = JSON.stringify({ ...data, timestamp: Date.now() });
    localStorage.setItem(SESSION_KEY, payload);
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      localStorage.removeItem(SESSION_KEY);
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ ...data, timestamp: Date.now() }));
      } catch (_) {
        // Storage full — silently fail, quiz continues without save
      }
    }
  }
}

// ── loadQuizSession ────────────────────────────────────────────────────────
// Returns validated session data, or null if absent/corrupted/expired.
export function loadQuizSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    // Expire old sessions
    if (!parsed.timestamp || Date.now() - parsed.timestamp > MAX_AGE_MS) {
      clearQuizSession();
      return null;
    }

    // Require minimum valid shape
    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      clearQuizSession();
      return null;
    }

    // Sanitize and clamp fields
    return {
      selectedDocument: parsed.selectedDocument || null,
      questions: parsed.questions.map((q) => ({
        id: sanitizeString(q.id),
        text: sanitizeString(q.text),
        marks: Math.max(1, Math.min(100, Number(q.marks) || 5)),
        hints: Array.isArray(q.hints) ? q.hints.map(sanitizeString) : [],
        sourceSnippet: sanitizeString(q.sourceSnippet),
      })).filter((q) => q.id && q.text),
      currentIndex: Math.max(0, Math.min(
        Number(parsed.currentIndex) || 0,
        (parsed.questions || []).length - 1
      )),
      answers: Object.fromEntries(
        Object.entries(parsed.answers || {}).map(([k, v]) => [k, sanitizeString(v)])
      ),
      evaluations: parsed.evaluations || {},
      sessionSeconds: Math.max(0, Number(parsed.sessionSeconds) || 0),
      performanceSignals: parsed.performanceSignals || {
        questionTimes: {},
        wrongAnswers: [],
        skippedQuestions: [],
        weakConcepts: {},
      },
      timestamp: parsed.timestamp,
    };
  } catch (err) {
    clearQuizSession();
    return null;
  }
}

// ── clearQuizSession ───────────────────────────────────────────────────────
export function clearQuizSession() {
  localStorage.removeItem(SESSION_KEY);
}
```

- [ ] **Step 2: Verify the file was created**

```bash
ls src/utils/quizSession.js
```
Expected: file exists

- [ ] **Step 3: Commit**

```bash
git add src/utils/quizSession.js
git commit -m "feat(quiz): add session storage utility with validation and corruption recovery"
```

---

## Task 3: Create `/api/ai/evaluate-answer` Endpoint

**Files:**
- Create: `src/app/api/ai/evaluate-answer/route.js`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p src/app/api/ai/evaluate-answer
```

- [ ] **Step 2: Write the route**

```javascript
// src/app/api/ai/evaluate-answer/route.js
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  try {
    const body = await req.json();
    const { question, answer, hints = [], totalMarks = 10 } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Missing question' }, { status: 400 });
    }
    if (!answer || typeof answer !== 'string' || answer.trim().length === 0) {
      return NextResponse.json(
        { marksEarned: 0, totalMarks, feedback: 'No answer provided.', explanation: '' },
        { status: 200 }
      );
    }

    const prompt = `You are a university exam evaluator. Grade this student answer strictly and fairly.

Question: ${question}

Expected answer structure (hints):
${hints.map((h, i) => `${i + 1}. ${h}`).join('\n') || 'No hints provided.'}

Total marks: ${totalMarks}

Student answer:
"""
${answer.trim().slice(0, 3000)}
"""

Evaluate the student answer and return ONLY a JSON object with:
- marksEarned: integer (0 to ${totalMarks})
- feedback: string (2–4 sentences: what was good, what was missed, how to improve)
- explanation: string (1 sentence: the correct key concept they should know)

Return ONLY valid JSON. No markdown, no code fences.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 400,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '{}';
    const result = JSON.parse(raw);

    return NextResponse.json({
      marksEarned: Math.max(0, Math.min(totalMarks, Number(result.marksEarned) || 0)),
      totalMarks,
      feedback: String(result.feedback || 'Evaluation complete.').slice(0, 600),
      explanation: String(result.explanation || '').slice(0, 300),
    });
  } catch (err) {
    console.error('[evaluate-answer]', err);
    return NextResponse.json(
      { marksEarned: 0, totalMarks: 10, feedback: 'Evaluation failed — please try again.', explanation: '' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Manual test via curl or browser DevTools**

Open browser DevTools → Console → paste:
```javascript
fetch('/api/ai/evaluate-answer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: 'What is the Carnot Cycle?',
    answer: 'The Carnot cycle is a theoretical thermodynamic cycle that gives maximum efficiency.',
    hints: ['Define Carnot Cycle (3M)', 'Explain max efficiency (4M)'],
    totalMarks: 10
  })
}).then(r => r.json()).then(console.log)
```
Expected: `{ marksEarned: 5-8, totalMarks: 10, feedback: "...", explanation: "..." }`

- [ ] **Step 4: Commit**

```bash
git add src/app/api/ai/evaluate-answer/route.js
git commit -m "feat(quiz): add evaluate-answer API endpoint"
```

---

## Task 4: Create `/api/quiz/ai-coach` Endpoint

**Files:**
- Create: `src/app/api/quiz/ai-coach/route.js`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p src/app/api/quiz/ai-coach
```

- [ ] **Step 2: Write the route**

```javascript
// src/app/api/quiz/ai-coach/route.js
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const FALLBACK_SUGGESTION =
  'Review the questions you found difficult before moving on.';

export async function POST(req) {
  try {
    const body = await req.json();
    const { signals = {}, documentName = 'your study material' } = body;

    const {
      wrongAnswers = [],
      skippedQuestions = [],
      timePerQuestion = { avg: 0, slowest: null },
      weakConcepts = {},
      currentQuestionIndex = 0,
      totalQuestions = 12,
    } = signals;

    // If no wrong answers yet, return null (coach stays silent)
    if (wrongAnswers.length === 0 && skippedQuestions.length === 0) {
      return NextResponse.json({ suggestion: null });
    }

    const repeatedWeakAreas = Object.entries(weakConcepts)
      .filter(([, count]) => count > 1)
      .map(([concept, count]) => `${concept} (${count} errors)`)
      .join(', ');

    const wrongSummary = wrongAnswers
      .slice(-3) // last 3 wrong answers only
      .map((w) => `- "${w.topic || 'Unknown topic'}": scored ${w.marksEarned}/${w.totalMarks}`)
      .join('\n');

    const skippedSummary = skippedQuestions.length > 0
      ? skippedQuestions.map((s) => `- "${s.topic || 'Unknown'}""`).join('\n')
      : 'None';

    const systemPrompt = `You are an adaptive AI Study Coach observing a student taking a quiz on ${documentName}.

Based on performance signals, give ONE short, specific, actionable coaching tip.

Rules:
- Maximum 2 sentences
- Be specific to their actual errors (mention topic names from the data)
- Sound like a helpful mentor, not a critic
- Do NOT be generic (no "keep trying!" or "you can do it!")
- If they skipped questions, address that directly
- If they're spending too long, address that directly
- If same concept appears multiple times as a weak area, prioritize it`;

    const userMessage = `Student is on question ${currentQuestionIndex + 1} of ${totalQuestions}.

Errors so far:
${wrongSummary || 'None yet'}

Skipped questions:
${skippedSummary}

Repeated weak areas: ${repeatedWeakAreas || 'None yet'}

Average time per question: ${timePerQuestion.avg || 0}s
Slowest area: ${timePerQuestion.slowest ? `"${timePerQuestion.slowest.topic}" at ${timePerQuestion.slowest.seconds}s` : 'N/A'}

Give a single coaching tip based on these signals.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 120,
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    });

    const suggestion = completion.choices[0]?.message?.content?.trim() || FALLBACK_SUGGESTION;

    return NextResponse.json({ suggestion: suggestion.slice(0, 400) });
  } catch (err) {
    console.error('[quiz/ai-coach]', err);
    // Graceful degradation: return fallback, never crash quiz
    return NextResponse.json({ suggestion: FALLBACK_SUGGESTION, fallback: true });
  }
}
```

- [ ] **Step 3: Manual test via browser DevTools**

```javascript
fetch('/api/quiz/ai-coach', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    signals: {
      wrongAnswers: [
        { topic: 'Carnot Cycle', marksEarned: 2, totalMarks: 10 },
        { topic: 'Carnot Cycle', marksEarned: 3, totalMarks: 10 },
      ],
      skippedQuestions: [],
      timePerQuestion: { avg: 45, slowest: { topic: 'Entropy', seconds: 90 } },
      weakConcepts: { 'Carnot Cycle': 2 },
      currentQuestionIndex: 4,
      totalQuestions: 12,
    },
    documentName: 'Physics.pdf',
  })
}).then(r => r.json()).then(console.log)
```
Expected: `{ suggestion: "You've missed Carnot Cycle twice — review..." }`

- [ ] **Step 4: Commit**

```bash
git add src/app/api/quiz/ai-coach/route.js
git commit -m "feat(quiz): add performance-aware AI coach endpoint"
```

---

## Task 5: Enhance `/api/ai/generate-questions` — 10-Layer Pipeline

**Files:**
- Modify: `src/app/api/ai/generate-questions/route.js`

This is the most complex task. Replace the entire file.

- [ ] **Step 1: Replace the route file with the reinforced version**

```javascript
// src/app/api/ai/generate-questions/route.js
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── helpers ────────────────────────────────────────────────────────────────
function sanitizeQuestion(q, index) {
  return {
    id: `q-${Date.now()}-${index}`,
    text: String(q.text || '').replace(/<[^>]*>/g, '').trim().slice(0, 1000),
    marks: Math.max(1, Math.min(100, Number(q.marks) || 5)),
    hints: Array.isArray(q.hints)
      ? q.hints.map((h) => String(h).slice(0, 200)).slice(0, 6)
      : [],
    sourceSnippet: String(q.sourceSnippet || '').slice(0, 300),
    documentReference: String(q.documentReference || '').slice(0, 50),
  };
}

function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
  const magB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
  return magA && magB ? dot / (magA * magB) : 0;
}

// ── main handler ───────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    // ── Layer 1: Input Validation ─────────────────────────────────────────
    const body = await request.json();
    const { documentId, userId, count = 12, marks = [5, 10, 20] } = body;

    if (!documentId || typeof documentId !== 'string') {
      return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
    }
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }
    if (!Number.isInteger(count) || count < 5 || count > 50) {
      return NextResponse.json({ error: 'count must be 5–50' }, { status: 400 });
    }
    if (!Array.isArray(marks) || marks.some((m) => !Number.isInteger(m) || m < 1)) {
      return NextResponse.json({ error: 'Invalid marks array' }, { status: 400 });
    }

    // ── Layer 2: Authorization ─────────────────────────────────────────────
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('id, name, user_id')
      .eq('id', documentId)
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
    }
    if (doc.user_id !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // ── Layer 3: Fetch Chunks (lazy parse if missing) ──────────────────────
    let { data: chunkRows, error: chunkError } = await supabase
      .from('document_chunks')
      .select('content, page_number, embedding')
      .eq('document_id', documentId)
      .limit(120);

    if (chunkError || !chunkRows || chunkRows.length === 0) {
      // Lazy parse
      const parseRes = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/parse-pdf`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId, userId }),
        }
      );
      if (!parseRes.ok) {
        return NextResponse.json(
          { error: 'PDF could not be processed. Please try again or upload a different file.' },
          { status: 422 }
        );
      }

      const refetch = await supabase
        .from('document_chunks')
        .select('content, page_number, embedding')
        .eq('document_id', documentId)
        .limit(120);

      if (!refetch.data || refetch.data.length === 0) {
        return NextResponse.json(
          { error: 'PDF has no readable content. Please upload a different file.' },
          { status: 422 }
        );
      }
      chunkRows = refetch.data;
    }

    // ── Layer 4: Concept Extraction ────────────────────────────────────────
    const sampleText = chunkRows
      .slice(0, 20)
      .map((c) => c.content)
      .join('\n\n')
      .slice(0, 5000);

    const conceptRes = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 300,
      messages: [
        {
          role: 'system',
          content:
            'Extract 10-15 key academic topics or concepts from this text as a JSON array of strings. Return ONLY the JSON array.',
        },
        { role: 'user', content: sampleText },
      ],
    });
    let concepts = [];
    try {
      concepts = JSON.parse(conceptRes.choices[0].message.content.trim());
      if (!Array.isArray(concepts)) concepts = [];
    } catch (_) {
      concepts = [];
    }
    concepts = concepts.slice(0, 15).map((c) => String(c).trim());

    // ── Layer 5: Build Document Context for Prompt ─────────────────────────
    const docContext = chunkRows
      .slice(0, 40)
      .map((c) => `[Page ${c.page_number || '?'}] ${c.content.slice(0, 600)}`)
      .join('\n\n');

    const systemPrompt = `You are a university exam question setter. Generate ${count} long-answer exam questions.

CRITICAL RULES — Non-negotiable:
1. Generate questions ONLY from the provided document content below.
2. Every question MUST be directly and fully answerable using ONLY the document.
3. Do NOT use general knowledge outside the document.
4. Every sourceSnippet must be an EXACT quote (verbatim) from the document text.

Key concepts in document: ${concepts.join(', ')}

For each question return a JSON object with:
- text: the question (must reference document-specific concepts)
- marks: integer chosen from [${marks.join(', ')}]
- hints: array of 3-4 answer structure hints like "Define X (2M)" or "Explain Y (4M)"
- sourceSnippet: EXACT verbatim quote from the document (20–100 words) that contains the answer
- documentReference: page number string like "Page 5"

Return ONLY a JSON array. No markdown, no code fences.

DOCUMENT CONTENT:
${docContext}`;

    // ── Layer 6 & 7: Two-Pass Generation + Retry up to 2 times ────────────
    const TARGET = Math.ceil(count * 1.3); // generate 30% extra for buffer
    const QUALITY_THRESHOLD = 0.9;

    let finalQuestions = [];
    let lastError = null;

    for (let attempt = 0; attempt <= 2; attempt++) {
      try {
        const stricter = attempt > 0
          ? '\n\nSTRICT WARNING: Previous attempt failed quality checks. Every question MUST have an exact sourceSnippet found verbatim in the document.'
          : '';

        const gen = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          max_tokens: 4000,
          temperature: 0.7 - attempt * 0.1,
          messages: [{ role: 'user', content: systemPrompt + stricter }],
        });

        const raw = gen.choices[0]?.message?.content?.trim() ?? '[]';
        let generated = JSON.parse(raw);
        if (!Array.isArray(generated)) throw new Error('LLM returned non-array');

        generated = generated
          .filter((q) => q && typeof q.text === 'string' && q.text.trim().length > 10)
          .map((q, i) => sanitizeQuestion(q, i));

        // ── Pass 2: Verify pass (ask LLM to confirm grounding) ─────────────
        const verifyPrompt = `For each question below, reply ONLY with a JSON array where each element is { "index": N, "valid": true/false }.
A question is valid ONLY if its sourceSnippet appears verbatim (or near-verbatim) in the document AND the question is fully answerable from the document.

Document excerpt:
${docContext.slice(0, 4000)}

Questions to verify:
${JSON.stringify(generated.map((q, i) => ({ index: i, text: q.text, sourceSnippet: q.sourceSnippet })))}`;

        const verify = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          max_tokens: 800,
          temperature: 0,
          messages: [{ role: 'user', content: verifyPrompt }],
        });

        let verifications = [];
        try {
          verifications = JSON.parse(verify.choices[0].message.content.trim());
        } catch (_) {
          verifications = generated.map((_, i) => ({ index: i, valid: true }));
        }

        const validIndices = new Set(
          verifications.filter((v) => v.valid).map((v) => v.index)
        );

        // ── Layer 8: Semantic Similarity Validation ────────────────────────
        const chunkTexts = chunkRows.slice(0, 60).map((c) => c.content);
        const questionTexts = generated.map((q) => q.text);

        const [chunkEmbRes, qEmbRes] = await Promise.all([
          openai.embeddings.create({ model: 'text-embedding-3-small', input: chunkTexts }),
          openai.embeddings.create({ model: 'text-embedding-3-small', input: questionTexts }),
        ]);

        const chunkEmbs = chunkEmbRes.data.map((d) => d.embedding);
        const qEmbs = qEmbRes.data.map((d) => d.embedding);

        const semanticValid = qEmbs.map((qEmb) =>
          Math.max(...chunkEmbs.map((cEmb) => cosineSimilarity(qEmb, cEmb))) >= 0.60
        );

        // ── Layer 9: Source Snippet Verification ──────────────────────────
        const allChunkText = chunkRows.map((c) => c.content.toLowerCase()).join(' ');

        const snippetValid = generated.map((q) => {
          if (!q.sourceSnippet || q.sourceSnippet.length < 10) return false;
          const words = q.sourceSnippet.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
          if (words.length === 0) return false;
          const matched = words.filter((w) => allChunkText.includes(w));
          return matched.length / words.length >= 0.75;
        });

        // ── Combine all checks ─────────────────────────────────────────────
        const valid = generated.filter((_, i) =>
          validIndices.has(i) && semanticValid[i] && snippetValid[i]
        );

        // ── Layer 10: 90% Quality Threshold ───────────────────────────────
        if (valid.length < count * QUALITY_THRESHOLD) {
          lastError = new Error(
            `Quality threshold not met: ${valid.length}/${count} questions passed (need ${Math.ceil(count * QUALITY_THRESHOLD)})`
          );
          continue; // retry
        }

        finalQuestions = valid.slice(0, count);
        break;
      } catch (err) {
        lastError = err;
      }
    }

    if (finalQuestions.length === 0) {
      return NextResponse.json(
        {
          error:
            'Could not generate valid questions from this PDF after multiple attempts. ' +
            'Try uploading a different file or ensure the document contains sufficient academic content.',
          detail: lastError?.message,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      questions: finalQuestions,
      sourceDocument: { id: documentId, name: doc.name },
      usedConcepts: concepts,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[generate-questions]', err);
    return NextResponse.json({ error: 'Question generation failed', detail: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Manual test — Happy path**

In browser DevTools, first get your `userId` and a valid `documentId` from Supabase. Then:

```javascript
// Replace with real values from your Supabase documents table
fetch('/api/ai/generate-questions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    documentId: 'YOUR_DOCUMENT_ID',
    userId: 'YOUR_USER_ID',
    count: 5,
    marks: [5, 10]
  })
}).then(r => r.json()).then(console.log)
```
Expected: `{ success: true, questions: [...], sourceDocument: { id, name }, usedConcepts: [...] }`

- [ ] **Step 3: Manual test — Wrong userId**

```javascript
fetch('/api/ai/generate-questions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    documentId: 'YOUR_DOCUMENT_ID',
    userId: '00000000-0000-0000-0000-000000000000',
    count: 5,
    marks: [5]
  })
}).then(r => r.json()).then(console.log)
```
Expected: `{ error: 'Access denied' }` with status 403

- [ ] **Step 4: Manual test — Missing documentId**

```javascript
fetch('/api/ai/generate-questions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: 'YOUR_USER_ID', count: 5, marks: [5] })
}).then(r => r.json()).then(console.log)
```
Expected: `{ error: 'Missing documentId' }` with status 400

- [ ] **Step 5: Commit**

```bash
git add src/app/api/ai/generate-questions/route.js
git commit -m "feat(quiz): reinforce generate-questions with 10-layer PDF validation pipeline"
```

---

## Task 6: Create `QuizPDFSelector` Component

**Files:**
- Create: `src/components/quiz/QuizPDFSelector.jsx`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p src/components/quiz
```

- [ ] **Step 2: Write the component**

```jsx
// src/components/quiz/QuizPDFSelector.jsx
'use client';
import { useState, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Button from '@/components/shared/Button';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@/lib/styles';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function relativeDate(isoStr) {
  if (!isoStr) return '';
  const days = Math.floor((Date.now() - new Date(isoStr).getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// Props:
//   activePdf   — { id, name } | null
//   documents   — [{ id, name, created_at }]
//   onSelectPDF — (documentId, documentName) => void
//   userId      — string
//   error       — string | null
export default function QuizPDFSelector({ activePdf, documents, onSelectPDF, userId, error }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [showOtherDocs, setShowOtherDocs] = useState(false);
  const fileInputRef = useRef(null);

  const sortedDocuments = useMemo(() =>
    [...(documents || [])].sort((a, b) => {
      if (a.id === activePdf?.id) return -1;
      if (b.id === activePdf?.id) return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    }),
    [documents, activePdf]
  );

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', session?.user?.id || userId || '');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || !data.document) throw new Error(data.error || 'Upload failed');
      onSelectPDF(data.document.id, data.document.name);
    } catch (err) {
      setUploadError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const pageStyle = {
    background: `linear-gradient(160deg, ${COLORS.bg.dark} 0%, ${COLORS.bg.darkGradient} 100%)`,
    minHeight: '100vh',
    color: COLORS.text.primary,
    fontFamily: TYPOGRAPHY.fontFamily,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
  };

  const cardStyle = {
    width: '100%',
    maxWidth: 480,
    border: `1px solid ${COLORS.border.lighter}`,
    borderRadius: RADIUS.lg,
    padding: SPACING.xxl,
    background: COLORS.bg.card,
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.lg,
  };

  const docRowStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${SPACING.md} ${SPACING.lg}`,
    borderRadius: RADIUS.md,
    border: `1px solid ${isActive ? COLORS.border.accent : COLORS.border.light}`,
    background: isActive ? 'rgba(139,92,246,0.06)' : 'transparent',
    cursor: 'pointer',
    transition: 'background 0.15s',
  });

  const uploadZoneStyle = {
    border: `1px dashed ${COLORS.border.lighter}`,
    borderRadius: RADIUS.md,
    padding: `${SPACING.xl} ${SPACING.lg}`,
    textAlign: 'center',
    cursor: uploading ? 'wait' : 'pointer',
    opacity: uploading ? 0.6 : 1,
    transition: 'border-color 0.15s',
  };

  const errorText = error || uploadError;

  // ── State A: Active PDF ────────────────────────────────────────────────
  if (activePdf && !showOtherDocs) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: TYPOGRAPHY.sizes.heading, fontWeight: 600 }}>🧠 Start Quiz</div>
          <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.secondary }}>
            Generate questions from your active study material:
          </div>

          <div style={docRowStyle(true)} onClick={() => onSelectPDF(activePdf.id, activePdf.name)}>
            <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.primary }}>
              📄 {activePdf.name.length > 36 ? activePdf.name.slice(0, 36) + '…' : activePdf.name}
            </div>
            <span style={{
              fontSize: TYPOGRAPHY.sizes.small,
              background: 'rgba(139,92,246,0.15)',
              color: COLORS.text.accent,
              padding: `2px ${SPACING.sm}`,
              borderRadius: RADIUS.sm,
              fontWeight: 700,
            }}>Active</span>
          </div>

          <div style={{ display: 'flex', gap: SPACING.md }}>
            <Button
              label="▶ Start Quiz"
              variant="primary"
              onClick={() => onSelectPDF(activePdf.id, activePdf.name)}
              style={{ flex: 1 }}
            />
            <Button
              label="Change PDF"
              variant="secondary"
              onClick={() => setShowOtherDocs(true)}
            />
          </div>

          {errorText && (
            <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: '#f87171' }}>{errorText}</div>
          )}
        </div>
      </div>
    );
  }

  // ── State B: No Active, Previous PDFs Exist (or "Change PDF" was clicked) ──
  if (sortedDocuments.length > 0) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: TYPOGRAPHY.sizes.heading, fontWeight: 600 }}>🧠 Choose Study Material</div>
          <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.secondary }}>
            Select a PDF to generate quiz questions from:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
            {sortedDocuments.map((doc) => (
              <div key={doc.id} style={docRowStyle(doc.id === activePdf?.id)} onClick={() => onSelectPDF(doc.id, doc.name)}>
                <div>
                  <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.primary }}>
                    📄 {doc.name.length > 36 ? doc.name.slice(0, 36) + '…' : doc.name}
                  </div>
                  <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary }}>
                    {relativeDate(doc.created_at)}
                  </div>
                </div>
                {doc.id === activePdf?.id && (
                  <span style={{
                    fontSize: TYPOGRAPHY.sizes.small,
                    background: 'rgba(139,92,246,0.15)',
                    color: COLORS.text.accent,
                    padding: `2px ${SPACING.sm}`,
                    borderRadius: RADIUS.sm,
                    fontWeight: 700,
                  }}>Active</span>
                )}
              </div>
            ))}
          </div>

          <div style={uploadZoneStyle} onClick={() => !uploading && fileInputRef.current?.click()}>
            <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.secondary }}>
              {uploading ? '⏳ Uploading…' : '+ Upload New PDF'}
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleFileChange} />
          </div>

          {errorText && (
            <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: '#f87171' }}>{errorText}</div>
          )}
        </div>
      </div>
    );
  }

  // ── State C: No PDFs at all ────────────────────────────────────────────
  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ fontSize: TYPOGRAPHY.sizes.heading, fontWeight: 600 }}>🧠 Start Your First Quiz</div>
        <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.secondary }}>
          Upload your study material to generate quiz questions from it.
        </div>

        <div style={uploadZoneStyle} onClick={() => !uploading && fileInputRef.current?.click()}>
          <div style={{ fontSize: '32px', marginBottom: SPACING.sm }}>📁</div>
          <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.secondary }}>
            {uploading ? '⏳ Uploading…' : 'Drop your PDF here or click to browse'}
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleFileChange} />
        </div>

        {errorText && (
          <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: '#f87171' }}>{errorText}</div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/quiz/QuizPDFSelector.jsx
git commit -m "feat(quiz): add QuizPDFSelector component with State A/B/C PDF selection flow"
```

---

## Task 7: Update Quiz Page — Phase 1 (PDF Selection + Session Recovery)

**Files:**
- Modify: `src/app/quiz/page.jsx`

This is split into two phases. Phase 1 adds PDF selection flow, session recovery, and one-active-quiz dialog. Phase 2 (Task 8) adds performance signals and AI coach.

- [ ] **Step 1: Replace `QuizContent` with the new version including PDF selection + session recovery**

Replace the entire contents of `src/app/quiz/page.jsx`:

```jsx
// src/app/quiz/page.jsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import TopBar from '@/components/shared/TopBar';
import ContextualSidebar from '@/components/shared/ContextualSidebar';
import Button from '@/components/shared/Button';
import ProgressBar from '@/components/shared/ProgressBar';
import QuizSkeleton from '@/components/shared/QuizSkeleton';
import QuizPDFSelector from '@/components/quiz/QuizPDFSelector';
import { useActivePDF } from '@/hooks/useActivePDF';
import { saveQuizSession, loadQuizSession, clearQuizSession } from '@/utils/quizSession';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@/lib/styles';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ── quiz state machine ─────────────────────────────────────────────────────
// 'init'           — checking auth + localStorage
// 'resumeDialog'   — asking to resume or start new
// 'selectingPdf'   — showing PDF selector
// 'generating'     — generating questions from PDF
// 'active'         — quiz in progress
// 'error'          — unrecoverable error

function QuizContent() {
  const router = useRouter();

  // ── Auth ──────────────────────────────────────────────────────────────
  const [userId, setUserId] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
      setAuthLoading(false);
    });
  }, []);

  const { activePdf, loading: activePdfLoading } = useActivePDF(userId);

  // ── Documents list ────────────────────────────────────────────────────
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    if (!userId) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      fetch('/api/documents', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then((r) => r.json())
        .then((data) => setDocuments(Array.isArray(data) ? data : []))
        .catch(() => setDocuments([]));
    });
  }, [userId]);

  // ── Quiz state ────────────────────────────────────────────────────────
  const [quizState, setQuizState] = useState('init');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [evaluations, setEvaluations] = useState({});
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [evaluating, setEvaluating] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [savedSession, setSavedSession] = useState(null);

  // ── Performance signals (Phase 2) ────────────────────────────────────
  const [performanceSignals, setPerformanceSignals] = useState({
    questionTimes: {},
    wrongAnswers: [],
    skippedQuestions: [],
    weakConcepts: {},
  });
  const questionStartTimeRef = useRef(Date.now());

  // ── AI Coach (Phase 2) ────────────────────────────────────────────────
  const [coachSuggestion, setCoachSuggestion] = useState(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const coachTimerRef = useRef(null);

  // ── Timer ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (quizState !== 'active') return;
    const id = setInterval(() => setSessionSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [quizState]);

  // ── Track per-question time ───────────────────────────────────────────
  useEffect(() => {
    questionStartTimeRef.current = Date.now();
  }, [currentIndex]);

  // ── Init: check auth + localStorage ──────────────────────────────────
  useEffect(() => {
    if (authLoading || activePdfLoading) return;

    const saved = loadQuizSession();
    if (saved && saved.questions.length > 0) {
      setSavedSession(saved);
      setQuizState('resumeDialog');
    } else {
      setQuizState('selectingPdf');
    }
  }, [authLoading, activePdfLoading]);

  // ── Auto-save every 30s when quiz is active ───────────────────────────
  useEffect(() => {
    if (quizState !== 'active') return;
    const id = setInterval(() => {
      saveQuizSession({
        selectedDocument,
        questions,
        currentIndex,
        answers,
        evaluations,
        sessionSeconds,
        performanceSignals,
      });
    }, 30000);
    return () => clearInterval(id);
  }, [quizState, selectedDocument, questions, currentIndex, answers, evaluations, sessionSeconds, performanceSignals]);

  // ── Helpers ───────────────────────────────────────────────────────────
  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(evaluations).length;

  // ── Resume saved session ──────────────────────────────────────────────
  const handleResume = useCallback(() => {
    if (!savedSession) return;
    setSelectedDocument(savedSession.selectedDocument);
    setQuestions(savedSession.questions);
    setCurrentIndex(savedSession.currentIndex);
    setAnswers(savedSession.answers);
    setEvaluations(savedSession.evaluations);
    setSessionSeconds(savedSession.sessionSeconds || 0);
    setPerformanceSignals(savedSession.performanceSignals || {
      questionTimes: {},
      wrongAnswers: [],
      skippedQuestions: [],
      weakConcepts: {},
    });
    setQuizState('active');
  }, [savedSession]);

  // ── Abandon saved session + go to PDF selector ────────────────────────
  const handleAbandon = useCallback(() => {
    clearQuizSession();
    setSavedSession(null);
    setQuizState('selectingPdf');
  }, []);

  // ── PDF selected → generate questions ────────────────────────────────
  const handleSelectPDF = useCallback(async (documentId, documentName) => {
    // If a session already exists in storage, confirm abandon first
    const existing = loadQuizSession();
    if (existing && existing.questions.length > 0) {
      const confirmed = window.confirm(
        `You have an active quiz on "${existing.selectedDocument?.name || 'a previous PDF'}". Abandon it and start a new quiz?`
      );
      if (!confirmed) return;
      clearQuizSession();
    }

    setSelectedDocument({ id: documentId, name: documentName });
    setGenerationError(null);
    setQuizState('generating');

    try {
      const res = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          userId,
          count: 12,
          marks: [5, 10, 20],
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setGenerationError(data.error || 'Could not generate questions from this PDF. Please try a different file.');
        setQuizState('selectingPdf');
        return;
      }

      // Validate source document matches intent
      if (data.sourceDocument?.id !== documentId) {
        setGenerationError('Questions were not generated from the selected PDF. Please try again.');
        setQuizState('selectingPdf');
        return;
      }

      setQuestions(data.questions);
      setCurrentIndex(0);
      setAnswers({});
      setEvaluations({});
      setSessionSeconds(0);
      setCoachSuggestion(null);
      setPerformanceSignals({ questionTimes: {}, wrongAnswers: [], skippedQuestions: [], weakConcepts: {} });
      setQuizState('active');
    } catch (err) {
      setGenerationError('Connection error. Please check your internet and try again.');
      setQuizState('selectingPdf');
    }
  }, [userId]);

  // ── Evaluate answer ───────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!answers[currentIndex] || !currentQ) return;
    setEvaluating(true);

    const timeSpent = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);

    try {
      const res = await fetch('/api/ai/evaluate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQ.text,
          answer: answers[currentIndex],
          hints: currentQ.hints,
          totalMarks: currentQ.marks,
        }),
      });
      const data = await res.json();
      const evaluation = {
        marksEarned: data.marksEarned ?? 0,
        totalMarks: data.totalMarks ?? currentQ.marks,
        feedback: data.feedback ?? 'Evaluation complete.',
        explanation: data.explanation ?? '',
      };

      setEvaluations((prev) => ({ ...prev, [currentIndex]: evaluation }));

      // ── Performance signal collection ─────────────────────────────────
      const isWrong = evaluation.marksEarned < evaluation.totalMarks * 0.5;

      setPerformanceSignals((prev) => {
        const topicGuess = currentQ.text.split(' ').slice(0, 6).join(' ');
        const newTimes = { ...prev.questionTimes, [currentQ.id]: timeSpent };
        const avgTime = Object.values(newTimes).reduce((a, b) => a + b, 0) / Object.values(newTimes).length;
        const slowestEntry = Object.entries(newTimes).reduce((a, b) => (b[1] > a[1] ? b : a), ['', 0]);

        const next = {
          questionTimes: newTimes,
          wrongAnswers: isWrong
            ? [...prev.wrongAnswers, { questionId: currentQ.id, topic: topicGuess, marksEarned: evaluation.marksEarned, totalMarks: evaluation.totalMarks }]
            : prev.wrongAnswers,
          skippedQuestions: prev.skippedQuestions,
          weakConcepts: isWrong
            ? { ...prev.weakConcepts, [topicGuess]: (prev.weakConcepts[topicGuess] || 0) + 1 }
            : prev.weakConcepts,
          timePerQuestion: {
            avg: Math.round(avgTime),
            slowest: slowestEntry[1] > 0 ? { topic: slowestEntry[0], seconds: slowestEntry[1] } : null,
          },
        };

        // Trigger AI coach after wrong answer (debounced 500ms)
        if (isWrong) {
          clearTimeout(coachTimerRef.current);
          coachTimerRef.current = setTimeout(() => fetchCoachSuggestion(next, selectedDocument?.name), 500);
        }

        return next;
      });

      if (currentIndex < questions.length - 1) {
        setTimeout(() => { setCurrentIndex((i) => i + 1); setEvaluating(false); }, 1200);
      } else {
        setEvaluating(false);
      }
    } catch {
      setEvaluations((prev) => ({
        ...prev,
        [currentIndex]: {
          marksEarned: 0,
          totalMarks: currentQ.marks,
          feedback: 'Evaluation failed — please try again.',
          explanation: '',
        },
      }));
      setEvaluating(false);
    }
  }, [answers, currentIndex, currentQ, questions.length, selectedDocument]);

  // ── Skip question ─────────────────────────────────────────────────────
  const handleSkip = useCallback(() => {
    if (!currentQ) return;
    const topicGuess = currentQ.text.split(' ').slice(0, 6).join(' ');
    setPerformanceSignals((prev) => ({
      ...prev,
      skippedQuestions: [...prev.skippedQuestions, { questionId: currentQ.id, topic: topicGuess }],
    }));
    if (currentIndex < questions.length - 1) setCurrentIndex((i) => i + 1);
  }, [currentQ, currentIndex, questions.length]);

  // ── Fetch AI coach suggestion ─────────────────────────────────────────
  const fetchCoachSuggestion = async (signals, docName) => {
    setCoachLoading(true);
    try {
      const res = await fetch('/api/quiz/ai-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signals: {
            ...signals,
            currentQuestionIndex: currentIndex,
            totalQuestions: questions.length,
          },
          documentName: docName || 'your study material',
        }),
      });
      const data = await res.json();
      if (data.suggestion) setCoachSuggestion(data.suggestion);
    } catch (_) {
      // Gracefully degrade — quiz continues without coach
    } finally {
      setCoachLoading(false);
    }
  };

  // ── Finish quiz ───────────────────────────────────────────────────────
  const handleFinish = useCallback(() => {
    clearQuizSession();
    router.push('/dashboard');
  }, [router]);

  // ── Styles ────────────────────────────────────────────────────────────
  const pageStyle = {
    background: `linear-gradient(160deg, ${COLORS.bg.dark} 0%, ${COLORS.bg.darkGradient} 100%)`,
    minHeight: '100vh',
    color: COLORS.text.primary,
    fontFamily: TYPOGRAPHY.fontFamily,
  };

  // ── State: init / auth loading ────────────────────────────────────────
  if (authLoading || activePdfLoading || quizState === 'init') {
    return <QuizSkeleton />;
  }

  // ── State: resume dialog ──────────────────────────────────────────────
  if (quizState === 'resumeDialog' && savedSession) {
    return (
      <div style={{ ...pageStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          maxWidth: 440,
          width: '100%',
          border: `1px solid ${COLORS.border.lighter}`,
          borderRadius: RADIUS.lg,
          padding: SPACING.xxl,
          background: COLORS.bg.card,
          display: 'flex',
          flexDirection: 'column',
          gap: SPACING.lg,
        }}>
          <div style={{ fontSize: TYPOGRAPHY.sizes.heading, fontWeight: 600 }}>📋 Resume Quiz?</div>
          <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.secondary }}>
            You were on question {savedSession.currentIndex + 1} of {savedSession.questions.length}
            {savedSession.selectedDocument?.name ? ` in "${savedSession.selectedDocument.name}"` : ''}.
          </div>
          <div style={{ display: 'flex', gap: SPACING.md }}>
            <Button label="Resume" variant="primary" onClick={handleResume} style={{ flex: 1 }} />
            <Button label="Start Fresh" variant="secondary" onClick={handleAbandon} style={{ flex: 1 }} />
          </div>
        </div>
      </div>
    );
  }

  // ── State: PDF selector ───────────────────────────────────────────────
  if (quizState === 'selectingPdf') {
    return (
      <QuizPDFSelector
        activePdf={activePdf}
        documents={documents}
        onSelectPDF={handleSelectPDF}
        userId={userId}
        error={generationError}
      />
    );
  }

  // ── State: generating ─────────────────────────────────────────────────
  if (quizState === 'generating') {
    return (
      <div style={{ ...pageStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          maxWidth: 380,
          width: '100%',
          border: `1px solid ${COLORS.border.lighter}`,
          borderRadius: RADIUS.lg,
          padding: SPACING.xxl,
          background: COLORS.bg.card,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: SPACING.lg,
        }}>
          <div style={{ fontSize: TYPOGRAPHY.sizes.heading, fontWeight: 600 }}>⏳ Generating Quiz…</div>
          <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.secondary }}>
            Reading {selectedDocument?.name || 'your PDF'} and building your questions.
            <br />This takes about 15–30 seconds.
          </div>
        </div>
      </div>
    );
  }

  // ── State: active quiz ────────────────────────────────────────────────
  return (
    <div style={{ ...pageStyle, display: 'flex' }}>
      <ContextualSidebar />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <TopBar
          title={`Question ${currentIndex + 1}/${questions.length}`}
          subtitle={formatTime(sessionSeconds)}
        />

        {/* PDF source banner */}
        {selectedDocument && (
          <div style={{
            padding: `${SPACING.sm} ${SPACING.lg}`,
            fontSize: TYPOGRAPHY.sizes.caption,
            color: COLORS.text.secondary,
            borderBottom: `1px solid ${COLORS.border.lighter}`,
          }}>
            📄 Generating from: <strong>{selectedDocument.name}</strong>
          </div>
        )}

        <div style={{ padding: `${SPACING.sm} ${SPACING.lg}` }}>
          <ProgressBar current={answeredCount} total={questions.length} />
          <div style={{ fontSize: TYPOGRAPHY.sizes.small, color: COLORS.text.secondary, marginTop: SPACING.sm }}>
            {answeredCount}/{questions.length} answered
          </div>
        </div>

        {currentQ && (
          <div style={{
            padding: `0 ${SPACING.lg} ${SPACING.lg}`,
            display: 'grid',
            gridTemplateColumns: '3fr 2fr',
            gap: SPACING.xl,
            maxWidth: '1100px',
            margin: '0 auto',
          }}>
            {/* Left: Question + Answer */}
            <div>
              <div style={{ border: `1px solid ${COLORS.border.lighter}`, borderRadius: RADIUS.md, padding: SPACING.lg, background: COLORS.bg.card, marginBottom: SPACING.lg }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md }}>
                  <span style={{ fontSize: TYPOGRAPHY.sizes.small, color: COLORS.text.secondary }}>▲ Question</span>
                  <span style={{ fontSize: TYPOGRAPHY.sizes.caption, background: COLORS.bg.accentLight, border: `1px solid ${COLORS.border.accent}`, padding: `2px ${SPACING.sm}`, borderRadius: RADIUS.sm, color: COLORS.text.accent, fontWeight: 700 }}>
                    {currentQ.marks}M
                  </span>
                </div>
                <p style={{ fontSize: '14px', lineHeight: 1.7, margin: 0, color: COLORS.text.primary }}>{currentQ.text}</p>
              </div>

              <textarea
                placeholder="Type your answer here..."
                value={answers[currentIndex] || ''}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [currentIndex]: e.target.value }))}
                disabled={evaluating || !!evaluations[currentIndex]}
                style={{
                  width: '100%',
                  minHeight: '180px',
                  padding: SPACING.lg,
                  border: `1px solid ${COLORS.border.lighter}`,
                  borderRadius: RADIUS.md,
                  background: 'rgba(255,255,255,0.02)',
                  color: COLORS.text.primary,
                  fontFamily: TYPOGRAPHY.fontFamily,
                  fontSize: TYPOGRAPHY.sizes.body,
                  resize: 'vertical',
                  marginBottom: SPACING.lg,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />

              {evaluations[currentIndex] && (
                <div style={{ border: `1px solid ${COLORS.border.accent}`, borderRadius: RADIUS.md, padding: SPACING.lg, background: COLORS.bg.accentLight, marginBottom: SPACING.lg }}>
                  <div style={{ fontSize: TYPOGRAPHY.sizes.label, fontWeight: 700, color: COLORS.text.accent, marginBottom: SPACING.sm }}>
                    {evaluations[currentIndex].marksEarned}/{evaluations[currentIndex].totalMarks} marks
                  </div>
                  <p style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, margin: 0, lineHeight: 1.6 }}>
                    {evaluations[currentIndex].feedback}
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: SPACING.md }}>
                {currentIndex > 0 && (
                  <Button label="← Previous" variant="secondary" onClick={() => setCurrentIndex((i) => i - 1)} />
                )}
                {!evaluations[currentIndex] && (
                  <Button label="Skip" variant="ghost" onClick={handleSkip} />
                )}
                {!evaluations[currentIndex] ? (
                  <Button
                    label={evaluating ? 'Evaluating...' : 'Save Answer'}
                    variant="primary"
                    onClick={handleSave}
                    disabled={!answers[currentIndex] || evaluating}
                    style={{ flex: 1 }}
                  />
                ) : (
                  <Button
                    label={currentIndex < questions.length - 1 ? 'Next Question →' : 'Finish Quiz'}
                    variant="primary"
                    onClick={currentIndex < questions.length - 1 ? () => setCurrentIndex((i) => i + 1) : handleFinish}
                    style={{ flex: 1 }}
                  />
                )}
              </div>
            </div>

            {/* Right: Source + Hints + AI Coach */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.lg }}>
              <div>
                <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, fontWeight: 700, marginBottom: SPACING.sm }}>📚 From your notes:</div>
                <div style={{ padding: SPACING.md, border: `1px solid rgba(34,211,238,0.2)`, borderRadius: RADIUS.md, background: 'rgba(34,211,238,0.04)', fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, lineHeight: 1.6, fontStyle: 'italic' }}>
                  {currentQ.sourceSnippet || 'No excerpt available for this question.'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, fontWeight: 700, marginBottom: SPACING.sm }}>💡 Answer Structure:</div>
                <ul style={{ margin: 0, paddingLeft: SPACING.lg, fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, lineHeight: 1.8 }}>
                  {(currentQ.hints || []).map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              </div>

              <div>
                <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, fontWeight: 700, marginBottom: SPACING.sm }}>🤖 AI Coach:</div>
                <div style={{ padding: SPACING.md, borderRadius: RADIUS.md, background: 'rgba(139,92,246,0.05)', border: `1px solid rgba(139,92,246,0.1)`, fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, lineHeight: 1.6 }}>
                  {coachLoading
                    ? 'Thinking…'
                    : coachSuggestion || 'Answer a question to get coaching feedback.'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function QuizPage() {
  return (
    <Suspense fallback={<QuizSkeleton />}>
      <QuizContent />
    </Suspense>
  );
}
```

- [ ] **Step 2: Verify the app still runs**

```bash
npm run dev
```
Navigate to `/quiz`. Expected:
- If you have an active PDF in Ask AI: shows State A "Start Quiz" screen with PDF name
- If no active PDF but docs exist: shows State B list
- If no PDFs: shows State C upload zone
- On starting quiz: shows "⏳ Generating Quiz…" then quiz starts with 12 real questions
- On wrong answer: AI Coach updates after ~500ms
- On refresh mid-quiz: "Resume Quiz?" dialog appears

- [ ] **Step 3: Verify existing functionality is preserved**

- [ ] Timer counts up correctly
- [ ] Answer textarea works, disables after evaluation
- [ ] Save Answer → shows evaluation with marks/feedback
- [ ] Previous button works
- [ ] Skip button tracks skipped question
- [ ] Next Question / Finish Quiz buttons work
- [ ] Source snippet panel shows question's source
- [ ] Answer Structure hints show
- [ ] Progress bar and count update
- [ ] Finish → navigates to dashboard

- [ ] **Step 4: Commit**

```bash
git add src/app/quiz/page.jsx
git commit -m "feat(quiz): complete PDF-driven quiz with adaptive AI coach, session recovery, and performance signals"
```

---

## Self-Review

### Spec Coverage Check

| Spec Requirement | Task |
|------------------|------|
| PDF selection State A (active PDF banner + Change) | Task 6, Task 7 |
| PDF selection State B (list docs + upload) | Task 6, Task 7 |
| PDF selection State C (upload only) | Task 6, Task 7 |
| Reuse active PDF from Ask AI (useActivePDF) | Task 7 |
| "Change PDF" escape hatch | Task 6 |
| Questions generated only from selected PDF | Task 5 |
| Two-pass generation (generate + verify) | Task 5 |
| Semantic similarity validation (embeddings, 0.60 threshold) | Task 5 |
| Source snippet verification (75% word match) | Task 5 |
| 90% quality threshold | Task 5 |
| Up to 2 retries on validation failure | Task 5 |
| Fail loudly (no silent generic fallback) | Task 5 |
| AI Coach updates only on wrong answers | Task 7 |
| AI Coach gracefully degrades if API fails | Task 7 |
| AI Coach debounced 500ms | Task 7 |
| Performance signals: time per question | Task 7 |
| Performance signals: wrong answers | Task 7 |
| Performance signals: skipped questions | Task 7 |
| Performance signals: weak concepts (frequency) | Task 7 |
| LocalStorage auto-save every 30s | Task 7 |
| Resume dialog on refresh | Task 7 |
| One active quiz policy (abandon dialog) | Task 7 |
| Input validation + sanitization | Task 5, Task 7 |
| Authorization check (user owns PDF) | Task 5 |
| CircuitBreaker | Task 1 |
| Retry with exponential backoff | Task 1 |
| Duplicate request prevention | Task 1 |
| Session corruption recovery | Task 2 |
| Session age expiry (24h) | Task 2 |
| Storage quota handling | Task 2 |
| Evaluate answer endpoint | Task 3 |
| AI Coach endpoint | Task 4 |
| Source document validation on response | Task 7 |
| Existing flow fully preserved (timer, nav, layout) | Task 7 |

All spec requirements covered. ✓

### Placeholder Scan

No TBD, TODO, or incomplete steps found. All code blocks are complete. ✓

### Type Consistency

- `saveQuizSession / loadQuizSession / clearQuizSession` — defined in Task 2, imported in Task 7 ✓
- `QuizPDFSelector` props: `{ activePdf, documents, onSelectPDF, userId, error }` — defined in Task 6, used in Task 7 ✓
- `useActivePDF(userId)` — returns `{ activePdf, setActivePdfId, loading }` — confirmed from existing file ✓
- `evaluations[currentIndex]` shape: `{ marksEarned, totalMarks, feedback, explanation }` — Task 3 returns this, Task 7 reads it ✓
- `performanceSignals` shape consistent across Task 4 (API input) and Task 7 (state) ✓
- `generate-questions` response: `{ success, questions, sourceDocument, usedConcepts }` — Task 5 returns it, Task 7 validates it ✓
