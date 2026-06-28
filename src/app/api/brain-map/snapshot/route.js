import { ImageResponse } from "next/og";
import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";

export const runtime = "nodejs";

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
          background: "linear-gradient(135deg, #08080A 0%, #131317 100%)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          fontFamily: "sans-serif", color: "#F5F5F4", padding: 48,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 36 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, #EACF96, #D4AF6E)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: "#08080A" }}>
            {name[0]?.toUpperCase()}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{name}</div>
            <div style={{ fontSize: 13, color: "#D4AF6E" }}>{`${examLabel} Brain Map`}</div>
          </div>
        </div>

        {/* Big stat */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 80, fontWeight: 800, color: "#D4AF6E", lineHeight: 1 }}>{`${pct}%`}</div>
          <div style={{ fontSize: 16, color: "#A1A1A6", marginTop: 8 }}>{`mastery · ${total} concepts mapped`}</div>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 32, marginBottom: 40 }}>
          {[
            { label: "Mastered", value: mastered, color: "#D4AF6E" },
            { label: "Strong", value: strong, color: "#34D399" },
            { label: "Learning", value: total - mastered - strong, color: "#F5B544" },
          ].map(s => (
            <div key={s.label} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#6B6B70", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Top concepts */}
        {topNodes.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", maxWidth: 600 }}>
            {topNodes.map(n => (
              <div key={n.label} style={{ background: "rgba(212,175,110,0.15)", border: "1px solid rgba(212,175,110,0.3)", borderRadius: 20, padding: "4px 14px", fontSize: 13, color: "#EACF96" }}>
                {n.label}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ position: "absolute", bottom: 24, fontSize: 12, color: "#46464B" }}>
          askmynotes.in
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}