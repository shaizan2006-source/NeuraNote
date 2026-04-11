"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useDashboard } from "@/context/DashboardContext";
import ExamReadinessShareCard from "@/components/dashboard/ExamReadinessShareCard";

export default function AnalyticsSection() {
  const {
    analytics, insights, readiness, difficultyData,
    isAnalyticsExpanded, setIsAnalyticsExpanded,
    isInsightsExpanded, setIsInsightsExpanded,
    chartType, setChartType,
  } = useDashboard();

  return (
    <div id="section-analytics" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, var(--surface-elevated) 100%)", border: "1px solid var(--border-default)", borderRadius: 16, padding: 20, marginTop: 20, boxShadow: "0 4px 32px rgba(0,0,0,0.5)" }}>
      <div onClick={() => setIsAnalyticsExpanded((prev) => !prev)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>📊</span>
          <span style={{ fontWeight: 700, fontSize: 17, color: "var(--text-primary)" }}>Analytics Dashboard</span>
          {analytics.totalCompleted > 0 && (
            <span style={{ background: "#0ea5e9", color: "white", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>{analytics.totalCompleted} tasks done</span>
          )}
        </div>
        <button style={{ background: isAnalyticsExpanded ? "#374151" : "#0ea5e9", color: "white", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          {isAnalyticsExpanded ? "Hide ▲" : "View ▼"}
        </button>
      </div>
      {!isAnalyticsExpanded && <p style={{ marginTop: 12, color: "var(--text-muted)", fontSize: 13, fontStyle: "italic" }}>👉 Click to view your performance analytics</p>}

      {isAnalyticsExpanded && (
        <div style={{ marginTop: 20 }}>
          {/* Stat mini-cards */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
            {[
              { label: "Total Done", value: analytics.totalCompleted, color: "#0ea5e9", emoji: "✅" },
              { label: "Easy", value: analytics.easy, color: "var(--green)", emoji: "😌" },
              { label: "Medium", value: analytics.medium, color: "var(--amber)", emoji: "⚡" },
              { label: "Hard", value: analytics.hard, color: "var(--red)", emoji: "🔥" },
            ].map((stat, i) => (
              <div key={i} style={{ flex: 1, minWidth: 90, background: "var(--surface-card)", borderRadius: 12, padding: "14px 12px", borderTop: `3px solid ${stat.color}`, textAlign: "center" }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{stat.emoji}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, fontWeight: 600 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Chart type toggle */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, background: "var(--surface-card)", padding: 4, borderRadius: 10, width: "fit-content" }}>
            {["bar", "pie"].map((type) => (
              <button key={type} onClick={() => setChartType(type)}
                style={{ padding: "6px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: chartType === type ? "#0ea5e9" : "transparent", color: chartType === type ? "white" : "#64748b" }}>
                {type === "bar" ? "📊 Bar" : "🥧 Pie"}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div style={{ background: "var(--surface-card)", borderRadius: 12, padding: "16px 8px", marginBottom: 20, border: "1px solid var(--border-default)" }}>
            {analytics.totalCompleted === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-faint)" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📈</div>
                <p style={{ fontSize: 14 }}>Complete tasks in Focus Mode to see your chart</p>
              </div>
            ) : chartType === "bar" ? (
              <div style={{ width: "100%", height: "clamp(180px, 40vh, 240px)" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={difficultyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fill: "var(--text-secondary)", fontSize: 13 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "var(--text-muted)", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--text-faint)", borderRadius: 8, color: "var(--text-primary)" }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={800}>
                      {difficultyData.map((_, index) => <Cell key={index} fill={index === 0 ? "var(--green)" : index === 1 ? "var(--amber)" : "var(--red)"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ width: "100%", height: "clamp(180px, 40vh, 240px)" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={difficultyData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} isAnimationActive animationDuration={800}>
                      {difficultyData.map((_, index) => <Cell key={index} fill={index === 0 ? "var(--green)" : index === 1 ? "var(--amber)" : "var(--red)"} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--text-faint)", borderRadius: 8, color: "var(--text-primary)" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
                  {[{ label: "Easy", color: "var(--green)" }, { label: "Medium", color: "var(--amber)" }, { label: "Hard", color: "var(--red)" }].map((l, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: l.color }} />
                      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Easy mastery rate */}
          <div style={{ background: "var(--surface-card)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, border: "1px solid var(--border-default)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>
              <span>😌 Easy Mastery Rate</span>
              <span style={{ color: "var(--green)" }}>{analytics.totalCompleted ? Math.round((analytics.easy / analytics.totalCompleted) * 100) : 0}%</span>
            </div>
            <div style={{ height: 8, background: "var(--border-default)", borderRadius: 99 }}>
              <div style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg, var(--green), #86efac)", width: `${analytics.totalCompleted ? (analytics.easy / analytics.totalCompleted) * 100 : 0}%`, transition: "width 0.8s ease" }} />
            </div>
          </div>

          {/* AI Insights */}
          <div style={{ background: "var(--surface-card)", borderRadius: 12, padding: 16, marginBottom: 20, border: "1px solid var(--border-default)" }}>
            <div onClick={() => setIsInsightsExpanded((prev) => !prev)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>🧠</span>
                <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>AI Insights</span>
              </div>
              <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{isInsightsExpanded ? "▲" : "▼"}</span>
            </div>
            {isInsightsExpanded && (
              <div style={{ marginTop: 14 }}>
                {insights.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No insights yet.</p>
                ) : (
                  insights.map((msg, index) => (
                    <div key={index} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 10, marginBottom: 8, background: "var(--surface-raised)", borderLeft: "3px solid #0ea5e9" }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
                      <span style={{ color: "#e2e8f0", fontSize: 14, lineHeight: 1.5 }}>{msg}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Exam Readiness */}
          <div style={{ background: "var(--surface-card)", borderRadius: 12, padding: 16, border: "1px solid var(--border-default)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span>🎯</span>
              <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>Exam Readiness</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
              <div style={{ fontSize: "clamp(28px, 6vw, 40px)", fontWeight: 800, color: readiness.score >= 80 ? "var(--green)" : readiness.score >= 50 ? "var(--amber)" : "var(--red)" }}>{readiness.score}%</div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: readiness.score >= 80 ? "var(--green)" : readiness.score >= 50 ? "var(--amber)" : "var(--red)" }}>{readiness.status}</p>
                <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 13, marginTop: 2 }}>{readiness.message}</p>
              </div>
            </div>
            <div style={{ height: 10, background: "var(--border-default)", borderRadius: 99 }}>
              <div style={{ height: "100%", borderRadius: 99, background: readiness.score >= 80 ? "linear-gradient(90deg, var(--green), #86efac)" : readiness.score >= 50 ? "linear-gradient(90deg, var(--amber), #fcd34d)" : "linear-gradient(90deg, var(--red), #fca5a5)", width: `${readiness.score}%`, transition: "width 0.8s ease" }} />
            </div>
            <ExamReadinessShareCard />
          </div>
        </div>
      )}
    </div>
  );
}
