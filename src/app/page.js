"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import WaitlistForm from "@/components/marketing/WaitlistForm";
import FAQAccordion from "@/components/marketing/FAQAccordion";
import { LogoMark } from "@/components/brand/Logo";

// Constellation backdrop for the hero — the brand-signature star-field
// (same identity as the Sage idle effect, brain map, and logo spark).
function HeroConstellation() {
  const nodes = [[12, 22], [30, 12], [52, 24], [74, 14], [88, 30], [22, 54], [46, 42], [68, 56], [86, 64], [36, 76], [62, 82]];
  const links = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [2, 6], [6, 7], [4, 8], [5, 9], [7, 10], [6, 1]];
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.55, pointerEvents: "none" }}>
      {links.map(([a, b], i) => (
        <line key={i} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]}
          stroke="var(--accent)" strokeOpacity={0.3} strokeWidth="1" vectorEffect="non-scaling-stroke" />
      ))}
      {nodes.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 0.42 : 0.28} fill="var(--accent-bright)" />
      ))}
    </svg>
  );
}

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

const FEATURES = [
  {
    icon: "🧠",
    title: "Brain Map",
    tagline: "See your knowledge grow",
    desc: "Every concept you study connects automatically. Spot gaps before they become exam mistakes.",
    color: "var(--brand)",
    glow: "var(--brand-glow)",
  },
  {
    icon: "🎙️",
    title: "Daily Briefing",
    tagline: "90 seconds. Every morning.",
    desc: "AI summarises what to review based on your gaps. Listen while you get ready for the day.",
    color: "var(--amber)",
    glow: "var(--amber-glow)",
  },
  {
    icon: "📝",
    title: "PYQs + AI Tutor",
    tagline: "1000+ official questions.",
    desc: "JEE Main 2018–2024, NEET 2018–2024, JEE Advanced. Ask anything — AI explains from your notes.",
    color: "var(--green)",
    glow: "var(--green-glow)",
  },
];

const STEPS = [
  { num: "01", title: "Upload your notes", desc: "Drop in any PDF — textbooks, handwritten scans, lecture slides." },
  { num: "02", title: "Ask anything",      desc: "Type or speak your question. AI answers from your exact content." },
  { num: "03", title: "Track & master",    desc: "Quiz yourself, review weak topics, watch your readiness score climb." },
];

const QUOTES = [
  { text: "Finally something that actually knows JEE syllabus. Not ChatGPT with a wrapper — it knows Rotational Mechanics is high-weightage.", name: "Arjun S.", tag: "JEE Main 2027" },
  { text: "The Brain Map showed me I was weak in Electrochemistry but I had no idea. Fixed it in 3 days.", name: "Priya M.", tag: "NEET UG 2027" },
  { text: "It didn't ping me at 11pm to keep my streak. I noticed. Small thing but it meant a lot.", name: "Rahul K.", tag: "JEE Advanced 2027" },
];

const PLANS = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    features: ["5 questions/day", "1 document", "Basic Brain Map"],
    cta: "Start Free",
    href: "/signup",
    highlight: false,
  },
  {
    name: "Student",
    price: "₹199",
    period: "/month",
    features: ["Unlimited questions", "10 documents", "Full Brain Map", "Daily Briefing", "PYQ practice"],
    cta: "Start 7-day trial",
    href: "/signup",
    highlight: true,
    badge: "Most Popular",
  },
  {
    name: "Pro",
    price: "₹399",
    period: "/month",
    features: ["Everything in Student", "Unlimited documents", "Mock tests", "Cohort rankings", "Priority support"],
    cta: "Start 7-day trial",
    href: "/signup",
    highlight: false,
  },
];

export default function Home() {

  return (
    <div style={{ background: "var(--surface-base)", minHeight: "100vh", color: "var(--text-primary)", overflowX: "hidden" }}>

      {/* ── Nav ──────────────────────────────────────────────────── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px clamp(16px, 4vw, 32px)",
        background: "rgba(10,10,10,0.85)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border-subtle)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ display: "flex", color: "var(--text-primary)" }}><LogoMark size={26} strokeWidth={1.7} /></span>
          <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em" }}>Ask My Notes</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link href="/pricing" style={{ color: "var(--text-secondary)", fontSize: 14, textDecoration: "none", fontWeight: 500 }}>
            Pricing
          </Link>
          <Link href="/login" style={{ color: "var(--text-secondary)", fontSize: 14, textDecoration: "none", fontWeight: 500 }}>
            Log in
          </Link>
          <Link href="/signup" style={{
            background: "var(--accent-grad)",
            color: "var(--bg-base)", padding: "8px 18px", borderRadius: 8,
            fontSize: 13, fontWeight: 600, textDecoration: "none",
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
        position: "relative", overflow: "hidden",
      }}>
        {/* Constellation backdrop + gold glow */}
        <HeroConstellation />
        <div style={{
          position: "absolute", top: "40%", left: "50%", transform: "translate(-50%, -50%)",
          width: 640, height: 460,
          background: "radial-gradient(ellipse, var(--accent-glow-soft) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Brand mark */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          style={{ position: "relative", zIndex: 1, color: "var(--text-primary)", marginBottom: 26 }}
        >
          <LogoMark size={60} strokeWidth={1.4} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.05, ease: [0.4, 0, 0.2, 1] }}
          style={{
            position: "relative", zIndex: 1,
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "transparent", border: "1px solid var(--accent-dim)",
            borderRadius: 20, padding: "5px 14px",
            fontSize: 12, fontWeight: 600, color: "var(--accent)",
            marginBottom: 24, letterSpacing: "0.4px",
          }}
        >
          <svg width="6" height="6" viewBox="0 0 6 6" aria-hidden="true" style={{ flexShrink: 0 }}>
            <circle cx="3" cy="3" r="3" fill="var(--accent)" />
          </svg>
          Built for JEE · NEET · India&apos;s hardest exams
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
          style={{
            position: "relative", zIndex: 1,
            fontSize: "clamp(40px, 6.5vw, 64px)", fontWeight: 600,
            lineHeight: 1.08, letterSpacing: "-0.02em",
            maxWidth: 760, margin: "0 auto 20px",
            color: "var(--text-primary)",
          }}
        >
          Your notes that <span style={{ color: "var(--accent)" }}>answer back.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{
            position: "relative", zIndex: 1,
            fontSize: "clamp(14px, 3.5vw, 18px)", color: "var(--text-secondary)",
            maxWidth: 540, lineHeight: 1.7, margin: "0 auto 40px",
          }}
        >
          Upload your notes, ask Sage, and master more in less time. AI Brain Map, daily briefings, and 1000+ official PYQs — built for JEE &amp; NEET.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={{ position: "relative", zIndex: 1, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}
        >
          <Link href="/signup" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "var(--accent-grad)",
            color: "var(--bg-base)", padding: "14px 28px", borderRadius: 12,
            fontSize: 15, fontWeight: 700, textDecoration: "none",
            boxShadow: "0 4px 24px var(--accent-glow-soft)",
          }}>
            Start free 7-day trial →
          </Link>
          <a href="#features" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "transparent", color: "var(--text-secondary)",
            padding: "14px 28px", borderRadius: 12,
            fontSize: 15, fontWeight: 600, textDecoration: "none",
            border: "1px solid var(--border-strong)",
          }}>
            See how it works
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ position: "relative", zIndex: 1, marginTop: 20, fontSize: 12, color: "var(--text-faint)" }}
        >
          7-day Pro trial · No credit card needed
        </motion.p>
      </section>

      {/* ── Social proof ─────────────────────────────────────────── */}
      <section style={{ padding: "clamp(32px, 6vw, 60px) clamp(16px, 4vw, 24px)", textAlign: "center" }}>
        <FadeUp>
          <p style={{ fontSize: 13, color: "var(--text-muted)", letterSpacing: "0.5px", textTransform: "uppercase", fontWeight: 600, marginBottom: 16 }}>
            Beta tested by students in
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
            {["Bangalore", "Delhi", "Mumbai", "Pune", "Hyderabad", "Chennai"].map((city) => (
              <span key={city} style={{
                padding: "6px 14px", borderRadius: 20,
                background: "var(--surface-card)", border: "1px solid var(--border-default)",
                fontSize: 13, fontWeight: 500, color: "var(--text-secondary)",
              }}>
                {city}
              </span>
            ))}
          </div>
          <p style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 8 }}>
            Built solo by a JEE/NEET aspirant who needed this themselves.
          </p>
        </FadeUp>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section id="features" style={{ padding: "clamp(40px, 8vw, 80px) clamp(16px, 4vw, 24px)", maxWidth: 960, margin: "0 auto" }}>
        <FadeUp style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontSize: "clamp(22px, 5vw, 32px)", fontWeight: 800, margin: "0 0 12px", letterSpacing: "-0.3px" }}>
            Three things no other study tool does
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 16, maxWidth: 480, margin: "0 auto" }}>
            Built specifically for the JEE/NEET grind. Not a generic AI wrapper.
          </p>
        </FadeUp>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {FEATURES.map((f, i) => (
            <FadeUp key={f.title} delay={i * 0.1}>
              <div style={{
                background: "var(--surface-card)", border: "1px solid var(--border-default)",
                borderRadius: 16, padding: "28px 24px", height: "100%",
                transition: "border-color 0.2s, box-shadow 0.2s",
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
                <p style={{ fontSize: 11, fontWeight: 700, color: f.color, letterSpacing: "0.6px", textTransform: "uppercase", margin: "0 0 6px" }}>
                  {f.tagline}
                </p>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 10px", color: "var(--text-primary)" }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
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
              <div style={{ display: "flex", gap: 24, alignItems: "flex-start", textAlign: "left", marginBottom: 40 }}>
                <div style={{ flexShrink: 0 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: "var(--accent-grad)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15, fontWeight: 800, color: "var(--bg-base)",
                    boxShadow: "0 4px 16px var(--brand-glow)",
                  }}>
                    {step.num}
                  </div>
                </div>
                <div style={{ paddingTop: 10 }}>
                  <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 6px" }}>{step.title}</h3>
                  <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
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
              <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: 16, padding: "24px 20px" }}>
                <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 20px", fontStyle: "italic" }}>
                  "{q.text}"
                </p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{q.name}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: "var(--accent)",
                    background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
                    padding: "3px 9px", borderRadius: 20,
                  }}>
                    {q.tag}
                  </span>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── Pricing Preview ───────────────────────────────────────── */}
      <section style={{ padding: "clamp(40px, 8vw, 80px) clamp(16px, 4vw, 24px)", maxWidth: 960, margin: "0 auto" }}>
        <FadeUp style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontSize: "clamp(22px, 5vw, 32px)", fontWeight: 800, margin: "0 0 12px", letterSpacing: "-0.3px" }}>
            Simple pricing
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 16, maxWidth: 400, margin: "0 auto" }}>
            7-day free trial. No card required.
          </p>
        </FadeUp>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {PLANS.map((plan, i) => (
            <FadeUp key={plan.name} delay={i * 0.08}>
              <div style={{
                background: plan.highlight ? "color-mix(in srgb, var(--accent) 9%, transparent)" : "var(--surface-card)",
                border: plan.highlight ? "1px solid var(--accent)" : "1px solid var(--border-default)",
                borderRadius: 16, padding: "28px 24px",
                position: "relative", height: "100%",
                display: "flex", flexDirection: "column",
                boxShadow: plan.highlight ? "var(--shadow-card), 0 0 32px var(--accent-glow-soft)" : "none",
              }}>
                {plan.badge && (
                  <div style={{
                    position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                    background: "var(--accent-grad)",
                    color: "var(--bg-base)", fontSize: 11, fontWeight: 700,
                    padding: "3px 12px", borderRadius: 20, letterSpacing: "0.4px",
                    whiteSpace: "nowrap",
                  }}>
                    {plan.badge}
                  </div>
                )}
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", margin: "0 0 8px" }}>{plan.name}</p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span style={{ fontSize: 36, fontWeight: 800, color: "var(--text-primary)" }}>{plan.price}</span>
                    <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{plan.period}</span>
                  </div>
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", flex: 1 }}>
                  {plan.features.map((feat) => (
                    <li key={feat} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text-secondary)", marginBottom: 10 }}>
                      <span style={{ color: "var(--green)", fontWeight: 700, flexShrink: 0 }}>✓</span>
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link href={plan.href} style={{
                  display: "block", textAlign: "center",
                  padding: "11px 0", borderRadius: 10, fontSize: 14, fontWeight: 600,
                  textDecoration: "none",
                  background: plan.highlight ? "var(--accent-grad)" : "var(--surface-raised)",
                  color: plan.highlight ? "var(--bg-base)" : "var(--text-primary)",
                  border: plan.highlight ? "none" : "1px solid var(--border-default)",
                  boxShadow: plan.highlight ? "0 4px 16px var(--brand-glow)" : "none",
                }}>
                  {plan.cta}
                </Link>
              </div>
            </FadeUp>
          ))}
        </div>
        <FadeUp>
          <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "var(--text-faint)" }}>
            Annual plan available · ₹4499/year saves ₹2389 vs monthly Student
          </p>
        </FadeUp>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section style={{ padding: "clamp(40px, 8vw, 80px) clamp(16px, 4vw, 24px)", maxWidth: 720, margin: "0 auto" }}>
        <FadeUp style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontSize: "clamp(22px, 5vw, 32px)", fontWeight: 800, margin: "0 0 12px", letterSpacing: "-0.3px" }}>
            Frequently asked
          </h2>
        </FadeUp>
        <FAQAccordion />
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px" }}>
        <FadeUp>
          <div style={{
            maxWidth: 640, margin: "0 auto", textAlign: "center",
            background: "var(--surface-card)", border: "1px solid var(--border-default)",
            borderRadius: 20, padding: "clamp(24px, 5vw, 48px) clamp(16px, 4vw, 32px)",
            boxShadow: "var(--shadow-card), 0 0 48px var(--accent-glow-soft)",
          }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>🚀</div>
            <h2 style={{ fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 800, margin: "0 0 12px", letterSpacing: "-0.3px" }}>
              Ready to study smarter?
            </h2>
            <p style={{ fontSize: 15, color: "var(--text-secondary)", margin: "0 0 32px", lineHeight: 1.6 }}>
              Join students already using AI to master their subjects faster.
            </p>
            <Link href="/signup" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "var(--accent-grad)",
              color: "var(--bg-base)", padding: "14px 32px", borderRadius: 12,
              fontSize: 15, fontWeight: 700, textDecoration: "none",
              boxShadow: "0 4px 24px var(--brand-glow)",
            }}>
              Start free 7-day trial →
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
        padding: "40px clamp(16px, 4vw, 32px) 28px",
      }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          {/* Waitlist */}
          <div style={{
            background: "var(--surface-card)", border: "1px solid var(--border-default)",
            borderRadius: 12, padding: "24px 28px", marginBottom: 32,
          }}>
            <p style={{ fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>Not ready to sign up?</p>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 16px" }}>
              Get launch updates — we'll email when something good ships.
            </p>
            <WaitlistForm />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>Ask My Notes</span>
            <div style={{ display: "flex", gap: 20 }}>
              {[["Pricing", "/pricing"], ["Login", "/login"], ["Sign Up", "/signup"]].map(([label, href]) => (
                <Link key={label} href={href} style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none" }}>
                  {label}
                </Link>
              ))}
            </div>
            <span style={{ fontSize: 12, color: "var(--text-faint)" }}>© 2026 Ask My Notes</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
