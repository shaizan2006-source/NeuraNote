"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import { REGIONS, CITIES_BY_REGION } from "@/lib/india-locations";

function getSupabase() {
  return createClient(
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

const TOTAL_STEPS = 6;
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
  const [phoneNumber, setPhoneNumber] = useState("");
  const [parentPhoneNumber, setParentPhoneNumber] = useState("");
  const [isRepeatAspirant, setIsRepeatAspirant] = useState(null); // null = unanswered
  const [saving, setSaving] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  // ── Complete onboarding ──────────────────────────────────────────
  const handleFinish = async () => {
    setSaving(true);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          exam_type: examType,
          class_level: classLevel,
          exam_date: examDate,
          study_window: studyWindow,
          region,
          city,
          phone_number: phoneNumber ? `+91${phoneNumber}` : null,
          parent_phone_number: parentPhoneNumber ? `+91${parentPhoneNumber}` : null,
          is_repeat_aspirant: isRepeatAspirant ?? false,
        }),
      });
      if (res.ok) { router.push("/dashboard"); return; }
    } catch (_) {
      // Non-blocking — still navigate
    } finally {
      setSaving(false);
    }
    router.push("/dashboard");
  };

  // ── Phone validation ─────────────────────────────────────────────
  const validatePhone = (val) => {
    if (!val) return "Phone number is required to receive study reminders.";
    if (!/^[6-9]\d{9}$/.test(val)) return "Enter a valid 10-digit Indian mobile number.";
    return "";
  };

  const handlePhoneContinue = () => {
    const err = validatePhone(phoneNumber);
    if (err) { setPhoneError(err); return; }
    setPhoneError("");
    handleFinish();
  };

  // -- Progress dots --------------------------------------------
  const StepDots = () => (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 32 }}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div key={i} style={{
          width: i === step ? 20 : 8, height: 8, borderRadius: 4,
          background: i === step ? "var(--accent)" : i < step ? "var(--accent-dim)" : "var(--bg-surface-2)",
          transition: "all 0.3s ease",
        }} />
      ))}
    </div>
  );

  const BackBtn = () => step > 0 ? (
    <button onClick={() => setStep(s => s - 1)} style={{ background: "none", border: "none", color: "var(--text-tertiary)", fontSize: 13, cursor: "pointer", marginBottom: 8 }}>
      ← Back
    </button>
  ) : null;

  const cities = region ? [...(CITIES_BY_REGION[region] ?? []), "Other"] : [];

  const inputStyle = {
    width: "100%",
    background: "var(--bg-surface-2)",
    border: "2px solid var(--border-strong)",
    borderRadius: 10,
    padding: "12px 14px",
    color: "var(--text-primary)",
    fontSize: 16,
    boxSizing: "border-box",
  };

  const primaryBtn = (disabled) => ({
    width: "100%",
    background: disabled ? "var(--bg-surface-2)" : "var(--accent-grad)",
    color: disabled ? "var(--text-disabled)" : "var(--bg-base)",
    border: "none",
    borderRadius: 10,
    padding: "13px",
    fontSize: 15,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    marginBottom: 10,
  });

  // ---------------------------------------------------------------
  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-base)",
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

        {/* -- STEP 0: Exam type -- */}
        {step === 0 && (
          <>
            <h2 style={{ color: "var(--text-primary)", marginTop: 0, marginBottom: 8, fontSize: 22, textAlign: "center" }}>
              Which exam are you preparing for?
            </h2>
            <p style={{ color: "var(--text-tertiary)", fontSize: 14, marginBottom: 24, textAlign: "center" }}>
              We&apos;ll personalise everything around your exam.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
              {EXAM_OPTIONS.map((opt) => (
                <button key={opt.value} onClick={() => setExamType(opt.value)} style={{
                  background: examType === opt.value ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "var(--bg-surface)",
                  border: `2px solid ${examType === opt.value ? "var(--accent-dim)" : "var(--border-hairline)"}`,
                  borderRadius: 10, padding: "14px 12px",
                  color: examType === opt.value ? "var(--accent-bright)" : "var(--text-secondary)",
                  cursor: "pointer", textAlign: "center", fontSize: 13,
                  fontWeight: examType === opt.value ? 600 : 400, transition: "all 0.15s",
                }}>{opt.label}</button>
              ))}
            </div>
            <button disabled={!examType} onClick={() => setStep(1)} style={primaryBtn(!examType)}>Continue →</button>
          </>
        )}

        {/* -- STEP 1: Class / Year -- */}
        {step === 1 && (
          <>
            <BackBtn />
            <h2 style={{ color: "var(--text-primary)", marginTop: 0, marginBottom: 8, fontSize: 22, textAlign: "center" }}>What year are you in?</h2>
            <p style={{ color: "var(--text-tertiary)", fontSize: 14, marginBottom: 24, textAlign: "center" }}>Helps us calibrate revision intensity.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
              {CLASS_OPTIONS.map((opt) => (
                <button key={opt} onClick={() => setClassLevel(opt)} style={{
                  background: classLevel === opt ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "var(--bg-surface)",
                  border: `2px solid ${classLevel === opt ? "var(--accent-dim)" : "var(--border-hairline)"}`,
                  borderRadius: 10, padding: "14px 12px",
                  color: classLevel === opt ? "var(--accent-bright)" : "var(--text-secondary)",
                  cursor: "pointer", fontSize: 13, fontWeight: classLevel === opt ? 600 : 400, transition: "all 0.15s",
                }}>{opt}</button>
              ))}
            </div>
            <button disabled={!classLevel} onClick={() => setStep(2)} style={primaryBtn(!classLevel)}>Continue →</button>
            <button onClick={() => setStep(2)} style={{ width: "100%", background: "none", border: "none", color: "var(--text-tertiary)", fontSize: 13, cursor: "pointer" }}>Skip</button>
          </>
        )}

        {/* -- STEP 2: Exam date -- */}
        {step === 2 && (
          <>
            <BackBtn />
            <h2 style={{ color: "var(--text-primary)", marginTop: 0, marginBottom: 8, fontSize: 22, textAlign: "center" }}>When is your exam?</h2>
            <p style={{ color: "var(--text-tertiary)", fontSize: 14, marginBottom: 24, textAlign: "center" }}>We&apos;ll build your countdown around this.</p>
            <input type="date" value={examDate || EXAM_DATES[examType] || ""} onChange={e => setExamDate(e.target.value)}
              style={{ ...inputStyle, marginBottom: 24 }} />
            <button onClick={() => setStep(3)} style={primaryBtn(false)}>Continue →</button>
            <button onClick={() => setStep(3)} style={{ width: "100%", background: "none", border: "none", color: "var(--text-tertiary)", fontSize: 13, cursor: "pointer" }}>Skip</button>
          </>
        )}

        {/* -- STEP 3: Study window -- */}
        {step === 3 && (
          <>
            <BackBtn />
            <h2 style={{ color: "var(--text-primary)", marginTop: 0, marginBottom: 8, fontSize: 22, textAlign: "center" }}>When do you study best?</h2>
            <p style={{ color: "var(--text-tertiary)", fontSize: 14, marginBottom: 24, textAlign: "center" }}>We&apos;ll schedule reviews during your peak window.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
              {STUDY_WINDOW_OPTIONS.map((opt) => (
                <button key={opt.id} onClick={() => setStudyWindow(opt.id)} style={{
                  background: studyWindow === opt.id ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "var(--bg-surface)",
                  border: `2px solid ${studyWindow === opt.id ? "var(--accent-dim)" : "var(--border-hairline)"}`,
                  borderRadius: 10, padding: "14px 12px", cursor: "pointer", textAlign: "center",
                }}>
                  <div style={{ fontSize: 13, color: studyWindow === opt.id ? "var(--accent-bright)" : "var(--text-secondary)", fontWeight: studyWindow === opt.id ? 600 : 400 }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>{opt.sub}</div>
                </button>
              ))}
            </div>
            <button disabled={!studyWindow} onClick={() => setStep(4)} style={primaryBtn(!studyWindow)}>Continue →</button>
            <button onClick={() => setStep(4)} style={{ width: "100%", background: "none", border: "none", color: "var(--text-tertiary)", fontSize: 13, cursor: "pointer" }}>Skip</button>
          </>
        )}

        {/* -- STEP 4: Location -- */}
        {step === 4 && (
          <>
            <BackBtn />
            <h2 style={{ color: "var(--text-primary)", marginTop: 0, marginBottom: 8, fontSize: 22, textAlign: "center" }}>Where are you based?</h2>
            <p style={{ color: "var(--text-tertiary)", fontSize: 14, marginBottom: 20, textAlign: "center" }}>Matches you with students in your region.</p>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 6 }}>Region</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {REGIONS.map((r) => (
                  <button key={r} onClick={() => { setRegion(r); setCity(""); }} style={{
                    background: region === r ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "var(--bg-surface)",
                    border: `2px solid ${region === r ? "var(--accent-dim)" : "var(--border-hairline)"}`,
                    borderRadius: 8, padding: "8px", color: region === r ? "var(--accent-bright)" : "var(--text-secondary)",
                    fontSize: 12, cursor: "pointer",
                  }}>{r}</button>
                ))}
              </div>
            </div>
            {region && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 6 }}>City</div>
                <select value={city} onChange={e => setCity(e.target.value)} style={{
                  width: "100%", background: "var(--bg-surface-2)", border: "2px solid var(--border-strong)",
                  borderRadius: 10, padding: "10px 12px", color: "var(--text-primary)", fontSize: 14,
                }}>
                  <option value="">Select city…</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
            <button onClick={() => setStep(5)} style={primaryBtn(false)}>Continue →</button>
            <button onClick={() => setStep(5)} style={{ width: "100%", background: "none", border: "none", color: "var(--text-tertiary)", fontSize: 13, cursor: "pointer" }}>Skip location</button>
          </>
        )}

        {/* -- STEP 5: Phone + parent + repeat aspirant -- */}
        {step === 5 && (
          <>
            <BackBtn />
            <h2 style={{ color: "var(--text-primary)", marginTop: 0, marginBottom: 8, fontSize: 22, textAlign: "center" }}>
              Stay on track
            </h2>
            <p style={{ color: "var(--text-tertiary)", fontSize: 14, marginBottom: 24, textAlign: "center" }}>
              Hum tumhe study reminders WhatsApp pe bhejenge. Required.
            </p>

            {/* Phone number */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 6 }}>Your WhatsApp number *</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  background: "var(--bg-surface-2)", border: "2px solid var(--border-strong)",
                  borderRadius: 10, padding: "12px 14px", color: "var(--text-tertiary)", fontSize: 16, whiteSpace: "nowrap",
                }}>+91</div>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="10-digit mobile"
                  value={phoneNumber}
                  maxLength={10}
                  onChange={e => {
                    setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10));
                    setPhoneError("");
                  }}
                  style={{ ...inputStyle }}
                />
              </div>
              {phoneError && (
                <p style={{ color: "var(--error)", fontSize: 12, marginTop: 6 }}>{phoneError}</p>
              )}
            </div>

            {/* Parent phone */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 6 }}>Parent&apos;s WhatsApp (optional)</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  background: "var(--bg-surface-2)", border: "2px solid var(--border-strong)",
                  borderRadius: 10, padding: "12px 14px", color: "var(--text-tertiary)", fontSize: 16, whiteSpace: "nowrap",
                }}>+91</div>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="Apne parents ko bhi updates?"
                  value={parentPhoneNumber}
                  maxLength={10}
                  onChange={e => setParentPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  style={{ ...inputStyle }}
                />
              </div>
            </div>

            {/* Repeat aspirant */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 10 }}>Is this your first attempt at JEE / NEET?</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: "First attempt", value: false },
                  { label: "Repeat / Dropper", value: true },
                ].map(({ label, value }) => (
                  <button key={label} onClick={() => setIsRepeatAspirant(value)} style={{
                    background: isRepeatAspirant === value ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "var(--bg-surface)",
                    border: `2px solid ${isRepeatAspirant === value ? "var(--accent-dim)" : "var(--border-hairline)"}`,
                    borderRadius: 10, padding: "12px",
                    color: isRepeatAspirant === value ? "var(--accent-bright)" : "var(--text-secondary)",
                    cursor: "pointer", fontSize: 13, fontWeight: isRepeatAspirant === value ? 600 : 400,
                    transition: "all 0.15s",
                  }}>{label}</button>
                ))}
              </div>
            </div>

            <button onClick={handlePhoneContinue} style={primaryBtn(false)}>Continue →</button>
          </>
        )}

        {/* -- STEP 6 (handled by handleFinish redirect after step 5 validation) -- */}
        {/* Step 5 Continue calls handlePhoneContinue which validates then calls handleFinish */}

        </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
