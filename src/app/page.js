"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";

// ── Reusable fade-up animation wrapper ───────────────────────────
function FadeUp({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

// ── Feature cards ─────────────────────────────────────────────────
const FEATURES = [
  {
    icon: "💬",
    title: "Ask Your Notes",
    desc: "Upload any PDF and ask questions in plain language. Get accurate answers from your own material.",
    color: "var(--brand)",
    glow: "var(--brand-glow)",
  },
  {
    icon: "⚡",
    title: "Smart Quizzes",
    desc: "Auto-generated MCQs from your content. Track weak topics and focus where it matters most.",
    color: "var(--amber)",
    glow: "var(--amber-glow)",
  },
  {
    icon: "🧠",
    title: "Mastery Tracking",
    desc: "Visual brain map of every topic. See exactly what you know and what needs revision.",
    color: "var(--green)",
    glow: "var(--green-glow)",
  },
  {
    icon: "📞",
    title: "Voice AI Tutor",
    desc: "Talk to your AI tutor like a real teacher. Ask, explain, and learn — hands free.",
    color: "var(--blue)",
    glow: "var(--blue-glow)",
  },
];

// ── How it works steps ────────────────────────────────────────────
const STEPS = [
  { num: "01", title: "Upload your notes", desc: "Drop in any PDF — textbooks, handwritten scans, lecture slides." },
  { num: "02", title: "Ask anything",      desc: "Type or speak your question. The AI answers from your exact content." },
  { num: "03", title: "Track & master",    desc: "Quiz yourself, review weak topics, and watch your readiness score climb." },
];

// ── Testimonials ──────────────────────────────────────────────────
const QUOTES = [
  { text: "I cleared JEE Advanced using Ask My Notes. The quiz feature helped me find gaps I never knew I had.", name: "Arjun S.", tag: "JEE Advanced" },
  { text: "Finally an app that actually reads my PDFs and gives real answers. Not generic AI garbage.", name: "Priya M.", tag: "NEET UG" },
  { text: "The mastery map is addictive. I can see myself getting better every day.", name: "Rahul K.", tag: "GATE CSE" },
];

export default function Home() {
  return (
    <div style={{ background: "var(--surface-base)", minHeight: "100vh", color: "var(--text-primary)", overflowX: "hidden" }}>

      {/* ── Nav ──────────────────────────────────────────────────── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0,
        zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px clamp(16px, 4vw, 32px)",
        background: "rgba(10,10,10,0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border-subtle)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: "linear-gradient(135deg, var(--brand), #4f46e5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, boxShadow: "0 0 14px var(--brand-glow)",
          }}>📚</div>
          <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>Ask My Notes</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link href="/pricing" style={{ color: "var(--text-muted)", fontSize: 14, textDecoration: "none", fontWeight: 500, display: "none" }} className="hide-mobile-nav">
            Pricing
          </Link>
          <Link href="/login" style={{ color: "var(--text-secondary)", fontSize: 14, textDecoration: "none", fontWeight: 500 }}>
            Log in
          </Link>
          <Link href="/signup" style={{
            background: "linear-gradient(135deg, var(--brand), #4f46e5)",
            color: "#fff",
            padding: "8px 18px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            boxShadow: "0 2px 12px var(--brand-glow)",
          }}>
            Start Free
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section style={{
        minHeight: "100vh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        textAlign: "center",
        padding: "clamp(72px, 15vh, 120px) clamp(16px, 4vw, 24px) clamp(40px, 8vh, 80px)",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Background glow */}
        <div style={{
          position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)",
          width: 600, height: 400,
          background: "radial-gradient(ellipse, rgba(124,58,237,0.18) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(124,58,237,0.12)",
            border: "1px solid rgba(124,58,237,0.3)",
            borderRadius: 20, padding: "5px 14px",
            fontSize: 12, fontWeight: 600, color: "var(--brand-light)",
            marginBottom: 28, letterSpacing: "0.4px",
          }}
        >
          🇮🇳 Built for JEE · NEET · GATE · UPSC
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
          style={{
            fontSize: "clamp(36px, 6vw, 62px)",
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: "-0.5px",
            maxWidth: 720,
            margin: "0 auto 20px",
            background: "linear-gradient(180deg, #f1f5f9 40%, #64748b 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Study smarter with your own notes
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{
            fontSize: "clamp(14px, 3.5vw, 18px)", color: "var(--text-secondary)",
            maxWidth: 500, lineHeight: 1.7,
            margin: "0 auto 40px",
          }}
        >
          Upload your PDFs, ask questions, take AI-generated quizzes, and master every topic — all in one place.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}
        >
          <Link href="/signup" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "linear-gradient(135deg, var(--brand), #4f46e5)",
            color: "#fff", padding: "14px 28px", borderRadius: 12,
            fontSize: 15, fontWeight: 700, textDecoration: "none",
            boxShadow: "0 4px 24px var(--brand-glow)",
            transition: "opacity 0.15s",
          }}>
            Get Started Free →
          </Link>
          <Link href="/pricing" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "transparent",
            color: "var(--text-secondary)", padding: "14px 28px", borderRadius: 12,
            fontSize: 15, fontWeight: 600, textDecoration: "none",
            border: "1px solid var(--border-strong)",
            transition: "border-color 0.15s, color 0.15s",
          }}>
            View Plans
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ marginTop: 20, fontSize: 12, color: "var(--text-faint)" }}
        >
          Free plan available · No credit card needed
        </motion.p>
      </section>

      {/* ── Social proof ─────────────────────────────────────────── */}
      <section style={{ padding: "clamp(32px, 6vw, 60px) clamp(16px, 4vw, 24px)", textAlign: "center" }}>
        <FadeUp>
          <p style={{ fontSize: 13, color: "var(--text-muted)", letterSpacing: "0.5px", textTransform: "uppercase", fontWeight: 600, marginBottom: 32 }}>
            Trusted by students preparing for
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            {["JEE Main", "JEE Advanced", "NEET UG", "GATE", "UPSC CSE", "CA Foundation"].map((exam) => (
              <span key={exam} style={{
                padding: "6px 14px", borderRadius: 20,
                background: "var(--surface-card)",
                border: "1px solid var(--border-default)",
                fontSize: 13, fontWeight: 500, color: "var(--text-secondary)",
              }}>
                {exam}
              </span>
            ))}
          </div>
        </FadeUp>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section style={{ padding: "clamp(40px, 8vw, 80px) clamp(16px, 4vw, 24px)", maxWidth: 960, margin: "0 auto" }}>
        <FadeUp style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontSize: "clamp(22px, 5vw, 32px)", fontWeight: 800, margin: "0 0 12px", letterSpacing: "-0.3px" }}>
            Everything you need to ace your exam
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 16, maxWidth: 480, margin: "0 auto" }}>
            One app. All your notes. Instant AI answers.
          </p>
        </FadeUp>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}>
          {FEATURES.map((f, i) => (
            <FadeUp key={f.title} delay={i * 0.08}>
              <div style={{
                background: "var(--surface-card)",
                border: "1px solid var(--border-default)",
                borderRadius: 16, padding: "24px 20px",
                transition: "border-color 0.2s, box-shadow 0.2s",
                height: "100%",
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = f.color;
                  e.currentTarget.style.boxShadow = `0 0 24px ${f.glow}`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-default)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: f.glow, border: `1px solid ${f.color}22`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, marginBottom: 16,
                }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px", color: "var(--text-primary)" }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
                  {f.desc}
                </p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section style={{ padding: "clamp(40px, 8vw, 80px) clamp(16px, 4vw, 24px)", maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
        <FadeUp>
          <h2 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 12px", letterSpacing: "-0.3px" }}>
            Start studying in 3 steps
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 16, marginBottom: 56 }}>
            No setup. No complexity. Just upload and learn.
          </p>
        </FadeUp>

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {STEPS.map((step, i) => (
            <FadeUp key={step.num} delay={i * 0.1}>
              <div style={{ display: "flex", gap: 24, alignItems: "flex-start", textAlign: "left", marginBottom: 40, position: "relative" }}>
                <div style={{ flexShrink: 0 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: "linear-gradient(135deg, var(--brand), #4f46e5)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15, fontWeight: 800, color: "#fff",
                    boxShadow: "0 4px 16px var(--brand-glow)",
                  }}>
                    {step.num}
                  </div>
                </div>
                <div style={{ paddingTop: 10 }}>
                  <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 6px", color: "var(--text-primary)" }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────── */}
      <section style={{ padding: "clamp(40px, 8vw, 80px) clamp(16px, 4vw, 24px)", maxWidth: 960, margin: "0 auto" }}>
        <FadeUp style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontSize: "clamp(22px, 5vw, 32px)", fontWeight: 800, margin: "0 0 12px", letterSpacing: "-0.3px" }}>
            Students who use it, swear by it
          </h2>
        </FadeUp>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {QUOTES.map((q, i) => (
            <FadeUp key={i} delay={i * 0.08}>
              <div style={{
                background: "var(--surface-card)",
                border: "1px solid var(--border-default)",
                borderRadius: 16, padding: "24px 20px",
              }}>
                <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 20px", fontStyle: "italic" }}>
                  "{q.text}"
                </p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{q.name}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: "var(--brand-light)",
                    background: "var(--brand-glow)", border: "1px solid rgba(124,58,237,0.25)",
                    padding: "3px 9px", borderRadius: 20, letterSpacing: "0.3px",
                  }}>
                    {q.tag}
                  </span>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px" }}>
        <FadeUp>
          <div style={{
            maxWidth: 640, margin: "0 auto", textAlign: "center",
            background: "var(--surface-card)",
            border: "1px solid var(--border-default)",
            borderRadius: 20, padding: "clamp(24px, 5vw, 48px) clamp(16px, 4vw, 32px)",
            boxShadow: "0 0 60px rgba(124,58,237,0.1)",
          }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>🚀</div>
            <h2 style={{ fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 800, margin: "0 0 12px", letterSpacing: "-0.3px" }}>
              Ready to study smarter?
            </h2>
            <p style={{ fontSize: 15, color: "var(--text-secondary)", margin: "0 0 32px", lineHeight: 1.6 }}>
              Join students who are already using AI to master their subjects faster.
            </p>
            <Link href="/signup" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "linear-gradient(135deg, var(--brand), #4f46e5)",
              color: "#fff", padding: "14px 32px", borderRadius: 12,
              fontSize: 15, fontWeight: 700, textDecoration: "none",
              boxShadow: "0 4px 24px var(--brand-glow)",
            }}>
              Start for Free →
            </Link>
            <p style={{ marginTop: 16, fontSize: 12, color: "var(--text-faint)" }}>
              Free plan · No credit card · Start in 30 seconds
            </p>
          </div>
        </FadeUp>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer style={{
        borderTop: "1px solid var(--border-subtle)",
        padding: "28px clamp(16px, 4vw, 32px)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12,
      }}>
        <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>Ask My Notes</span>
        <div style={{ display: "flex", gap: 20 }}>
          {[["Pricing", "/pricing"], ["Login", "/login"], ["Sign Up", "/signup"]].map(([label, href]) => (
            <Link key={label} href={href} style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none" }}>
              {label}
            </Link>
          ))}
        </div>
        <span style={{ fontSize: 12, color: "var(--text-faint)" }}>© 2025 Ask My Notes</span>
      </footer>

    </div>
  );
}
