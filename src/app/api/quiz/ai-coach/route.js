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

    const safeDocumentName = String(documentName)
      .replace(/[\n\r]/g, ' ')
      .trim()
      .slice(0, 100) || 'your study material';

    const {
      wrongAnswers = [],
      skippedQuestions = [],
      timePerQuestion = { avg: 0, slowest: null },
      weakConcepts = {},
      currentQuestionIndex = 0,
      totalQuestions = 12,
    } = signals;

    const safeWeakConcepts = (weakConcepts && typeof weakConcepts === 'object' && !Array.isArray(weakConcepts))
      ? weakConcepts
      : {};

    // If no wrong answers yet, return null (coach stays silent)
    if (wrongAnswers.length === 0 && skippedQuestions.length === 0) {
      return NextResponse.json({ suggestion: null });
    }

    const repeatedWeakAreas = Object.entries(safeWeakConcepts)
      .filter(([, count]) => count > 1)
      .map(([concept, count]) => `${concept} (${count} errors)`)
      .join(', ');

    const wrongSummary = wrongAnswers
      .slice(-3)
      .filter((w) => w && typeof w === 'object')
      .map((w) => {
        const topic = String(w.topic || 'Unknown topic').replace(/[\n\r]/g, ' ').slice(0, 100);
        return `- "${topic}": scored ${Number(w.marksEarned) || 0}/${Number(w.totalMarks) || 0}`;
      })
      .join('\n');

    const skippedSummary = skippedQuestions.length > 0
      ? skippedQuestions
          .filter((s) => s && typeof s === 'object')
          .map((s) => `- "${String(s.topic || 'Unknown').replace(/[\n\r]/g, ' ').slice(0, 100)}"`)
          .join('\n')
      : 'None';

    const systemPrompt = `You are an adaptive AI Study Coach observing a student taking a quiz on ${safeDocumentName}.

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
