import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function POST(request) {
  try {
    const { question, answer, hints = [], totalMarks } = await request.json();

    if (!question || !answer) {
      return Response.json({ error: 'question and answer are required' }, { status: 400 });
    }

    const prompt = `You are a strict but fair university physics exam evaluator.

Question (${totalMarks} marks total):
"${question}"

Expected answer structure:
${hints.map((h) => `- ${h}`).join('\n') || '(No structure hints provided)'}

Student answer:
"${answer}"

Evaluate and return ONLY valid JSON (no markdown, no code fences):
{
  "marksEarned": <integer 0-${totalMarks}>,
  "feedback": "<2-3 sentences: what was good, what was missing, how to improve>",
  "keyMisses": ["<key point student missed 1>", "..."]
}

Award marks for each hint point addressed. Be fair but rigorous.`;

    const msg = await anthropic.messages.create({
      model: 'claude-opus-4-1',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = msg.content[0]?.type === 'text' ? msg.content[0].text.trim() : '{}';
    const result = JSON.parse(raw);

    return Response.json({
      marksEarned: Math.min(Math.max(0, result.marksEarned ?? 0), totalMarks),
      totalMarks,
      feedback: result.feedback || 'No feedback available.',
      keyMisses: result.keyMisses || [],
    });
  } catch (error) {
    console.error('[evaluate-answer]', error);
    const { totalMarks = 10 } = await request.json().catch(() => ({}));
    return Response.json({
      marksEarned: 0,
      totalMarks,
      feedback: 'Evaluation service temporarily unavailable. Please try again.',
      keyMisses: [],
    });
  }
}
