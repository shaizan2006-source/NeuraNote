"use client";
import { useCallback, useMemo } from "react";
import ReactFlow, { Background, Controls, MiniMap, useNodesState, useEdgesState } from "reactflow";
import "reactflow/dist/style.css";

const MASTERY_COLOR = (score) => {
  if (score >= 0.8) return "#10B981";
  if (score >= 0.6) return "#F59E0B";
  if (score >= 0.3) return "#8B5CF6";
  return "#6B7280";
};

function toFlowNodes(nodes) {
  const cols = Math.ceil(Math.sqrt(nodes.length));
  return nodes.map((n, i) => ({
    id: n.id,
    data: { label: n.label, mastery: n.mastery_score, subject: n.subject },
    position: n.x != null ? { x: n.x, y: n.y } : { x: (i % cols) * 180, y: Math.floor(i / cols) * 100 },
    style: {
      background: MASTERY_COLOR(n.mastery_score ?? 0),
      color: "#fff",
      border: "none",
      borderRadius: 8,
      fontSize: 12,
      padding: "6px 10px",
      maxWidth: 160,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
  }));
}

function toFlowEdges(edges) {
  return edges.map((e, i) => ({
    id: `e-${i}`,
    source: e.from,
    target: e.to,
    style: { stroke: "rgba(255,255,255,0.2)", strokeWidth: 1 },
    animated: false,
  }));
}

export default function BrainMapGraph({ nodes: rawNodes, edges: rawEdges, onNodeClick }) {
  const initialNodes = useMemo(() => toFlowNodes(rawNodes ?? []), [rawNodes]);
  const initialEdges = useMemo(() => toFlowEdges(rawEdges ?? []), [rawEdges]);
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const handleNodeClick = useCallback((_, node) => {
    onNodeClick?.(node.data);
  }, [onNodeClick]);

  if (!rawNodes?.length) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#6B7280" }}>
        <p>Upload a PDF, ask a question, take a quiz — concepts will start appearing here.</p>
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      fitView
      minZoom={0.2}
      maxZoom={2}
    >
      <Background color="rgba(255,255,255,0.05)" gap={24} />
      <Controls />
      <MiniMap
        nodeColor={(n) => MASTERY_COLOR(n.data?.mastery ?? 0)}
        style={{ background: "rgba(0,0,0,0.4)" }}
      />
    </ReactFlow>
  );
}
