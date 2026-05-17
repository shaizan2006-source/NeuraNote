"use client";
import { useEffect, useState, useRef } from "react";

const NOTIFICATION_TYPES = [
  { key: "briefing",      label: "Morning Briefing",  timeKey: "briefing_time",      defaultTime: 420  },
  { key: "midday",        label: "Lunch Micro",        timeKey: "midday_time",        defaultTime: 780  },
  { key: "focus_anchor",  label: "Focus Anchor",       timeKey: "focus_anchor_time",  defaultTime: 1080 },
  { key: "night_closure", label: "Night Closure",      timeKey: "night_closure_time", defaultTime: 1260 },
];

function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

export default function NotificationPreferences() {
  const [prefs, setPrefs] = useState(null);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    fetch("/api/notifications/preferences")
      .then(r => r.json())
      .then(setPrefs)
      .catch(() => {});
  }, []);

  function update(key, value) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);

    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 500);
  }

  if (!prefs) return <div style={{ color: "#6B7280", fontSize: 13 }}>Loading…</div>;

  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#F9FAFB" }}>Notifications</h3>
        {saved && <span style={{ fontSize: 12, color: "#10B981" }}>Saved</span>}
      </div>

      {NOTIFICATION_TYPES.map((type) => {
        const enabled = prefs[`${type.key}_enabled`] ?? true;
        const time = minutesToTime(prefs[type.timeKey] ?? type.defaultTime);
        return (
          <div key={type.key} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            <span style={{ fontSize: 14, color: enabled ? "#E5E7EB" : "#6B7280" }}>{type.label}</span>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {enabled && (
                <input
                  type="time"
                  value={time}
                  onChange={e => update(type.timeKey, timeToMinutes(e.target.value))}
                  style={{
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 6, padding: "4px 8px", color: "#F9FAFB", fontSize: 12,
                  }}
                />
              )}
              <button
                onClick={() => update(`${type.key}_enabled`, !enabled)}
                style={{
                  width: 40, height: 22, borderRadius: 11,
                  background: enabled ? "#8B5CF6" : "rgba(255,255,255,0.1)",
                  border: "none", cursor: "pointer", position: "relative", transition: "background 0.15s",
                }}
                aria-label={`Toggle ${type.label}`}
              >
                <div style={{
                  width: 16, height: 16, borderRadius: 8, background: "#fff",
                  position: "absolute", top: 3, left: enabled ? 21 : 3,
                  transition: "left 0.15s",
                }} />
              </button>
            </div>
          </div>
        );
      })}

      <div style={{ padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 14, color: "#E5E7EB" }}>Cohort updates</span>
        <button onClick={() => update("cohort_updates_enabled", !prefs.cohort_updates_enabled)} style={{
          width: 40, height: 22, borderRadius: 11,
          background: prefs.cohort_updates_enabled ? "#8B5CF6" : "rgba(255,255,255,0.1)",
          border: "none", cursor: "pointer", position: "relative",
        }}>
          <div style={{ width: 16, height: 16, borderRadius: 8, background: "#fff", position: "absolute", top: 3, left: prefs.cohort_updates_enabled ? 21 : 3, transition: "left 0.15s" }} />
        </button>
      </div>

      <p style={{ fontSize: 12, color: "#6B7280", marginTop: 16 }}>
        Max 4 per day. We respect your sleep + your slump.
      </p>
    </div>
  );
}
