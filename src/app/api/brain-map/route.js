import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";

export async function GET(req) {
  const user = await verifyAuth(req);
  if (!user) return new Response(null, { status: 401 });

  const { searchParams } = new URL(req.url);
  const subject = searchParams.get("subject");
  const minMastery = parseFloat(searchParams.get("min_mastery") ?? "0");

  // Fetch all concept_nodes for this user (cross-document)
  let nodesQuery = supabaseAdmin
    .from("concept_nodes")
    .select("id, label, type, subject, mastery_score, doc_id, x, y")
    .eq("user_id", user.id);

  if (subject) nodesQuery = nodesQuery.eq("subject", subject);
  if (minMastery > 0) nodesQuery = nodesQuery.gte("mastery_score", minMastery);

  const { data: nodes, error: nodesErr } = await nodesQuery.limit(500);
  if (nodesErr) {
    console.error("[brain-map] nodes error:", nodesErr.message);
    return Response.json({ nodes: [], edges: [], stats: {} });
  }

  if (!nodes || nodes.length === 0) {
    return Response.json({ nodes: [], edges: [], stats: { total: 0, mastered: 0, strong: 0, shaky: 0, unknown: 0 } });
  }

  const nodeIds = nodes.map((n) => n.id);

  // Fetch edges between these nodes
  const { data: edges } = await supabaseAdmin
    .from("concept_edges")
    .select("from_id, to_id, kind, strength")
    .in("from_id", nodeIds)
    .in("to_id", nodeIds);

  // Stats
  const stats = {
    total: nodes.length,
    mastered: nodes.filter((n) => (n.mastery_score ?? 0) >= 0.8).length,
    strong: nodes.filter((n) => (n.mastery_score ?? 0) >= 0.6 && (n.mastery_score ?? 0) < 0.8).length,
    shaky: nodes.filter((n) => (n.mastery_score ?? 0) >= 0.3 && (n.mastery_score ?? 0) < 0.6).length,
    unknown: nodes.filter((n) => (n.mastery_score ?? 0) < 0.3).length,
  };

  return Response.json({
    nodes: nodes.map((n) => ({
      id: n.id,
      label: n.label,
      subject: n.subject,
      mastery_score: n.mastery_score ?? 0,
      type: n.type,
      doc_ids: [n.doc_id].filter(Boolean),
      x: n.x,
      y: n.y,
    })),
    edges: (edges ?? []).map((e) => ({
      from: e.from_id,
      to: e.to_id,
      kind: e.kind,
      strength: e.strength,
    })),
    stats,
  });
}
