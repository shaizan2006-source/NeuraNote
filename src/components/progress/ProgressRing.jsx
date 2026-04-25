"use client";

export default function ProgressRing({
  value = 0,
  max   = 100,
  size  = 80,
  stroke = 6,
  color  = "#8B5CF6",
  bg     = "rgba(255,255,255,0.06)",
}) {
  const r             = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset        = circumference - (value / max) * circumference;

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={bg}    strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s ease-out" }}
      />
    </svg>
  );
}
