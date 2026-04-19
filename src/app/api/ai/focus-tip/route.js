const TIPS = [
  'Focus on the big picture first — details come later.',
  'Try summarizing each concept in your own words after reading.',
  'Take notes as you study — it significantly improves retention.',
  'Break down complex problems into smaller manageable steps.',
  "You're making real progress. Keep going!",
  'Use active recall: close your notes and write what you remember.',
  'A 2-minute review at the end of each topic locks it in long-term.',
];

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const indexHint = parseInt(searchParams.get('index') || '0', 10);
  const tip = TIPS[indexHint % TIPS.length];
  return Response.json({ tip, nextIndex: (indexHint + 1) % TIPS.length });
}
