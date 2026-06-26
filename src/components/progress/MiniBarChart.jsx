"use client";

export default function MiniBarChart({ data = [], height = 40, barColor = "var(--accent)", barWidth = 8, gap = 3 }) {
  const max = Math.max(...data.map(d => d.minutes ?? d.value ?? 0), 1);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap, height }}>
      {data.map((d, i) => {
        const val  = d.minutes ?? d.value ?? 0;
        const barH = Math.max(2, (val / max) * height);
        const isLast = i === data.length - 1;
        return (
          <div
            key={i}
            title={`${d.date ? d.date.slice(5) : i}: ${val}min`}
            style={{
              width:      barWidth,
              height:     barH,
              borderRadius: 2,
              background: isLast ? "var(--accent)" : barColor,
              opacity:    isLast ? 1 : 0.3 + (i / data.length) * 0.5,
              transition: "height 0.8s ease-out",
            }}
          />
        );
      })}
    </div>
  );
}
