"use client";
import { useEffect, useState, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import BrainMapGraph from "@/components/brain-map/BrainMapGraph";
import ConceptSidePanel from "@/components/brain-map/ConceptSidePanel";
import FilterChips from "@/components/brain-map/FilterChips";
import { MASTERY_TIERS } from "@/lib/masteryColor";

export default function BrainMapPage() {
  const [data, setData] = useState({ nodes: [], edges: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [activeSubject, setActiveSubject] = useState(null);
  const [activeMinMastery, setActiveMinMastery] = useState(0);
  const [selectedConcept, setSelectedConcept] = useState(null);

  async function load(subject, minMastery) {
    setLoading(true);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;

    const params = new URLSearchParams();
    if (subject) params.set("subject", subject);
    if (minMastery > 0) params.set("min_mastery", minMastery);

    const res = await fetch(`/api/brain-map?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load(activeSubject, activeMinMastery);
  }, [activeSubject, activeMinMastery]);

  const subjects = useMemo(
    () => [...new Set(data.nodes.map((n) => n.subject).filter(Boolean))],
    [data.nodes]
  );

  const stats = data.stats ?? {};

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      background: "var(--bg-base)",
      color: "var(--text-primary)",
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid var(--border-hairline)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        rowGap: 8,
      }}>
        <a href="/dashboard" style={{ color: "var(--text-tertiary)", textDecoration: "none", fontSize: 13, flexShrink: 0 }}>← Dashboard</a>
        <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0, flexShrink: 0 }}>Brain Map</h1>
        {stats.total > 0 && (
          <div style={{ display: "flex", gap: 8, marginLeft: "auto", fontSize: 11, flexWrap: "wrap" }}>
            {[
              { label: "Mastered", count: stats.mastered, color: `rgb(${MASTERY_TIERS[0].rgb.join(",")})` },
              { label: "Strong",   count: stats.strong,   color: `rgb(${MASTERY_TIERS[1].rgb.join(",")})` },
              { label: "Shaky",    count: stats.shaky,    color: `rgb(${MASTERY_TIERS[2].rgb.join(",")})` },
              { label: "Unknown",  count: stats.unknown,  color: `rgb(${MASTERY_TIERS[3].rgb.join(",")})` },
            ].map(({ label, count, color }) => (
              <span key={label} style={{ color, whiteSpace: "nowrap" }}>
                {count} {label}
              </span>
            ))}
          </div>
        )}
      </div>

      <FilterChips
        subjects={subjects}
        activeSubject={activeSubject}
        activeMinMastery={activeMinMastery}
        onSubjectChange={setActiveSubject}
        onMasteryChange={setActiveMinMastery}
      />

      {/* Graph area */}
      <div style={{ flex: 1, position: "relative" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-tertiary)" }}>
            Loading your concepts…
          </div>
        ) : (
          <BrainMapGraph
            nodes={data.nodes}
            edges={data.edges}
            onNodeClick={setSelectedConcept}
          />
        )}

        {selectedConcept && (
          <ConceptSidePanel
            concept={selectedConcept}
            onClose={() => setSelectedConcept(null)}
          />
        )}
      </div>
    </div>
  );
}
