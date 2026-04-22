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
