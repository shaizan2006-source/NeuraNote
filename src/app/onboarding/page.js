"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createBrowserClient } from "@supabase/supabase-js";
import { REGIONS, CITIES_BY_REGION } from "@/lib/india-locations";

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

const EXAM_OPTIONS = [
  { value: "jee_main_2027", label: "JEE Main 2027" },
  { value: "jee_main_2026", label: "JEE Main 2026" },
  { value: "jee_advanced_2027", label: "JEE Advanced 2027" },
  { value: "neet_ug_2027", label: "NEET UG 2027" },
  { value: "neet_ug_2026", label: "NEET UG 2026" },
  { value: "other", label: "Other" },
];

const CLASS_OPTIONS = ["Class 11", "Class 12", "Drop year", "Other"];

const STUDY_WINDOW_OPTIONS = [
  { id: "morning", label: "Morning", sub: "5 AM – 11 AM" },
  { id: "afternoon", label: "Afternoon", sub: "11 AM – 5 PM" },
  { id: "evening", label: "Evening", sub: "5 PM – 10 PM" },
  { id: "flexible", label: "Flexible", sub: "Varies day to day" },
];

const EXAM_DATES = {
  jee_main_2027: "2027-01-20",
  jee_main_2026: "2026-01-22",
  jee_advanced_2027: "2027-05-25",
  neet_ug_2027: "2027-05-02",
  neet_ug_2026: "2026-05-04",
};

const TOTAL_STEPS = 5;
const STORAGE_KEY = "onboarding_v2";

export default function OnboardingPage() {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [examType, setExamType] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [examDate, setExamDate] = useState("");
  const [studyWindow, setStudyWindow] = useState("");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Complete onboarding ───────────────────────────────────────
  const handleFinish = async () => {
    setSaving(true);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ exam_type: examType, class_level: classLevel, exam_date: examDate, study_window: studyWindow, region, city }),
      });
      if (res.ok) { router.push("/dashboard"); return; }
    } catch (_) {
      // Non-blocking — still navigate
    } finally {
      setSaving(false);
    }
    router.push("/dashboard");
  };

  // ── Progress dots ─────────────────────────────────────────────
  const StepDots = () => (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 32 }}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div key={i} style={{
          width: i === step ? 20 : 8, height: 8, borderRadius: 4,
          background: i === step ? "#8B5CF6" : i < step ? "#6D28D9" : "rgba(255,255,255,0.12)",
          transition: "all 0.3s ease",
        }} />
      ))}
    </div>
  );

  const BackBtn = () => step > 0 ? (
    <button onClick={() => setStep(s => s - 1)} style={{ background: "none", border: "none", color: "#6B7280", fontSize: 13, cursor: "pointer", marginBottom: 8 }}>
      ← Back
    </button>
  ) : null;

  const cities = region ? [...(CITIES_BY_REGION[region] ?? []), "Other"] : [];

  // ────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0A0A0A 0%, #1A1A2E 50%, #0F1119 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px 16px",
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <StepDots />

        <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -18 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        >

        {/* ── STEP 0: Exam type ── */}
        {step === 0 && (
          <>
            <h2 style={{ color: "#F9FAFB", marginTop: 0, marginBottom: 8, fontSize: 22, textAlign: "center" }}>
              Which exam are you preparing for?
            </h2>
            <p style={{ color: "#9CA3AF", fontSize: 14, marginBottom: 24, textAlign: "center" }}>
              We&apos;ll personalise everything around your exam.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
              {EXAM_OPTIONS.map((opt) => (
                <button key={opt.value} onClick={() => setExamType(opt.value)} style={{
                  background: examType === opt.value ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.04)",
                  border: `2px solid ${examType === opt.value ? "#8B5CF6" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 10, padding: "14px 12px",
                  color: examType === opt.value ? "#A78BFA" : "#E5E7EB",
                  cursor: "pointer", textAlign: "center", fontSize: 13,
                  fontWeight: examType === opt.value ? 600 : 400, transition: "all 0.15s",
                }}>{opt.label}</button>
              ))}
            </div>
            <button disabled={!examType} onClick={() => setStep(1)} style={{
              width: "100%", background: examType ? "#8B5CF6" : "rgba(255,255,255,0.06)",
              color: examType ? "#fff" : "#6B7280", border: "none", borderRadius: 10,
              padding: "13px", fontSize: 15, fontWeight: 600,
              cursor: examType ? "pointer" : "not-allowed",
            }}>Continue →</button>
          </>
        )}

        {/* ── STEP 1: Class / Year ── */}
        {step === 1 && (
          <>
            <BackBtn />
            <h2 style={{ color: "#F9FAFB", marginTop: 0, marginBottom: 8, fontSize: 22, textAlign: "center" }}>What year are you in?</h2>
            <p style={{ color: "#9CA3AF", fontSize: 14, marginBottom: 24, textAlign: "center" }}>Helps us calibrate revision intensity.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
              {CLASS_OPTIONS.map((opt) => (
                <button key={opt} onClick={() => setClassLevel(opt)} style={{
                  background: classLevel === opt ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.04)",
                  border: `2px solid ${classLevel === opt ? "#8B5CF6" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 10, padding: "14px 12px",
                  color: classLevel === opt ? "#A78BFA" : "#E5E7EB",
                  cursor: "pointer", fontSize: 13, fontWeight: classLevel === opt ? 600 : 400, transition: "all 0.15s",
                }}>{opt}</button>
              ))}
            </div>
            <button disabled={!classLevel} onClick={() => setStep(2)} style={{
              width: "100%", background: classLevel ? "#8B5CF6" : "rgba(255,255,255,0.06)",
              color: classLevel ? "#fff" : "#6B7280", border: "none", borderRadius: 10,
              padding: "13px", fontSize: 15, fontWeight: 600,
              cursor: classLevel ? "pointer" : "not-allowed", marginBottom: 10,
            }}>Continue →</button>
            <button onClick={() => setStep(2)} style={{ width: "100%", background: "none", border: "none", color: "#6B7280", fontSize: 13, cursor: "pointer" }}>Skip</button>
          </>
        )}

        {/* ── STEP 2: Exam date ── */}
        {step === 2 && (
          <>
            <BackBtn />
            <h2 style={{ color: "#F9FAFB", marginTop: 0, marginBottom: 8, fontSize: 22, textAlign: "center" }}>When is your exam?</h2>
            <p style={{ color: "#9CA3AF", fontSize: 14, marginBottom: 24, textAlign: "center" }}>We&apos;ll build your countdown around this.</p>
            <input type="date" value={examDate || EXAM_DATES[examType] || ""} onChange={e => setExamDate(e.target.value)}
              style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "2px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "12px 14px", color: "#F9FAFB", fontSize: 16, marginBottom: 24, boxSizing: "border-box" }} />
            <button onClick={() => setStep(3)} style={{
              width: "100%", background: "#8B5CF6", color: "#fff", border: "none", borderRadius: 10,
              padding: "13px", fontSize: 15, fontWeight: 600, cursor: "pointer", marginBottom: 10,
            }}>Continue →</button>
            <button onClick={() => setStep(3)} style={{ width: "100%", background: "none", border: "none", color: "#6B7280", fontSize: 13, cursor: "pointer" }}>Skip</button>
          </>
        )}

        {/* ── STEP 3: Study window ── */}
        {step === 3 && (
          <>
            <BackBtn />
            <h2 style={{ color: "#F9FAFB", marginTop: 0, marginBottom: 8, fontSize: 22, textAlign: "center" }}>When do you study best?</h2>
            <p style={{ color: "#9CA3AF", fontSize: 14, marginBottom: 24, textAlign: "center" }}>We&apos;ll schedule reviews during your peak window.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
              {STUDY_WINDOW_OPTIONS.map((opt) => (
                <button key={opt.id} onClick={() => setStudyWindow(opt.id)} style={{
                  background: studyWindow === opt.id ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.04)",
                  border: `2px solid ${studyWindow === opt.id ? "#8B5CF6" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 10, padding: "14px 12px", cursor: "pointer", textAlign: "center",
                }}>
                  <div style={{ fontSize: 13, color: studyWindow === opt.id ? "#A78BFA" : "#E5E7EB", fontWeight: studyWindow === opt.id ? 600 : 400 }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{opt.sub}</div>
                </button>
              ))}
            </div>
            <button disabled={!studyWindow} onClick={() => setStep(4)} style={{
              width: "100%", background: studyWindow ? "#8B5CF6" : "rgba(255,255,255,0.06)",
              color: studyWindow ? "#fff" : "#6B7280", border: "none", borderRadius: 10,
              padding: "13px", fontSize: 15, fontWeight: 600,
              cursor: studyWindow ? "pointer" : "not-allowed", marginBottom: 10,
            }}>Continue →</button>
            <button onClick={() => setStep(4)} style={{ width: "100%", background: "none", border: "none", color: "#6B7280", fontSize: 13, cursor: "pointer" }}>Skip</button>
          </>
        )}

        {/* ── STEP 4: Location ── */}
        {step === 4 && (
          <>
            <BackBtn />
            <h2 style={{ color: "#F9FAFB", marginTop: 0, marginBottom: 8, fontSize: 22, textAlign: "center" }}>Where are you based?</h2>
            <p style={{ color: "#9CA3AF", fontSize: 14, marginBottom: 20, textAlign: "center" }}>Matches you with students in your region.</p>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 6 }}>Region</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {REGIONS.map((r) => (
                  <button key={r} onClick={() => { setRegion(r); setCity(""); }} style={{
                    background: region === r ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.04)",
                    border: `2px solid ${region === r ? "#8B5CF6" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 8, padding: "8px", color: region === r ? "#A78BFA" : "#E5E7EB",
                    fontSize: 12, cursor: "pointer",
                  }}>{r}</button>
                ))}
              </div>
            </div>
            {region && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 6 }}>City</div>
                <select value={city} onChange={e => setCity(e.target.value)} style={{
                  width: "100%", background: "rgba(255,255,255,0.06)", border: "2px solid rgba(255,255,255,0.12)",
                  borderRadius: 10, padding: "10px 12px", color: "#F9FAFB", fontSize: 14,
                }}>
                  <option value="">Select city…</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
            <button onClick={handleFinish} disabled={saving} style={{
              width: "100%", background: "#8B5CF6", color: "#fff", border: "none", borderRadius: 10,
              padding: "13px", fontSize: 15, fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, marginBottom: 10,
            }}>{saving ? "Setting up…" : "Let's go →"}</button>
            <button onClick={handleFinish} disabled={saving} style={{ width: "100%", background: "none", border: "none", color: "#6B7280", fontSize: 13, cursor: "pointer" }}>Skip location</button>
          </>
        )}

        </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
