"use client";
import { useRouter } from "next/navigation";

export default function ConceptChip({ label, conceptId }) {
  const router = useRouter();
  return (
    <span
      onClick={() => router.push(`/brain-map?focus=${encodeURIComponent(conceptId || label)}`)}
      style={{
        display: "inline-block",
        background: "rgba(34,211,238,0.1)",
        border: "1px solid rgba(34,211,238,0.2)",
        borderRadius: 4,
        padding: "1px 6px",
        color: "#22D3EE",
        fontSize: "0.9em",
        cursor: "pointer",
        margin: "0 1px",
        textDecoration: "underline",
        textDecorationStyle: "dotted",
      }}
    >
      {label}
    </span>
  );
}

/** Parse [concept:id]label[/concept] markers in answer text */
export function parseConceptChips(text) {
  if (!text) return text;
  const parts = [];
  const regex = /\[concept:([^\]]*)\]([^\[]*)\[\/concept\]/g;
  let last = 0, m;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push({ type: "concept", id: m[1], label: m[2] });
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
