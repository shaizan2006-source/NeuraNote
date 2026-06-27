import { ImageResponse } from "next/og";
import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";

export const runtime = "edge";

export async function GET(req) {
  const user = await verifyAuth(req);
  if (!user) return new Response(null, { status: 401 });

  // Fetch brain map stats
  const { data: nodes } = await supabaseAdmin
    .from("concept_nodes")
    .select("label,subject,mastery_score")
    .eq("user_id", user.id)
    .limit(200);

  const all = nodes ?? [];
  const mastered = all.filter(n => (n.mastery_score ?? 0) >= 0.8).length;
  const strong = all.filter(n => (n.mastery_score ?? 0) >= 0.6 && (n.mastery_score ?? 0) < 0.8).length;
  const total = all.length;
  const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;

  // Top mastered concepts (up to 6)
  const topNodes = [...all].sort((a, b) => (b.mastery_score ?? 0) - (a.mastery_score ?? 0)).slice(0, 6);

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, exam_type")
    .eq("id", user.id)
    .maybeSingle();

  const name = profile?.full_name ?? "Student";
  const examLabel = profile?.exam_type?.replace(/_/g, " ").toUpperCase() ?? "JEE";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%",
          background: "linear-gradient(135deg, #0A0A0A 0%, #1a0a2e 100%)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          fontFamily: "sans-serif", color: "#F9FAFB", padding: 48,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 36 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, #8B5CF6, #EC4899)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: "#fff" }}>
            {name[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{name}</div>
            <div style={{ fontSize: 13, color: "#8B5CF6" }}>{examLabel} Brain Map</div>
          </div>
        </div>

        {/* Big stat */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 80, fontWeight: 800, color: "#8B5CF6", lineHeight: 1 }}>{pct}%</div>
          <div style={{ fontSize: 16, color: "#9CA3AF", marginTop: 8 }}>mastery · {total} concepts mapped</div>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 32, marginBottom: 40 }}>
          {[
            { label: "Mastered", value: mastered, color: "#10B981" },
            { label: "Strong", value: strong, color: "#8B5CF6" },
            { label: "Learning", value: total - mastered - strong, color: "#F59E0B" },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Top concepts */}
        {topNodes.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", maxWidth: 600 }}>
            {topNodes.map(n => (
              <div key={n.label} style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 20, padding: "4px 14px", fontSize: 13, color: "#C4B5FD" }}>
                {n.label}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ position: "absolute", bottom: 24, fontSize: 12, color: "#374151" }}>
          askmynotes.in
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}