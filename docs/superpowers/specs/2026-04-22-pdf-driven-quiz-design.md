# PDF-Driven Quiz System with Adaptive AI Coach
**Design Document** | 2026-04-22

---

## Executive Summary

Transform the Quiz page from a generic, hardcoded system into a **PDF-driven intelligent exam engine** with:
- **PDF-based question generation** sourced from user's study materials (not generic)
- **Active PDF reuse** from Ask AI (seamless cross-page integration)
- **Dynamic AI Coach** with performance-aware adaptive suggestions
- **Zero UX friction** — lightweight setup, familiar flow, simple experience
- **Bulletproof error handling** — handles any failure gracefully

All while **preserving existing quiz functionality** (timer, answer structure, navigation, layout).

---

## Architecture Overview

### System Flow

```
User lands on /quiz
    ↓
Check for active PDF (useActivePDF hook)
    ↓
Three-state UI renders:
  • State A (active exists): "Using: Physics.pdf ✓" with "Change PDF" button
  • State B (no active, docs exist): List previous PDFs + upload zone
  • State C (no PDFs): Upload zone only
    ↓
User picks/confirms PDF
    ↓
Call /api/ai/generate-questions { documentId, userId, count: 12, marks: [...] }
    ↓
Endpoint:
  1. Fetch document chunks (or lazy-parse if missing)
  2. Extract key concepts from chunks
  3. Generate questions with strict document-only constraint
  4. Validate: semantic similarity + source snippet verification + 90% pass threshold
  5. Return { questions, sourceDocument, usedConcepts, validationMetrics }
    ↓
Quiz validates response, renders questions
    ↓
User answers → Evaluation → Performance signals collected
    ↓
If answer wrong: AI Coach refreshes with performance-aware suggestions
    ↓
Performance signals: time per Q, wrong answers, skipped, weak concepts
```

---

## Feature 1: PDF-Driven Question Generation

### PDF Selection UI (Option C — Smart Conditional)

**State A: Active PDF Exists**
```
📄 Physics.pdf ✓
[Change PDF]  [Start Quiz]
```
- Default action: Quiz generates from Physics.pdf
- User clicks "Change PDF" → reveals State B selection UI
- User clicks "Start Quiz" → proceeds to generation

**State B: No Active, Previous PDFs Exist**
```
📚 Previously Uploaded:
  📄 Physics.pdf (Mar 20)
  📄 Chemistry Notes.pdf (Mar 15)
  📄 Biology Concepts.pdf (Mar 10)

+ Upload New PDF
```
- Sorted by recency (most recent first)
- Click any PDF → generate quiz from it
- Click "+ Upload New PDF" → file input → upload → parse → select → generate

**State C: No PDFs**
```
📂 No study materials yet
+ Upload Your First PDF
```
- Only option: upload new PDF
- After upload, transitions to State A or B

**Escape Hatch (Locked):**
- From State A, clicking "Change PDF" → reveal State B
- User can switch to any other PDF with one click
- Prevents "stuck with active PDF" friction

---

### Enhanced `/api/ai/generate-questions` Endpoint

**Request:**
```javascript
POST /api/ai/generate-questions
{
  documentId,      // UUID of selected PDF
  userId,          // Authenticated user
  count: 12,       // Number of questions
  marks: [5, 10, 20]  // Mark distribution
}
```

**Processing Pipeline (Reinforced):**

1. **Input Validation:**
   - Validate documentId format (UUID)
   - Validate userId exists
   - Validate count range (5-50)
   - Validate marks array

2. **Authorization:**
   - Verify user owns the document
   - Verify document still exists (not deleted)
   - Verify user session is still valid

3. **PDF Parsing (Lazy & Idempotent):**
   - Call `/api/parse-pdf` if chunks don't exist
   - Returns early if already chunked (idempotent)
   - Handles OCR for scanned PDFs via GPT-4o Vision
   - Returns chunks with embeddings + page numbers

4. **Concept Extraction:**
   - Extract 10-15 key concepts from document chunks
   - Use semantic clustering or LLM-based extraction
   - Returns: `['Carnot Cycle', 'Thermodynamic Efficiency', ...]`

5. **Two-Pass Generation (Generate → Verify → Regenerate):**
   - **Pass 1:** Generate questions with document context
     - System prompt: "Generate ONLY from provided document. Do NOT use generic knowledge."
     - Include extracted concepts + document sections in context
     - Return: `{ id, text, marks, hints, sourceSnippet, documentReference }`
   
   - **Pass 2:** Verify each question is actually from document
     - Separate prompt: "Verify each question is directly answerable using ONLY these document sections"
     - Mark valid/invalid, provide reason
   
   - **Pass 3:** Regenerate invalid questions with stricter prompt
     - If < 90% pass threshold, fail and retry

6. **Semantic Validation (Embeddings-Based):**
   - Compute embedding for each generated question
   - Compare against document chunk embeddings
   - If similarity < 0.65, flag as low-quality
   - Questions must prove they came from the PDF

7. **Source Snippet Verification:**
   - Verify sourceSnippet exists verbatim in document (80%+ fuzzy match)
   - Mark valid/invalid
   - Questions without valid snippets are rejected

8. **Concept Grounding Verification:**
   - Check if questions reference extracted document concepts
   - Mark valid/invalid based on concept mention count

9. **Quality Threshold:**
   - **Require 90% pass rate** (12 questions → need 11 valid)
   - If < 90%, fail generation and retry with stricter prompt
   - Up to 2 retries before returning error
   - Fail loudly: don't silently degrade to generic questions

10. **Response:**
```javascript
{
  success: true,
  questions: [
    {
      id: "q1",
      text: "Explain the Carnot Cycle...",
      marks: 10,
      hints: ["Define...", "Explain...", ...],
      sourceSnippet: "The Carnot Cycle is...",  // Verbatim from PDF
      documentReference: "Page 42"
    },
    ...  // 12 total
  ],
  sourceDocument: { id: "uuid", name: "Physics.pdf" },
  usedConcepts: ["Carnot Cycle", "Heat Engine", ...],
  validationMetrics: {
    totalGenerated: 15,
    passed: 12,
    failed: 3,
    passRate: "80%",
    checks: {
      semantic: "12/15 passed (>65% similarity)",
      snippets: "12/15 found verbatim",
      concepts: "12/15 reference document topics"
    }
  },
  generatedAt: "2026-04-22T14:30:00Z"
}
```

**Error Cases (Fail Loudly):**
- PDF parsing fails → `{ error: "PDF could not be processed..." }`
- Chunks missing → `{ error: "PDF not processed yet. Try again or upload new file." }`
- < 90% validation pass → `{ error: "Quality threshold not met. Try different PDF." }`
- Network/LLM timeout → Retry 2x with exponential backoff, then fail
- Malformed LLM response → Fail and offer retry

---

## Feature 2: Active PDF Reuse from Ask AI

### `useActivePDF` Hook (Already Exists)

```javascript
const { activePdf, setActivePdfId, loading } = useActivePDF(userId);
// Returns: { activePdf: { id, name } | null, setActivePdfId, loading }
```

**Quiz Page Integration:**
```javascript
// On mount
const { activePdf, loading } = useActivePDF(userId);

// Render State A if activePdf exists
if (activePdf && !loading) {
  return <QuizSetupStateA activePdf={activePdf} onChangeClick={...} />;
}

// Render State B/C if not
return <QuizSetupStateBC />;
```

**Cross-Page Synchronization:**
- Ask AI updates `profiles.active_pdf_id` when PDF is selected
- Quiz reads `useActivePDF` on entry
- No explicit sync needed — Supabase is source of truth
- Changes in Ask AI are immediately visible in Quiz

**No Friction:**
- User switches from Ask AI to Quiz → active PDF automatically offered
- One-click "Continue with Active PDF" experience
- "Change PDF" escape hatch if they want different file

---

## Feature 3: Dynamic AI Coach with Performance Tracking

### Performance Signals (Collected During Quiz)

**Tracked Metrics:**
```javascript
const performanceSignals = {
  questionTimes: {},         // { q1: 42, q2: 18, ... } seconds
  wrongAnswers: [],          // [{ questionId, topic, marks, totalMarks }]
  skippedQuestions: [],      // [{ questionId, topic }]
  weakConcepts: {},          // { "Carnot Cycle": 2, "Heat Engine": 1 } — frequency
  timePerQuestion: {
    avg: 45,                 // Average seconds per question
    slowest: { topic, seconds: 90 }
  }
};
```

**Collection Points:**
1. **Timer:** Starts on question render, ends on submit/skip
2. **Wrong Answer:** Collected after evaluation if marks < 50% of total
3. **Skipped Question:** Collected when user clicks skip
4. **Weak Concept:** Aggregated from wrong answer topics (frequency count)

### AI Coach Update Flow (Option B — Locked)

**Trigger:** After incorrect answer ONLY
```
User submits answer
    ↓
Evaluation API returns (marks < 50% threshold)
    ↓
Answer marked as wrong
    ↓
setPerformanceSignals({ ...signals, wrongAnswers: [...] })
    ↓
Debounce 500ms to avoid rapid firing
    ↓
Call POST /api/quiz/ai-coach with performance signals
    ↓
AI Coach suggestion updates in right panel
    ↓
User continues to next question
```

**Coach STAYS SILENT on correct answers** — no updates, no noise.

### New `/api/quiz/ai-coach` Endpoint

**Request:**
```javascript
POST /api/quiz/ai-coach
{
  signals: {
    wrongAnswers: [{ questionText, topic, marksEarned, totalMarks }],
    skippedQuestions: [{ questionText, topic }],
    timePerQuestion: { avg: 45, slowest: { topic, seconds: 90 } },
    weakConcepts: { "Carnot Cycle": 2, "Heat Engine": 1 },
    currentQuestionIndex: 4,
    totalQuestions: 12
  },
  documentName: "Physics.pdf",
  usedConcepts: ["Carnot Cycle", "Heat Engine", ...]
}
```

**System Prompt:**
```
You are an adaptive AI Study Coach observing a student taking a quiz on {documentName}.

Based on performance signals, give ONE short, specific, actionable tip.
Rules:
- Max 2 sentences
- Be specific to their errors (mention topic names)
- Sound like a mentor, not a critic
- Do NOT be generic (no "keep trying!" or "you can do it!")
- If they skipped questions, address that
- If they're slow on specific topics, address that
- Only update when there's something to improve on
```

**Example Outputs:**
- "You've missed Carnot Cycle twice — review the efficiency formula before moving on."
- "You're skipping numerical questions — attempt them even partially, partial marks add up."
- "You're spending too long per question. In exams, cap each 10-mark answer at 8 minutes."

**Response:**
```javascript
{
  suggestion: "You've missed Carnot Cycle twice — review the efficiency formula.",
  fallback: false,  // true if this is a generic fallback
  timestamp: "2026-04-22T14:35:00Z"
}
```

**Error Handling (Graceful Degradation):**
- If coach API fails → return generic fallback: "Keep going — you're making progress!"
- Retry 2x before giving up
- Quiz continues WITHOUT coach — not a blocking failure
- Log error for monitoring

### UI Integration (No Layout Changes)

The existing right panel becomes dynamic:
```javascript
<div style={{ /* existing coach panel styles */ }}>
  🤖 AI Coach:
  {coachLoading 
    ? <span>Thinking...</span>
    : <div>{coachSuggestion || "Answer a question to get feedback."}</div>
  }
</div>
```

---

## Feature 4: Preserve Existing Functionality

**Quiz Layout & UI — UNCHANGED:**
- Left panel (3fr): Question, answer textarea, evaluation result, navigation buttons
- Right panel (2fr): Source snippet, answer structure hints, AI Coach
- Timer at top
- Skip/Previous/Next buttons
- Full quiz flow

**Preserved Behaviors:**
- Question progression (linear, no jumps)
- Timer behavior (continuous, visible)
- Answer structure section (hints on right)
- Source snippet display
- Save/Previous/Skip buttons
- Current layout and styling

**Only Changes:**
- Question source: PDF-driven instead of hardcoded/generic
- AI Coach: Dynamic instead of static text
- Selection screen: Lightweight PDF picker before quiz starts

---

## State Management

### Where State Lives

```
Global (Ask AI / Dashboard Context)
├─ activeP df (useActivePDF hook)
└─ documents (list of user PDFs)

Local (Quiz Page React State)
├─ selectedDocument { id, name }
├─ questions []
├─ currentIndex
├─ answers {}
├─ evaluations {}
├─ sessionSeconds
├─ performanceSignals {}
└─ coachSuggestion

LocalStorage (Session Recovery)
└─ quiz_session { selectedDocument, questions, answers, evaluations, ... }

Database (Persistent)
├─ profiles.active_pdf_id
├─ documents { id, user_id, name, file_url, subject }
├─ document_chunks { document_id, content, embedding, page_number }
└─ syllabus_topics { user_id, subject, topic }
```

### Quiz Session Persistence (Option B + One Active Quiz)

**LocalStorage Auto-Save:**
```javascript
// Auto-save every 30 seconds
useEffect(() => {
  const saveTimer = setInterval(() => {
    localStorage.setItem('quiz_session', JSON.stringify({
      selectedDocument,
      currentIndex,
      answers,
      evaluations,
      performanceSignals,
      timestamp: Date.now()
    }));
  }, 30000);
  
  return () => clearInterval(saveTimer);
}, [selectedDocument, currentIndex, answers, evaluations, performanceSignals]);
```

**Resume on Refresh:**
```javascript
// On mount
const saved = localStorage.getItem('quiz_session');
if (saved) {
  showModal("Resume your quiz from question 4?", [
    { label: "Resume", action: () => restoreSession(parsed) },
    { label: "Start Fresh", action: () => {
      localStorage.removeItem('quiz_session');
      startNewQuiz();
    }}
  ]);
}
```

**Multiple Quizzes (One Active Policy):**
```javascript
// If user tries to start new quiz while one is active
const handleStartNewQuiz = () => {
  const saved = localStorage.getItem('quiz_session');
  if (saved) {
    showModal("You have an active quiz on Physics.pdf — Resume or Abandon?", [
      { label: "Resume", action: resumeSession },
      { label: "Abandon & Start New", action: () => {
        localStorage.removeItem('quiz_session');
        startNewQuiz();
      }}
    ]);
  }
};
```

**Data NOT Persisted to Database (By Design):**
- Quiz answers/marks are NOT saved during the quiz
- Session data is ephemeral (session-only)
- If user closes tab mid-quiz, data is recoverable from localStorage only
- After quiz completes, user can optionally save results (future feature)

---

## Error Handling & Resilience

### 10-Layer Error Framework

**Layer 1: Input Validation & Sanitization**
- Validate all inputs (documentId, userId, count, marks)
- Sanitize question data from LLM (remove HTML, limit length)
- Catch malformed data early

**Layer 2: Authentication & Authorization**
- Verify user owns the PDF
- Verify document still exists
- Verify user session is valid

**Layer 3: Retry Logic with Exponential Backoff**
- Retry failed API calls up to 3x
- Backoff: 1s, 2s, 4s
- 30-second timeout per request
- Skip retries for auth errors (401/403)

**Layer 4: Circuit Breaker Pattern**
- Track API failure count
- After 5 failures, open circuit for 60s
- Prevent cascading failures
- Log when circuit opens

**Layer 5: State Validation**
- Validate state consistency at every step
- Check: answers don't exceed questions, evaluations are valid, index in bounds
- Detect and recover from state corruption

**Layer 6: Partial Failure Recovery**
- Generate questions in batches
- If batch fails, continue with remaining batches
- Accept 70%+ of generated questions
- Fail loudly if below threshold (not silently degrade)

**Layer 7: Graceful Degradation**
- AI Coach API fails → show generic fallback, continue quiz
- Evaluation API fails → use offline scoring fallback, queue for sync
- Connection lost → allow offline quiz completion, sync when back online
- Any non-critical failure → reduce functionality, don't block

**Layer 8: Duplicate Request Prevention**
- Prevent rapid double-clicks from causing duplicate API calls
- Use request key deduplication
- Return same promise for concurrent identical requests

**Layer 9: Comprehensive Logging & Monitoring**
- Structured error logging with timestamp, context, stack trace
- Send errors to monitoring service (Sentry, etc.)
- Store recent errors in localStorage for debugging
- Log security events separately

**Layer 10: Health Monitoring**
- Periodic health checks every 30 seconds during quiz
- Monitor API availability
- Monitor user session validity
- Alert user if service becomes unavailable

### Error Recovery Actions

| Scenario | Detection | User Message | Recovery |
|----------|-----------|--------------|----------|
| PDF parsing fails | Parse API error | "This PDF couldn't be processed. Try uploading a different file." | Choose different PDF or retry |
| Questions generation fails (90% threshold) | Validation fails | "We couldn't generate quiz questions from this PDF. Try a different file." | Retry or choose different PDF |
| Network disconnect | API timeout | "Connection lost. Check your internet and try again." | Auto-retry or manual retry |
| Mid-quiz refresh | LocalStorage has saved state | "Resume your quiz from question 4?" | Resume or start fresh |
| User tries new quiz while one active | localStorage.quiz_session exists | "You have an active quiz. Resume or abandon?" | Resume or abandon |
| PDF deleted by user | Document lookup fails | "This PDF was deleted. Choose another." | Select different PDF |
| AI Coach fails | Coach API error | Coach shows "Thinking..." and gracefully degrades | Quiz continues without coach |
| Browser storage limit exceeded | QuotaExceededError | (Transparent) Clear old sessions | Resume or retry |
| Session expired | Auth fails | "Your session expired. Please log in again." | Redirect to login |
| Service unavailable (circuit breaker) | Circuit opened | "Service temporarily unavailable. Try again in a moment." | Auto-retry or try later |

---

## API Endpoints Summary

### New/Enhanced Endpoints

**1. Enhanced POST `/api/ai/generate-questions`**
- Enhanced to accept `documentId` parameter
- Backwards compatible (falls back to weak_topics if no documentId)
- Implements 10-layer reinforced validation
- Input validation, authorization, retry logic, circuit breaker, semantic validation, source verification

**2. New POST `/api/quiz/ai-coach`**
- Takes performance signals from quiz
- Returns performance-aware coaching suggestion
- Gracefully degrades to generic fallback if fails
- Retry 2x before giving up

### Existing Endpoints (Unchanged)

**`POST /api/parse-pdf`** (Already exists)
- Lazy, idempotent PDF parsing
- Handles OCR for scanned PDFs
- Creates document chunks with embeddings
- Called by question generation if chunks missing

**`GET /api/documents`** or `GET /api/user-pdfs`** (Already exists)
- Lists user's PDFs
- Used for PDF selection UI

**`POST /api/ai/evaluate-answer`** (Already exists)
- Evaluates user's answer
- Returns marks, feedback, explanation

---

## Database Schema

**No new tables or columns needed.**

Existing tables already support this design:
- `documents` — user's uploaded PDFs
- `document_chunks` — parsed PDF content with embeddings
- `profiles.active_pdf_id` — active PDF tracking
- `syllabus_topics` — extracted concepts
- `documents_embeddings` — chunking embeddings

---

## Testing & Validation

### Manual Testing Checklist

**PDF Selection Flow:**
- [ ] Active PDF exists → show State A with "Change PDF" button
- [ ] No active, docs exist → show State B with list
- [ ] No PDFs → show State C with upload zone
- [ ] Click "Change PDF" → reveal State B overlay
- [ ] Select PDF → show generating spinner → questions appear

**Question Generation (Happy Path):**
- [ ] Questions are from PDF (check sourceSnippet in content)
- [ ] Questions reference extracted concepts
- [ ] Questions have proper marks, hints, source
- [ ] Validation metrics show 90%+ pass rate

**Question Generation (Error Cases):**
- [ ] PDF with no readable text → error message shown
- [ ] Corrupted PDF → error message shown
- [ ] Network timeout → retry and recover
- [ ] LLM timeout → retry and recover
- [ ] < 90% quality → error, offer retry or different PDF

**AI Coach:**
- [ ] Correct answer → coach stays silent
- [ ] Wrong answer → coach updates after 500ms debounce
- [ ] Coach suggestions are specific to topics/errors (not generic)
- [ ] Coach fails → quiz continues, generic fallback shown

**Session Recovery:**
- [ ] Refresh mid-quiz → "Resume?" modal shown
- [ ] Resume → all state restored (Q, answers, evaluations, time)
- [ ] Start fresh → state cleared, new quiz starts
- [ ] Close tab mid-quiz → localStorage preserved

**Multiple Quizzes:**
- [ ] Mid-quiz, try to start new → "Resume or abandon?" shown
- [ ] Click "Abandon" → quiz cleared, new one starts
- [ ] Complete quiz → can start new one immediately

**Error Handling:**
- [ ] Circuit breaker opens after 5 failures → show "temporarily unavailable"
- [ ] Network offline → offline mode activated, quiz continues
- [ ] Coach fails silently → quiz unaffected
- [ ] Corrupted localStorage → gracefully cleared and recovered

---

## Design Goals & Principles

✅ **PDF-driven questions** — no generic, all from user's material
✅ **Active PDF seamless reuse** — "I opened Quiz and it just works"
✅ **Dynamic AI Coach** — performance-aware, not static
✅ **Simple UX** — lightweight setup, no friction
✅ **Preserve flow** — existing quiz layout and behavior unchanged
✅ **Bulletproof** — handles any error gracefully
✅ **Session recovery** — LocalStorage backup, one active quiz
✅ **Cross-page sync** — Ask AI active PDF automatically available in Quiz
✅ **Quality over speed** — 90% validation threshold, fail loudly
✅ **Graceful degradation** — coach fails, quiz continues; coach API down, use generic

---

## Implementation Order (From writing-plans)

1. Enhance `/api/ai/generate-questions` with 10-layer validation
2. Create `/api/quiz/ai-coach` endpoint
3. Build PDF selection UI (State A, B, C) in Quiz page
4. Implement question generation flow + validation + error handling
5. Wire up `useActivePDF` hook to detect active PDF
6. Add performance signal tracking during quiz
7. Integrate dynamic AI Coach with debounce + refresh
8. Implement LocalStorage session recovery + one-active-quiz pattern
9. Add health monitoring + circuit breaker + retry logic
10. Test all error scenarios + edge cases
11. Monitor and iterate

