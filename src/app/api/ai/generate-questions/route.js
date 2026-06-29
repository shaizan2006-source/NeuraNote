// src/app/api/ai/generate-questions/route.js
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { verifyAuth } from '@/lib/serverAuth';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 2, timeout: 45_000 });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── helpers ────────────────────────────────────────────────────────────────

function stripFences(str) {
  return str.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

function sanitizeQuestion(q) {
  return {
    id: `q-${crypto.randomUUID()}`,
    text: String(q.text || '').replace(/<[^>]*>/g, '').trim().slice(0, 1000),
    marks: Math.max(1, Math.min(100, Number(q.marks) || 5)),
    hints: Array.isArray(q.hints) ? q.hints.map((h) => String(h).slice(0, 200)).slice(0, 6) : [],
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

// pgvector returns embeddings as "[0.1,0.2,...]" strings in some Supabase configs
function parseEmbedding(e) {
  if (!e) return null;
  if (Array.isArray(e)) return e;
  if (typeof e === 'string') {
    try { return JSON.parse(e); } catch { return null; }
  }
  return null;
}

function buildWorkerPrompt(chunks, marks, n) {
  const context = chunks
    .map((c) => `[Page ${c.page_number || '?'}] ${c.content.slice(0, 700)}`)
    .join('\n\n');
  return `Generate ${n} university exam questions from the document excerpt below.
Return ONLY a JSON array — no markdown, no explanation.
Each element must be: {"text":"...","marks":N,"hints":["hint1","hint2","hint3"],"sourceSnippet":"VERBATIM_QUOTE","documentReference":"Page N"}
- marks must be chosen from [${marks.join(', ')}]
- sourceSnippet must be an exact verbatim quote (20-80 words) from the document
- Every question must be fully answerable from the document

<document>
${context}
</document>`;
}

// ── main handler ───────────────────────────────────────────────────────────
export async function POST(request) {
  const authUser = await verifyAuth(request);
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // ── Layer 1: Input Validation ──────────────────────────────────────────
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    const { documentId, count = 12, marks = [5, 10, 20] } = body;
    // Always use authenticated user — never trust userId from body
    const userId = authUser.id;

    if (!documentId || typeof documentId !== 'string')
      return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
    if (!userId || typeof userId !== 'string')
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    if (!Number.isInteger(count) || count < 5 || count > 50)
      return NextResponse.json({ error: 'count must be 5–50' }, { status: 400 });
    if (!Array.isArray(marks) || marks.some((m) => !Number.isInteger(m) || m < 1 || m > 100))
      return NextResponse.json({ error: 'Invalid marks array' }, { status: 400 });

    // ── Layer 2: Auth + Chunks in parallel ────────────────────────────────
    // Fetch stored embeddings from DB — already computed by parse-pdf, no recompute needed
    const [{ data: doc, error: docError }, { data: chunkRows, error: chunkError }] = await Promise.all([
      supabase.from('documents').select('id, name, user_id').eq('id', documentId).single(),
      supabase
        .from('document_chunks')
        .select('content, page_number, embedding')
        .eq('document_id', documentId)
        .limit(80),
    ]);

    if (docError || !doc) return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
    if (doc.user_id !== userId) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    let chunks = chunkRows ?? [];

    // ── Lazy parse if no chunks ────────────────────────────────────────────
    if (chunks.length === 0) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      try {
        const parseRes = await fetch(`${appUrl}/api/parse-pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId, userId }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!parseRes.ok) {
          return NextResponse.json({ error: 'PDF could not be processed. Please try again.' }, { status: 422 });
        }
        const refetch = await supabase
          .from('document_chunks')
          .select('content, page_number, embedding')
          .eq('document_id', documentId)
          .limit(80);
        if (!refetch.data?.length) {
          return NextResponse.json({ error: 'PDF has no readable content.' }, { status: 422 });
        }
        chunks = refetch.data;
      } catch {
        clearTimeout(timeout);
        return NextResponse.json({ error: 'PDF processing took too long. Try a smaller file.' }, { status: 422 });
      }
    }

    // ── Layer 3: Parallel Question Generation ─────────────────────────────
    // Split chunks into WORKERS groups → parallel LLM calls → merge results
    // Generate 1.4× count so filtering still yields enough questions
    const WORKERS = Math.min(4, chunks.length);
    const TARGET = Math.ceil(count * 1.4);
    const perWorker = Math.ceil(TARGET / WORKERS);
    const chunkSize = Math.ceil(chunks.length / WORKERS);

    const workerPromises = Array.from({ length: WORKERS }, (_, i) => {
      const slice = chunks.slice(i * chunkSize, (i + 1) * chunkSize);
      if (slice.length === 0) return Promise.resolve([]);
      const prompt = buildWorkerPrompt(slice, marks, perWorker);
      return openai.chat.completions
        .create({
          model: 'gpt-4o-mini',
          max_tokens: 2500,
          temperature: 0.4,
          messages: [{ role: 'user', content: prompt }],
        })
        .then((res) => {
          try {
            const raw = res.choices[0]?.message?.content?.trim() ?? '[]';
            const parsed = JSON.parse(stripFences(raw));
            return Array.isArray(parsed)
              ? parsed.filter((q) => q?.text?.trim().length > 10).map(sanitizeQuestion)
              : [];
          } catch {
            return [];
          }
        })
        .catch(() => []);
    });

    const generated = (await Promise.all(workerPromises)).flat();
    if (generated.length === 0) {
      return NextResponse.json({ error: 'Could not generate questions from this PDF.' }, { status: 422 });
    }

    // ── Layer 4: Embed questions + reuse stored chunk embeddings ──────────
    // Only question texts need new embeddings; chunk embeddings come from DB
    const storedChunkEmbs = chunks.map((c) => parseEmbedding(c.embedding)).filter(Boolean);

    const qEmbRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: generated.map((q) => q.text),
    });
    const qEmbs = qEmbRes.data.map((d) => d.embedding);

    // ── Layer 5: Local Validation (no extra LLM calls) ────────────────────
    const allChunkText = chunks.map((c) => c.content.toLowerCase()).join(' ');

    const valid = generated.filter((q, i) => {
      // Semantic similarity against stored chunk embeddings
      if (storedChunkEmbs.length > 0) {
        const maxSim = storedChunkEmbs.reduce(
          (best, cEmb) => Math.max(best, cosineSimilarity(qEmbs[i], cEmb)),
          -Infinity
        );
        if (maxSim < 0.55) return false;
      }

      // Source snippet word-match check
      if (!q.sourceSnippet || q.sourceSnippet.length < 10) return false;
      const words = q.sourceSnippet.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      if (words.length === 0) return false;
      const matchedRatio = words.filter((w) => allChunkText.includes(w)).length / words.length;
      return matchedRatio >= 0.70;
    });

    const minRequired = Math.ceil(count * 0.7);
    if (valid.length < minRequired) {
      console.error(`[generate-questions] Only ${valid.length}/${count} questions passed validation (need ${minRequired})`);
      return NextResponse.json(
        {
          error: 'Could not generate enough valid questions from this PDF.',
          reason: 'PDF content quality too low. Try a document with more academic text.',
        },
        { status: 422 }
      );
    }

    const finalQuestions = valid.slice(0, count);

    return NextResponse.json({
      success: true,
      questions: finalQuestions,
      sourceDocument: { id: documentId, name: doc.name },
      qualityMode: 'parallel',
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[generate-questions]', err);
    return NextResponse.json({ error: 'Question generation failed', detail: err.message }, { status: 500 });
  }
}
