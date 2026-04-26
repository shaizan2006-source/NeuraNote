"use client";

/**
 * /dev/graph/[docId] — internal debug viewer for the concept graph.
 *
 * NOT user-facing. Phase 0 tool only — the real Brain Map is Phase 3.
 * Purpose: verify extraction quality at a glance (are concepts sensible?
 * are edges grounded?) without writing one-off SQL each time.
 *
 * Layout: a dagre-less radial-ish auto-layout done inline. For a proper
 * product viewer we'd swap in elkjs or dagre — for debug, deterministic
 * grid placement by type is enough.
 */

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
} from "reactflow";
import "reactflow/dist/style.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

// ── Type → color map (mirrors the concept.type enum) ──────────────────────
const TYPE_COLOR = {
  definition: "#8B5CF6",
  theorem:    "#22D3EE",
  procedure:  "#F59E0B",
  formula:    "#10B981",
  argument:   "#EF4444",
  case:       "#EC4899",
};

const EDGE_COLOR = {
  prerequisite_of: "#8B5CF6",
  related_to:      "rgba(255,255,255,0.35)",
  specializes:     "#22D3EE",
};

export default function DebugGraphPage() {
  const { docId } = useParams();
  const [state, setState] = useState({ status: "loading", data: null, error: null });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess?.session?.access_token;
        if (!token) {
          if (!cancelled) setState({ status: "error", data: null, error: "Not signed in" });
          return;
        }

        const res = await fetch(`/api/graph/${docId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();

        if (!res.ok) throw new Error(json.error || "Failed to load graph");
        if (!cancelled) setState({ status: "ready", data: json, error: null });
      } catch (err) {
        if (!cancelled) setState({ status: "error", data: null, error: err.message });
      }
    })();

    return () => { cancelled = true; };
  }, [docId]);

  const { nodes, edges } = useMemo(() => {
    if (state.status !== "ready") return { nodes: [], edges: [] };
    return toFlow(state.data);
  }, [state]);

  if (state.status === "loading") {
    return <Shell><p style={{ color: "#888" }}>Loading graph…</p></Shell>;
  }
  if (state.status === "error") {
    return <Shell><p style={{ color: "#EF4444" }}>Error: {state.error}</p></Shell>;
  }

  const { document, concepts, edges: edgeData } = state.data;

  return (
    <div style={{ height: "100vh", background: "#0A0A0A", color: "#fff", display: "flex", flexDirection: "column" }}>
      <header style={{
        padding: "12px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        gap: 24,
        alignItems: "center",
        fontFamily: "Inter, sans-serif",
        fontSize: 13,
      }}>
        <span style={{ fontWeight: 600 }}>DEBUG · {document?.name ?? docId}</span>
        <span style={{ color: "#888" }}>status: <StatusPill s={document?.concept_extraction_status} /></span>
        <span style={{ color: "#888" }}>concepts: {concepts.length}</span>
        <span style={{ color: "#888" }}>edges: {edgeData.length}</span>
        {document?.concept_extraction_error && (
          <span style={{ color: "#EF4444" }}>err: {document.concept_extraction_error}</span>
        )}
      </header>

      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#222" gap={24} />
          <Controls style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }} />
          <MiniMap
            nodeColor={(n) => n.style?.background ?? "#333"}
            maskColor="rgba(0,0,0,0.6)"
            style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.08)" }}
          />
        </ReactFlow>
      </div>

      <Legend />
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────

function toFlow({ concepts, edges }) {
  // Group concepts by type so similar nodes cluster (debugging ergonomics).
  const byType = new Map();
  for (const c of concepts) {
    if (!byType.has(c.type)) byType.set(c.type, []);
    byType.get(c.type).push(c);
  }

  const COL_W = 260;
  const ROW_H = 100;
  const types = Array.from(byType.keys());

  const flowNodes = [];
  types.forEach((t, colIdx) => {
    const list = byType.get(t);
    list.forEach((c, rowIdx) => {
      flowNodes.push({
        id: c.id,
        data: { label: <NodeLabel c={c} /> },
        position: { x: colIdx * COL_W, y: rowIdx * ROW_H },
        style: {
          background: TYPE_COLOR[c.type] ?? "#444",
          color: "#fff",
          border: "none",
          borderRadius: 10,
          padding: 10,
          fontSize: 12,
          width: 220,
          fontFamily: "Inter, sans-serif",
        },
      });
    });
  });

  const flowEdges = edges.map((e, i) => ({
    id: `e${i}`,
    source: e.from_id,
    target: e.to_id,
    label: e.kind.replace("_", " "),
    style: {
      stroke: EDGE_COLOR[e.kind] ?? "#666",
      strokeWidth: 1 + (e.strength ?? 0.5) * 2,
    },
    labelStyle: { fill: "#aaa", fontSize: 10 },
    labelBgStyle: { fill: "#111" },
    animated: e.kind === "prerequisite_of",
  }));

  return { nodes: flowNodes, edges: flowEdges };
}

function NodeLabel({ c }) {
  return (
    <div style={{ textAlign: "left", lineHeight: 1.3 }}>
      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 2 }}>{c.title}</div>
      <div style={{ fontSize: 10, opacity: 0.75 }}>
        {c.type} · d{c.difficulty}
      </div>
    </div>
  );
}

function StatusPill({ s }) {
  const color = {
    pending:     "#888",
    running:     "#F59E0B",
    done:        "#10B981",
    failed:      "#EF4444",
    skipped_ocr: "#888",
  }[s] ?? "#888";
  return <span style={{ color, fontWeight: 600 }}>{s ?? "—"}</span>;
}

function Legend() {
  return (
    <div style={{
      padding: "8px 20px",
      borderTop: "1px solid rgba(255,255,255,0.08)",
      display: "flex",
      gap: 16,
      fontSize: 11,
      fontFamily: "Inter, sans-serif",
      color: "#888",
      flexWrap: "wrap",
    }}>
      {Object.entries(TYPE_COLOR).map(([t, color]) => (
        <span key={t} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
          {t}
        </span>
      ))}
      <span style={{ marginLeft: 20 }}>edges: solid=specializes · animated=prerequisite_of · faint=related_to</span>
    </div>
  );
}

function Shell({ children }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0A0A0A",
      color: "#fff",
      fontFamily: "Inter, sans-serif",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>{children}</div>
  );
}
