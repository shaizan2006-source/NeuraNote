# AI Systems Architecture
*The AI pipelines, prompt strategy, and cost discipline for Ask-My-Notes*
*For: Solo founder execution — 90-day window*
*Date: May 2026*

---

## 0. The AI thesis in one paragraph

Ask-My-Notes uses AI not as a feature but as the substrate of the product. Every interaction is either AI-generated or AI-supported. **This means AI cost and quality directly determine unit economics.** A naive approach (gpt-4o for everything, no caching, no model routing) destroys margins. A disciplined approach (model routing, semantic caching, prompt engineering, embedding economy) keeps the per-user AI cost under ₹50/month even at scale. This document specifies the disciplined approach.

The current product has sophisticated AI infrastructure (RAG, streaming, domain-aware classifier, concept extraction, voice tutor 5-phase pipeline). What's missing is a coherent strategy that ties them together and a cost-monitoring layer. This document provides both.

---

## 1. The AI architecture overview

```
┌─────────────────────────────────────────────────────────────┐
│                    USER REQUEST                              │
│  (Q&A, photo, voice, briefing, mock generation, etc.)       │
└──────────────────────┬──────────────────────────────────────┘
                       │
              ┌────────▼────────┐
              │ Classifier      │  (gpt-4o-mini, cached)
              │ - domain        │
              │ - intent        │
              │ - difficulty    │
              └────────┬────────┘
                       │
       ┌───────────────┼───────────────────┐
       │               │                   │
       ▼               ▼                   ▼
┌───────────┐ ┌────────────────┐  ┌────────────────┐
│ Semantic  │ │ Context Builder│  │ Model Router   │
│ Cache     │ │ - vector RAG   │  │ - mini default │
│ (Redis)   │ │ - PDF chunks   │  │ - 4o on demand │
└─────┬─────┘ │ - mastery      │  │ - vision/voice │
      │       └────────┬───────┘  └────────┬───────┘
      │                │                   │
      │                ▼                   │
      │     ┌──────────────────┐           │
      │     │ Prompt Assembler │           │
      │     └────────┬─────────┘           │
      │              │                     │
      │              ▼                     │
      │     ┌──────────────────┐           │
      └────►│ OpenAI API       │◄──────────┘
            │ - streaming      │
            │ - structured     │
            │ - vision         │
            │ - tts            │
            │ - whisper        │
            └────────┬─────────┘
                     │
                     ▼
            ┌──────────────────┐
            │ Response Handler │
            │ - stream parse   │
            │ - concept extract│
            │ - mastery update │
            │ - cost tracking  │
            └──────────────────┘
```

The flow is the same shape for every AI request. What changes is which boxes get used and which model gets selected.

---

## 2. The model routing strategy

### Model selection rules

The product routes every AI request to one of three model tiers based on need + cost.

| Tier | Model | Use cases | Cost (rough) |
|---|---|---|---|
| **Cheap** | gpt-4o-mini | Classifier, briefing generation, simple Q&A, quiz generation, embedding queries | $0.150/1M input, $0.600/1M output |
| **Standard** | gpt-4o | Complex Q&A requiring deep reasoning, multi-step problem walkthroughs, Photo Doubt Cam vision, mock test generation | $2.500/1M input, $10.000/1M output |
| **Embed** | text-embedding-3-small | All embeddings (questions, chunks, concepts, PYQs) | $0.020/1M tokens |
| **Voice** | gpt-4o + Whisper + TTS-1 | Voice tutor sessions | varies |

**Default for everything: gpt-4o-mini.** Use gpt-4o only when classification determines it's needed.

### Classification logic

```
Input request → Classifier (gpt-4o-mini)
  → returns { intent, domain, difficulty, needs_advanced: bool }

if needs_advanced AND user_tier in ['student', 'pro']:
  use gpt-4o
else:
  use gpt-4o-mini
```

`needs_advanced` is true when:
- Question requires multi-step reasoning (calculus, mechanics derivations)
- Question is JEE Advanced or NEET-level difficulty
- Image recognition required (Photo Doubt Cam → always gpt-4o-vision)
- Mock test generation with calibrated difficulty
- Photo handwriting interpretation

### Tier-based limits (cost control)

| Tier | Model usage |
|---|---|
| Free | gpt-4o-mini only. gpt-4o blocked with upgrade prompt. |
| Student (₹199) | gpt-4o-mini default. gpt-4o for up to 20 requests/day. |
| Pro (₹399) | gpt-4o-mini default. gpt-4o unlimited. Photo Vision unlimited. |
| Family / Institute | Pro limits per member. |

This is enforced at the model router level, not at the UI level. UI doesn't show "you've used 18/20 advanced today" — backend silently routes to gpt-4o-mini when limit hit, with a small inline note: "for richer answers, [upgrade]."

---

## 3. The semantic caching layer

### Why it matters
Same question asked 100 times → 100 AI calls = wasted money. Same question semantically similar to a cached answer = cache hit, near-zero cost.

### Implementation

**Cache key:** the embedding vector of the question (using text-embedding-3-small).

**Cache lookup:** before any AI call, embed the question, search cache table for embedding cosine distance < 0.04 (very tight match).

**Cache table:**
```sql
CREATE TABLE IF NOT EXISTS qa_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  question_embedding vector(1536) NOT NULL,
  answer TEXT NOT NULL,
  sources JSONB,
  domain TEXT,
  hit_count INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_hit_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX qa_cache_embedding_idx
  ON qa_cache USING ivfflat (question_embedding vector_cosine_ops)
  WITH (lists = 100);
```

**Hit handling:**
- Cache hit: serve cached answer (very fast)
- Increment `hit_count`, update `last_hit_at`
- Show "cached" indicator in logs (not to user)

**Cache eviction:**
- pg_cron job nightly: delete entries with `last_hit_at` older than 7 days AND `hit_count < 3`
- Frequently-hit entries (popular concepts) persist

### Cache scope

**Personal cache:** per-user cache for personalized queries (involves user's PDFs).

**Shared cache:** for generic conceptual questions ("what is Newton's 3rd law?") — can be shared across all users.

Distinguish at request time: if the question involves user-specific context (PDFs), use personal cache. If purely conceptual, use shared cache.

Heuristic: if classifier returns `intent = 'conceptual'` and no PDFs are required for answer, use shared cache.

### Expected cache hit rate
- Shared cache: 30-40% hit rate after 1000+ active users
- Personal cache: 8-15% hit rate per user (their own repeats)

Even 30% cache hit rate = 30% cost reduction. The mechanism pays for itself within weeks.

---

## 4. The RAG pipeline

### Pipeline stages

```
USER ASKS QUESTION
    │
    ▼
1. EMBED QUESTION (text-embedding-3-small)
    │
    ▼
2. VECTOR SEARCH user's document_chunks
    │   - WHERE user_id = current_user
    │   - ORDER BY embedding <=> question_embedding
    │   - LIMIT 5
    │
    ▼
3. RANK + RERANK
    │   - Apply mastery context (boost chunks from less-mastered concepts)
    │   - Apply recency context (recent uploads get slight boost)
    │
    ▼
4. ASSEMBLE PROMPT
    │   - System prompt (per domain)
    │   - User memory snippet (3-5 sentences of user context)
    │   - Retrieved chunks (top 5, formatted as sources)
    │   - User question
    │
    ▼
5. CALL MODEL (with streaming)
    │
    ▼
6. STREAM RESPONSE
    │   - Stream to client
    │   - In parallel: extract concepts mentioned
    │
    ▼
7. POST-PROCESS
    │   - Update mastery state for concepts touched
    │   - Log to learning_events
    │   - Cache the answer (if shareable)
```

### Vector search optimization

Use the existing `match_documents` RPC:
```sql
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  user_id_filter uuid
) RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
) AS $$
  SELECT
    dc.id,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  WHERE dc.user_id = user_id_filter
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$ LANGUAGE SQL STABLE;
```

For multi-PDF Q&A (asking across all PDFs), use the same function. The `WHERE user_id` filter handles isolation.

Typical thresholds:
- match_threshold: 0.7 (tight)
- match_count: 5 (enough for context, not too long)

### Mastery-aware reranking

After vector search, rerank by combining similarity + mastery:

```javascript
function rerank(chunks, conceptMastery) {
  return chunks.map(chunk => {
    const concepts = chunk.metadata.concepts || [];
    const avgMastery = average(concepts.map(c => conceptMastery[c] || 0.5));
    
    // Boost less-mastered chunks slightly (we want to help with weak areas)
    const masteryBoost = (1 - avgMastery) * 0.1;
    
    return {
      ...chunk,
      finalScore: chunk.similarity + masteryBoost
    };
  }).sort((a, b) => b.finalScore - a.finalScore);
}
```

This ensures the AI is biased toward addressing weak areas when context is ambiguous.

---

## 5. The classifier system

### The domain-aware classifier
Already exists in current product. Classifies into: Physics, Chemistry, Biology, Math, "Other". Adds subject-specific context to subsequent prompts.

### Enhancement for 90-day window

**Extend classification beyond domain:**

```typescript
interface QueryClassification {
  domain: 'physics' | 'chemistry' | 'biology' | 'math' | 'other';
  intent: 'conceptual' | 'problem_solving' | 'memorization' | 'meta';
  difficulty: 'foundation' | 'jee_main' | 'jee_advanced' | 'neet';
  needs_advanced: boolean;  // requires gpt-4o
  estimated_response_length: 'short' | 'medium' | 'long';
  topics_mentioned: string[];  // for concept linking
  is_followup: boolean;  // continues prior conversation
}
```

### Classifier prompt (gpt-4o-mini)

```
SYSTEM:
You classify study questions for a JEE/NEET tutoring system.

Output a JSON object with:
- domain: physics | chemistry | biology | math | other
- intent: conceptual | problem_solving | memorization | meta
- difficulty: foundation | jee_main | jee_advanced | neet
- needs_advanced: true if requires multi-step reasoning or advanced math
- estimated_response_length: short | medium | long
- topics_mentioned: list of specific topic names
- is_followup: true if "but...", "what if...", "then...", "wait..." continuation

Never include explanation. JSON only.

USER:
Question: {question}
Conversation history (last 3 messages): {history}

OUTPUT:
{json}
```

### Classifier caching

Same as Q&A caching. Embed the question, check cache. Classifications rarely change — cache aggressively.

### Cost
- gpt-4o-mini classifier call: ~$0.0001 per request
- Even at 100K requests/month: $10/month classifier cost. Negligible.

---

## 6. The prompt library

Centralized, versioned prompts for every AI use case.

### Prompt management

Store prompts in code, version-controlled. Single file: `lib/prompts.ts`.

Each prompt has:
- Name
- Version (semantic)
- Use case
- Template
- Parameters
- Expected output schema
- Cost estimate

When updating: bump version, A/B test new vs old, then promote.

### Core prompt: Domain-aware Q&A

```typescript
export const QA_PROMPT_V2 = {
  name: 'qa_domain_aware',
  version: '2.0.1',
  template: `
You are a tutor for a student preparing for {exam_type}.

Subject context: {domain}
Student's mastery in this topic area: {mastery_level} 
Student's recent struggles (if any): {recent_struggles}

You have access to the student's study materials. Use them.

Sources from student's PDFs:
{sources}

Conversation context:
{conversation_history}

Student's question: {question}

Rules:
- Answer the question first, in 1-2 sentences.
- Then explain the reasoning, structured: setup → key insight → application.
- Reference the source PDFs when relevant ("from your Allen DPP Chapter 5...")
- Use the student's exam vocabulary (JEE Main, AIR, etc.)
- If the question requires {difficulty} level analysis, go to that depth, not deeper.
- End with: "Want to practice this? [yes/no]" if the topic is exam-relevant.

Tone:
- Calm. Specific. Not over-encouraging.
- No exclamation marks.
- No emoji.
- Use Indian exam vocabulary.

Length: aim for {estimated_response_length}.
`,
  parameters: ['exam_type', 'domain', 'mastery_level', 'recent_struggles', 
               'sources', 'conversation_history', 'question', 'difficulty',
               'estimated_response_length'],
  costEstimate: 0.002  // ~$0.002 per response on average
};
```

### Core prompt: Socratic Coach Mode

For users in Socratic mode (Pro tier, voice tutor, Photo Doubt Cam):

```typescript
export const SOCRATIC_PROMPT_V1 = {
  name: 'socratic_coach',
  version: '1.0.0',
  template: `
You are a Socratic tutor for a JEE/NEET aspirant. You don't give answers directly.

Instead:
1. Ask the student what they think first.
2. If they're stuck, ask a leading question that narrows the path.
3. Reveal small hints, not full answers.
4. Acknowledge correct intuitions explicitly.
5. Only give the answer if the student explicitly asks (3+ tries) or if they're stuck.

Student question: {question}
Sources: {sources}
Student's prior context: {context}

Your first response should not contain the answer. It should be a question.
`,
  parameters: ['question', 'sources', 'context'],
  costEstimate: 0.003
};
```

### Briefing prompt

Already specified in `ELITE_FEATURE_ARCHITECTURE.md` F2.1. Reproduce as a versioned prompt.

### Quiz generation prompt

```typescript
export const QUIZ_GEN_PROMPT_V1 = {
  name: 'quiz_generator',
  version: '1.0.0',
  template: `
Generate {count} multiple-choice questions on {topic} for a student preparing for {exam_type}.

Difficulty distribution:
- 40% easy (recall, single-step)
- 50% medium (single-step application)
- 10% hard (multi-step, exam-realistic)

Format each question as JSON:
{
  "question": "...",
  "options": ["A", "B", "C", "D"],
  "correct_answer": "B",
  "explanation": "...",
  "difficulty": "easy|medium|hard",
  "concepts": ["concept1", "concept2"]
}

Use the student's study context:
{user_context}

Constraints:
- Questions must be specifically tagged to {exam_type} curriculum.
- Each question's explanation must be concrete, not generic.
- Avoid trick questions that don't test understanding.
- Mark each concept tested.

Output: JSON array of {count} questions.
`,
  parameters: ['count', 'topic', 'exam_type', 'user_context'],
  costEstimate: 0.005
};
```

### Photo Doubt Cam vision prompt

Specified in `ELITE_FEATURE_ARCHITECTURE.md` F2.5.

### Concept extraction prompt

Already exists. Extracts concept names from chunks of PDF text.

### Memory consolidation prompt

For user_memory updates — extracts learnings from a conversation:

```typescript
export const MEMORY_EXTRACT_V1 = {
  name: 'memory_extractor',
  version: '1.0.0',
  template: `
Extract 1-3 concise memory items from this conversation that might be useful in future tutoring sessions.

A good memory item is:
- Specific (not "the student is good at math")
- Useful for context in future questions
- Free of identifying info beyond first name

Examples of good memory items:
- "Confused friction force direction in inclined plane problems on March 14"
- "Asked about chirality in coordination compounds; understands the concept but got the visualization wrong"

Bad examples:
- "User asked about physics"  (too vague)
- "User's full address is..."  (privacy violation)

Conversation:
{conversation}

Output: JSON array of 1-3 memory items as strings.
`,
  parameters: ['conversation'],
  costEstimate: 0.001
};
```

---

## 7. The cost monitoring system

### What gets tracked

Every AI call is logged:
```sql
CREATE TABLE IF NOT EXISTS ai_call_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  call_type TEXT,  -- 'qa' | 'briefing' | 'quiz_gen' | 'classification' | etc
  model TEXT,  -- 'gpt-4o-mini' | 'gpt-4o' | 'text-embedding-3-small' | etc
  prompt_tokens INT,
  completion_tokens INT,
  total_cost_usd DECIMAL(10, 6),
  was_cached BOOLEAN DEFAULT FALSE,
  cache_source TEXT,  -- 'shared' | 'personal' | null
  duration_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ai_call_log_user_idx ON ai_call_log (user_id, created_at DESC);
CREATE INDEX ai_call_log_type_idx ON ai_call_log (call_type, created_at DESC);
```

### Daily cost dashboard

Internal-only dashboard. Read by founder weekly.

Key metrics:
- Total AI cost yesterday
- Cost per active user yesterday
- Cost per tier (Free / Student / Pro)
- Cache hit rate
- Model distribution (mini vs 4o)
- Most expensive call types

### Cost alerts
- If total daily cost exceeds $200, alert via email
- If a single user's daily cost exceeds $5, flag for review (potential abuse or runaway loop)
- If cache hit rate drops below 25%, investigate

### Per-user cost budget

Free tier hard cap: $0.05/day per user. Reached → graceful degradation:
- Q&A continues but only from cache
- No new generation
- "You've reached today's free limit. Comes back tomorrow, or [upgrade]."

This is NOT exposed to user except through the upgrade message. Internal limit enforces unit economics.

---

## 8. The voice tutor architecture

### Current pipeline (5-phase, already built)

```
1. User taps voice button → Audio recording starts
2. User speaks → Audio chunks streamed to backend
3. Whisper STT → transcription
4. Q&A pipeline → response generation (streaming text)
5. TTS-1 → audio response generated chunk-by-chunk
6. Streamed audio plays for user
```

### Cost analysis

Voice tutor is expensive:
- Whisper STT: $0.006/min audio
- gpt-4o: $0.0025/1K input + $0.01/1K output
- TTS-1: $0.015/1K chars

Typical 5-minute voice session: ~$0.20-0.40

This is why voice tutor is Pro-tier-only.

### Quality improvements (Sprint 3 if time)

**Interrupt handling:** If user starts speaking while TTS is playing, cut TTS, capture new input.

**Conversation memory:** Voice sessions accumulate in `conversations` table with `mode = 'voice'`. Future sessions reference history.

**Voice selection:** Currently single voice (`nova`). Sprint 3+ adds male voice (`onyx`) toggle.

**Hindi/Hinglish:** Out of scope for 90 days. Sprint 5+ adds Hindi via gpt-4o native multilingual + Hindi TTS.

### Voice tutor cost cap

Pro tier: unlimited but rate-limited to 30 min/day of voice (prevents accidental runaway sessions).
Student tier: 3 voice calls/day, 5 min each.
Free tier: 1 voice call/day, 3 min.

---

## 9. The streaming protocol

### Current state
Custom streaming protocol exists. Uses Server-Sent Events (SSE)-like format with custom prefixes:
- `__META__{...}` for source attribution
- `__CONV__{...}` for conversation IDs
- Raw text for content

### Improvements (Sprint 1)

**Add versioning:**
```
__VERSION__2.0
__META__{...}
[content stream]
__CONV__{...}
__DONE__
```

This allows clients to handle different versions gracefully.

**Add concept-extraction streaming:**
```
__VERSION__2.0
__META__{...}
[content with [concept-id] tags inline]
__CONCEPTS__{...}  // concept tags after content
__CONV__{...}
__DONE__
```

**Add error handling mid-stream:**
```
[partial content]
__ERROR__{ "message": "...", "retry": true }
```

Client recovers gracefully on `__ERROR__`.

### Library

Standardize streaming client at `lib/streaming.ts`. Parse the protocol. Emit events:
- `onMeta(meta)`
- `onContent(chunk)`
- `onConcepts(concepts)`
- `onConversationId(id)`
- `onError(err)`
- `onDone()`

---

## 10. The embedding economy

Embeddings are cheap but pervasive. They add up.

### Embedding usage

Each PDF chunk: 1 embedding.
Each user question: 1 embedding.
Each concept name: 1 embedding (for similarity matching across PDFs).
Each PYQ: 1 embedding.

### Cost
text-embedding-3-small: $0.020/1M tokens.

A 5-page PDF chunked into 50 chunks of 200 tokens = 10K tokens = $0.0002.

Even 10K PDFs uploaded = $2 in embeddings. Tiny.

### Reuse strategy

Embeddings are computed once and stored. Never re-embed unless content changes.

Update triggers:
- Document content changes (rare) → re-embed
- User edits a concept name (Sprint 4+) → re-embed concept
- Embedding model version upgrade → batch re-embed (planned event)

### pgvector index optimization

Use `ivfflat` with `lists = sqrt(rows)`. For 100K vectors, lists = 316. For 1M, lists = 1000.

Tune `probes` per query for accuracy/speed tradeoff:
- 1 probe: fast, ~85% accuracy
- 10 probes: slower, ~99% accuracy

Default: 10 probes for Q&A (accuracy matters), 1 probe for cache lookup (speed matters).

---

## 11. The AI safety + quality controls

### Hallucination management

LLMs hallucinate. Mitigations:

**Citation enforcement:** Q&A prompt explicitly requires sourcing from provided chunks. If no chunks match, AI says so honestly: "I don't have this in your study material. Based on general knowledge: [answer]."

**Confidence flagging:** AI is instructed to say "I'm not certain about [X]; check your textbook" when uncertainty is high.

**No make-up-facts mode:** Specifically for PYQ data, AI is NEVER allowed to fabricate PYQs. If a PYQ isn't in the database, AI says "I can't find that exact PYQ; here's a similar one from [year]."

### Content moderation

OpenAI's `moderations` endpoint checks user inputs:
- Hate speech
- Self-harm
- Sexual content
- Violence

Free for now (OpenAI provides). Block flagged inputs with: "I can't help with that. If you need support, here are some resources: [list]."

### Subject-out-of-scope handling

If user asks Spanish vocabulary in a JEE physics context:
- Classifier returns `domain: 'other'`
- Response: "I'm tuned for JEE/NEET subjects. For [topic], you might want a different tool — but let me try if you want."
- Don't refuse; just be honest.

### Safety for vulnerable users

If user expresses distress in tutoring chat ("I want to give up," "I can't take this anymore"):
- Classifier detects via sentiment
- Response includes resources: "It sounds like you're going through a lot. If you need to talk to someone: [Vandrevala Foundation, iCall, etc.]. Want to also take a break from studying for a bit?"
- Log for product team review (with privacy)

---

## 12. The personalization architecture

### Personalization sources

The AI personalizes by reading from these data sources at request time:

1. **`user_memory` table** — long-term consolidated learnings ("Priya confused friction direction in inclined plane on March 14")
2. **`mastery_state`** — concept-level mastery scores
3. **`learning_events` (recent 7 days)** — short-term context
4. **`profile`** — exam, year, study window, region
5. **`conversations`** — last 5 messages from current conversation

### Memory injection into prompts

Each Q&A request assembles a "personalization snippet":

```
SYSTEM CONTEXT:
You're tutoring Priya, a Class 11 student preparing for JEE Main 2027.
Today is day 247 of her preparation.
Recent struggles: friction in inclined planes, rotational dynamics setup, organic chemistry SN1 vs SN2.
Current mastery in Mechanics: 73% (strong); Modern Physics: 41% (shaky).
She studies best between 7-9pm. Today is a Tuesday.
Her cohort: JEE 2027 Bangalore (8,234 members).

[End of personalization context. Use this naturally — don't recite it.]
```

The "don't recite it" instruction prevents the AI from awkwardly listing facts about the user.

### Memory consolidation (background)

After each conversation closes, a background job:
1. Calls Memory Extractor prompt
2. Inserts 1-3 memory items into `user_memory` table
3. Updates `user_memory_weight` (increments weights for repeating themes)

Old memories (>180 days, weight < 0.5) are archived.

### Privacy

User can:
- View their memory items at any time (Settings → My Memory)
- Delete specific items
- Reset all memory

The memory is theirs. Never shared, never sold.

---

## 13. The AI cost ceiling

### Per-user monthly cost targets

| Tier | Revenue | Target AI cost | Margin |
|---|---|---|---|
| Free | ₹0 | ≤ ₹30 | -₹30 (acquisition cost) |
| Student ₹199 | ₹199 | ≤ ₹40 | ₹159 (80% margin) |
| Pro ₹399 | ₹399 | ≤ ₹100 | ₹299 (75% margin) |

These targets assume disciplined model routing + ≥30% cache hit rate.

### What blows up the ceiling

Things to avoid:
- Free tier users running thousands of unlimited mini queries (abuse) → daily cost cap
- Photo Doubt Cam in free tier (vision is expensive) → free limit 3/day
- Voice tutor in free tier → 1 short call/day max
- Mock test generation as a background task without user request → not implemented (only on-demand)
- "Generate 1000 questions for this chapter" runaway loops → cap at 50 per request

### What protects the ceiling

- Aggressive caching (target: 30%+ shared cache hit)
- Model routing (gpt-4o-mini default everywhere)
- Tier-based gating (gpt-4o for paying users)
- Per-user daily cost cap (Free: $0.05, Student: $0.50, Pro: $2.00)
- Background generation only when truly needed

---

## 14. The Sprint 1 / 2 / 3 AI build order

### Sprint 1 (Weeks 1-4)
- AI call logging table + insertion in all existing call sites
- Cost monitoring dashboard (internal)
- Streaming protocol versioning
- Classifier enhancement (intent + difficulty + needs_advanced)
- Model routing layer
- Tier-based gating

### Sprint 2 (Weeks 5-8)
- Briefing generation pipeline (gpt-4o-mini + TTS)
- Photo Doubt Cam (gpt-4o vision)
- Semantic cache scaling
- Memory consolidation job
- Personalization injection in Q&A prompts

### Sprint 3 (Weeks 9-12)
- Mock test question generation (gpt-4o)
- PYQ embedding pipeline
- PYQ AI search (natural language → filtered PYQs)
- FSRS-based card difficulty calibration via AI

### Deferred to Sprint 4+
- Hindi/Hinglish support
- Voice tutor enhancements (interrupt handling, voice options)
- Lecture transcript processing
- Custom fine-tuned models (likely never necessary)
- Multi-modal mock simulator (audio + visual)

---

## 15. The non-negotiable AI rules

1. **No AI call without classification.** Every request passes through the router.
2. **gpt-4o-mini is the default.** gpt-4o is the exception, justified per request.
3. **Cache before you call.** Embedding lookup is mandatory before any expensive AI call.
4. **Cost log every call.** No exceptions. Untracked AI is broken AI.
5. **Personalization > generic, always.** When in doubt, inject memory.
6. **Cite sources or admit absence.** AI never makes up facts about user's PDFs.
7. **Sensitive content → resources, not refusal.** Distress signals trigger support resources.
8. **Honest about uncertainty.** "I'm not certain about X" is better than fabricated confidence.
9. **Indian exam context, always.** Vocabulary, references, exam patterns — native, not translated.
10. **No user data in prompts beyond what's necessary.** Privacy first.

---

## 16. The bottom line

The AI architecture for Ask-My-Notes is not about building bigger models or fancier features. It's about discipline: routing requests to the cheapest model that suffices, caching aggressively, tracking every penny, and using personalization to make the AI feel like *the student's tutor* rather than a generic chatbot.

A competitor with a bigger budget but less discipline will burn money. Ask-My-Notes runs lean and accumulates the longitudinal personalization data that becomes the moat.

---

*Next: `TECHNICAL_ARCHITECTURE.md` for backend, database, personalization, and analytics architecture in one consolidated doc.*
