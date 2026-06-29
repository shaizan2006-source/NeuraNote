import { verifyAuth, supabaseAdmin as supabase } from '@/lib/serverAuth';

export async function GET(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';

    let dbQuery = supabase
      .from('documents')
      .select('id, name, category, updated_at')
      .eq('user_id', user.id)  // scope to authenticated user's documents only
      .order('updated_at', { ascending: false })
      .limit(20);

    if (query.trim()) {
      dbQuery = dbQuery.ilike('name', `%${query.trim()}%`);
    }

    const { data: docs, error } = await dbQuery;
    if (error) throw error;

    const topics = (docs || []).map((doc) => ({
      id: doc.id,
      name: doc.name,
      category: doc.category || 'Other',
      icon: '📄',
      updatedAt: doc.updated_at,
    }));

    return Response.json({ topics });
  } catch (error) {
    console.error('[search-topics]', error);
    return Response.json({ topics: [], error: String(error.message) }, { status: 500 });
  }
}
