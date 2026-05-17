"use client";
import { useEffect, useState, useMemo } from "react";
import { createBrowserClient } from "@supabase/supabase-js";
import BrainMapGraph from "@/components/brain-map/BrainMapGraph";
import ConceptSidePanel from "@/components/brain-map/ConceptSidePanel";
import FilterChips from "@/components/brain-map/FilterChips";

export default function BrainMapPage() {
  const [data, setData] = useState({ nodes: [], edges: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [activeSubject, setActiveSubject] = useState(null);
  const [activeMinMastery, setActiveMinMastery] = useState(0);
  const [selectedConcept, setSelectedConcept] = useState(null);

  async function load(subject, minMastery) {
    setLoading(true);
    const supabase = createBrowserClient(
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
      background: "linear-gradient(135deg, #0A0A0A 0%, #1A1A2E 50%, #0F1119 100%)",
      color: "#F9FAFB",
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}>
        <a href="/dashboard" style={{ color: "#6B7280", textDecoration: "none", fontSize: 14 }}>← Dashboard</a>
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Your Brain Map</h1>
        {stats.total > 0 && (
          <div style={{ display: "flex", gap: 12, marginLeft: "auto", fontSize: 12 }}>
            {[
              { label: "Mastered", count: stats.mastered, color: "#10B981" },
              { label: "Strong", count: stats.strong, color: "#F59E0B" },
              { label: "Shaky", count: stats.shaky, color: "#8B5CF6" },
              { label: "Unknown", count: stats.unknown, color: "#6B7280" },
            ].map(({ label, count, color }) => (
              <span key={label} style={{ color }}>
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#6B7280" }}>
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
