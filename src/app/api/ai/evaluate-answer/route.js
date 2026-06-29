// src/app/api/ai/evaluate-answer/route.js
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { verifyAuth } from '@/lib/serverAuth';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 2, timeout: 45_000 });

export async function POST(req) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let safeMarks = 10;
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
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

    // Fix 3: Validate totalMarks range
    safeMarks = Math.max(1, Math.min(100, Number(totalMarks) || 10));

    // Fix 2: Cap question length and sanitize hints before prompt
    const safeQuestion = question.slice(0, 1000);
    const safeHints = hints
      .filter((h) => typeof h === 'string')
      .slice(0, 10)
      .map((h) => h.slice(0, 200));

    const prompt = `You are a university exam evaluator. Grade this student answer strictly and fairly.

Question: ${safeQuestion}

Expected answer structure (hints):
${safeHints.map((h, i) => `${i + 1}. ${h}`).join('\n') || 'No hints provided.'}

Total marks: ${safeMarks}

Student answer:
"""
${answer.trim().slice(0, 3000)}
"""

Evaluate the student answer and return ONLY a JSON object with:
- marksEarned: integer (0 to ${safeMarks})
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
    // Fix 1: Wrap JSON.parse in its own try/catch
    let result;
    try {
      result = JSON.parse(raw);
    } catch (_) {
      return NextResponse.json({
        marksEarned: 0,
        totalMarks: safeMarks,
        feedback: 'Could not parse evaluation. Please try again.',
        explanation: '',
      });
    }

    return NextResponse.json({
      marksEarned: Math.max(0, Math.min(safeMarks, Number(result.marksEarned) || 0)),
      totalMarks: safeMarks,
      feedback: String(result.feedback || 'Evaluation complete.').slice(0, 600),
      explanation: String(result.explanation || '').slice(0, 300),
    });
  } catch (err) {
    console.error('[evaluate-answer]', err);
    // Fix 4: Use safeMarks in error catch block
    return NextResponse.json(
      { marksEarned: 0, totalMarks: safeMarks, feedback: 'Evaluation failed — please try again.', explanation: '' },
      { status: 500 }
    );
  }
}
