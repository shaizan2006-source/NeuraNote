import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateFocusPlan, ENHANCED_FALLBACK_TASKS } from '@/lib/focusPlanner';
import { parsePdfDocument } from '@/lib/parsePdfDocument';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    // ── Auth ────────────────────────────────────────────────────────
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // ── Parse body ──────────────────────────────────────────────────
    const { documentId } = await req.json();
    if (!documentId) return NextResponse.json({ error: 'documentId required' }, { status: 400 });

    // ── Verify ownership ────────────────────────────────────────────
    const { data: doc, error: docErr } = await supabase
      .from('documents')
      .select('id, name')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (docErr || !doc) return NextResponse.json({ error: 'pdf_not_found' }, { status: 404 });

    // ── Fetch or trigger parse ──────────────────────────────────────
    let { data: chunks, error: chunkErr } = await supabase
      .from('document_chunks')
      .select('content')
      .eq('document_id', documentId)
      .order('page_number', { ascending: true });

    if (chunkErr || !chunks || chunks.length === 0) {
      // Trigger parse directly (no HTTP loopback — avoids Vercel timeout cascade)
      await parsePdfDocument(documentId, user.id);

      const refetch = await supabase
        .from('document_chunks')
        .select('content')
        .eq('document_id', documentId)
        .order('page_number', { ascending: true });

      chunks = refetch.data;

      if (!chunks || chunks.length === 0) {
        return NextResponse.json(
          { error: 'pdf_empty', message: 'This PDF has no readable text.' },
          { status: 422 }
        );
      }
    }

    // ── Generate plan (two-pass with full fallback chain) ───────────
    const chunkTexts = chunks.map(c => c.content);
    const { tasks, totalMinutes, blueprint } = await generateFocusPlan(chunkTexts, doc.name);

    return NextResponse.json({
      success: true,
      tasks,
      totalMinutes,
      documentId: doc.id,
      documentName: doc.name,
      blueprint: blueprint ?? null,
    });
  } catch (err) {
    console.error('[generate-focus-tasks]', err);
    // Even a total crash returns usable fallback data
    return NextResponse.json({
      success: true,
      tasks: ENHANCED_FALLBACK_TASKS,
      totalMinutes: ENHANCED_FALLBACK_TASKS.reduce((s, t) => s + t.estimatedMinutes, 0),
      documentId: null,
      documentName: null,
      blueprint: null,
    });
  }
}
