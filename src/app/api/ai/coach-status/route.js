import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return Response.json({
        strong: 'Mechanics',
        needsWork: 'Thermodynamics',
        recommendedMode: 'explain',
      });
    }

    const { data: masteryData, error } = await supabase
      .from('mastery_state')
      .select('concept_id, strength, confidence')
      .eq('user_id', userId)
      .order('strength', { ascending: false })
      .limit(5);

    if (error) throw error;

    if (masteryData && masteryData.length >= 2) {
      const topIds = masteryData.map((m) => m.concept_id);
      const { data: concepts } = await supabase
        .from('concepts')
        .select('id, content')
        .in('id', topIds);

      if (concepts && concepts.length >= 2) {
        return Response.json({
          strong: String(concepts[0]?.content || '').slice(0, 50) || 'Mechanics',
          needsWork: String(concepts[concepts.length - 1]?.content || '').slice(0, 50) || 'Thermodynamics',
          recommendedMode: 'explain',
        });
      }
    }

    return Response.json({
      strong: 'Mechanics',
      needsWork: 'Thermodynamics',
      recommendedMode: 'explain',
    });
  } catch (error) {
    console.error('[coach-status]', error);
    return Response.json({ strong: 'Mechanics', needsWork: 'Thermodynamics', recommendedMode: 'explain' });
  }
}
