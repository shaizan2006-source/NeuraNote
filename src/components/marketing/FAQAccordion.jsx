"use client";

import { useState } from "react";

const FAQS = [
  { q: "Is this only for JEE/NEET?", a: "Primarily yes — the AI is tuned for JEE Main, JEE Advanced, and NEET syllabi. It knows what topics are high-weightage for each exam. That said, it works for any PDF you upload." },
  { q: "Do I need to upload my own notes?", a: "You can, but you don't have to. We include 1000+ official PYQs built-in. Upload your own notes to get personalised answers from your exact content." },
  { q: "How is this different from Anki?", a: "Anki is for flashcards you create manually. Ask My Notes builds your knowledge map automatically from your PDFs, generates daily briefings, and answers questions from your notes — no card creation needed." },
  { q: "How is this different from NotebookLM?", a: "NotebookLM is a general research tool. Ask My Notes is built specifically for JEE/NEET — it knows the syllabus, tracks your mastery per topic, has 1000+ PYQs, and shows your Brain Map evolving over time." },
  { q: "Is my data private?", a: "Yes. Your notes and conversations are stored securely and never used to train any AI model. You can export or delete all your data at any time from Settings." },
  { q: "Can I cancel anytime?", a: "Yes. Cancel in one click from Settings → Subscription. Your data stays intact. No lock-in, no cancellation fees." },
  { q: "Does it work offline?", a: "The app is a PWA — it installs on your home screen and loads fast. But AI answers require internet. Offline mode for saved notes is on the roadmap." },
  { q: "Does it work on iPhone?", a: "Yes. Add it to your home screen from Safari for the best experience. Android Chrome works the same way. Push notifications work on both." },
  { q: "What languages?", a: "English only right now. Hindi UI and Hinglish answer mode are on the roadmap — expected Q2 2026." },
  { q: "Can I share with friends?", a: "Not yet, but cohort mode lets you see anonymised rankings vs peers preparing for the same exam. Friend groups are on the roadmap." },
];

export default function FAQAccordion() {
  const [open, setOpen] = useState(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {FAQS.map((faq, i) => (
        <div key={i} style={{
          background: "var(--surface-card)", border: "1px solid var(--border-default)",
          borderRadius: 12, overflow: "hidden",
        }}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
            aria-controls={`faq-answer-${i}`}
            style={{
              width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "16px 20px", background: "none", border: "none", cursor: "pointer",
              color: "var(--text-primary)", fontSize: 15, fontWeight: 600, textAlign: "left", gap: 12,
            }}
          >
            <span>{faq.q}</span>
            <span aria-hidden="true" style={{
              fontSize: 18, color: "var(--text-muted)", flexShrink: 0,
              transition: "transform 0.2s",
              transform: open === i ? "rotate(45deg)" : "rotate(0deg)",
              display: "inline-block",
            }}>+</span>
          </button>
          {open === i && (
            <div id={`faq-answer-${i}`} style={{ padding: "0 20px 16px", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>
              {faq.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
