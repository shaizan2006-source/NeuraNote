import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";

export async function GET(req) {
  const user = await verifyAuth(req);
  if (!user) return new Response(null, { status: 401 });

  const { searchParams } = new URL(req.url);
  const minMastery = parseFloat(searchParams.get("min_mastery") ?? "0");
  // NOTE: the real `concepts` table has no `subject` column, so the legacy `subject` filter
  // is not applicable to the live schema (kept the param for compatibility; it's a no-op).

  // Real concept-graph source. The previous wiring read `concept_nodes`, which nothing ever
  // populates (orphan) -> empty for every user. The live graph lives in `concepts` (nodes) +
  // `mastery_state` (per-concept strength) + `concept_edges` (relationships).
  const { data: concepts, error: cErr } = await supabaseAdmin
    .from("concepts")
    .select("id, title, type, document_id")
    .eq("user_id", user.id)
    .limit(500);

  if (cErr) {
    console.error("[brain-map] concepts error:", cErr.message);
    return Response.json({ nodes: [], edges: [], stats: {} });
  }
  if (!concepts || concepts.length === 0) {
    return Response.json({ nodes: [], edges: [], stats: { total: 0, mastered: 0, strong: 0, shaky: 0, unknown: 0 } });
  }

  // Mastery strength (0–1) per concept, keyed by concept_id.
  const { data: mastery } = await supabaseAdmin
    .from("mastery_state")
    .select("concept_id, strength")
    .eq("user_id", user.id);
  const strengthByConcept = new Map((mastery ?? []).map((m) => [m.concept_id, m.strength ?? 0]));

  let nodes = concepts.map((c) => ({
    id: c.id,
    label: c.title,
    subject: null,
    mastery_score: strengthByConcept.get(c.id) ?? 0,
    type: c.type,
    doc_ids: [c.document_id].filter(Boolean),
    x: null,
    y: null,
  }));
  if (minMastery > 0) nodes = nodes.filter((n) => n.mastery_score >= minMastery);

  // Edges among the visible concepts.
  const nodeIds = nodes.map((n) => n.id);
  const { data: edges } = nodeIds.length
    ? await supabaseAdmin
        .from("concept_edges")
        .select("from_id, to_id, kind, strength")
        .in("from_id", nodeIds)
        .in("to_id", nodeIds)
    : { data: [] };

  const stats = {
    total: nodes.length,
    mastered: nodes.filter((n) => n.mastery_score >= 0.8).length,
    strong: nodes.filter((n) => n.mastery_score >= 0.6 && n.mastery_score < 0.8).length,
    shaky: nodes.filter((n) => n.mastery_score >= 0.3 && n.mastery_score < 0.6).length,
    unknown: nodes.filter((n) => n.mastery_score < 0.3).length,
  };

  return Response.json({
    nodes,
    edges: (edges ?? []).map((e) => ({ from: e.from_id, to: e.to_id, kind: e.kind, strength: e.strength })),
    stats,
  });
}
