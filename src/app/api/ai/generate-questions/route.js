import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MOCK_QUESTIONS = [
  { id: 'q1', text: 'Explain the Carnot Cycle and why no real engine can achieve 100% efficiency.', marks: 10, hints: ['Define Carnot Cycle (3M)', 'Explain max efficiency (4M)', 'Compare to real engines (3M)'], sourceSnippet: 'The Carnot Cycle is the most efficient theoretical heat engine — Ch.3, p.42' },
  { id: 'q2', text: 'What is entropy and how does it relate to the second law of thermodynamics?', marks: 10, hints: ['Define entropy (3M)', 'State second law (2M)', 'Provide example (5M)'], sourceSnippet: 'Entropy measures disorder in a system — Ch.4, p.51' },
  { id: 'q3', text: 'Describe the differences between isothermal and adiabatic processes.', marks: 5, hints: ['Define isothermal (2M)', 'Define adiabatic (3M)'], sourceSnippet: 'In an isothermal process, temperature remains constant — Ch.2, p.28' },
];

export async function POST(request) {
  try {
    const { topicId, count = 12, marks = [5, 10, 20] } = await request.json();

    let topicName = 'Physics';
    if (topicId) {
      const { data: doc } = await supabase.from('documents').select('name').eq('id', topicId).single();
      if (doc?.name) topicName = doc.name;
    }

    const prompt = `Generate ${count} university exam-style long-answer physics questions on: "${topicName}".

Mark distribution to use: ${marks.join(', ')} marks. Vary the distribution across questions.

For each question return:
- text: clear, specific question
- marks: integer (one of ${marks.join(', ')})
- hints: array of 2-5 strings showing answer SHAPE not content (e.g. "Define X (2M)", "Explain mechanism (4M)")
- sourceSnippet: short excerpt (max 120 chars) simulating a student note, with "— Ch.N, p.N" attribution

Return ONLY a JSON array. No markdown, no explanation, no code fences.`;

    const msg = await anthropic.messages.create({
      model: 'claude-opus-4-1',
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = msg.content[0]?.type === 'text' ? msg.content[0].text.trim() : '[]';
    const questions = JSON.parse(raw);
    const withIds = questions.map((q, i) => ({ ...q, id: `q-${Date.now()}-${i}` }));
    return Response.json({ questions: withIds });
  } catch (error) {
    console.error('[generate-questions]', error);
    return Response.json({ questions: MOCK_QUESTIONS });
  }
}
