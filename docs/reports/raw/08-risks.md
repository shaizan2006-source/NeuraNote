# Phase 8 — Risk Assessment

*Generated 2026-05-27. Risks scored on Likelihood (1-5) × Impact (1-5) = Score (1-25). Trigger event = the specific signal that this risk has materialized and demands action.*

---

## 8.1 Business risks

| # | Risk | Likelihood | Impact | Score | Trigger event | Mitigation |
|---|------|------------|--------|-------|---------------|------------|
| B1 | **OpenAI ships native "Study Mode" in ChatGPT Plus** | 4 | 4 | 16 | OpenAI launch announcement | Lean into Indian curriculum specificity + Brain Map data graph + voice habit loops; the moat is the data, not the AI |
| B2 | **PW or Doubtnut releases comparable AI features** | 4 | 3 | 12 | They launch a "PDF upload" or "AI tutor" feature | Already happening at small scale; speed of feature velocity is the answer |
| B3 | **Indian edtech VC funding freeze worsens** | 3 | 3 | 9 | Series A / seed deals drying up | Stay capital-efficient; aim for break-even on bootstrap; raise only when growth metrics support 4-8x multiples |
| B4 | **Universities ban "AI cheating tools"** | 2 | 4 | 8 | Top university issues an advisory naming Ask-My-Notes-class tools | Position as "AI Tutor" (legal) not "Essay Writer" (banned); collect testimonials from professors using it |
| B5 | **DPDP Act enforcement (India data privacy)** | 3 | 4 | 12 | Notice from data protection authority or competitor complaint | Privacy migrations (`privacy_columns`, account_deletion, user/export) already added. Audit retention policies against DPDP timelines (must purge within 30 days of consent withdrawal) |
| B6 | **GDPR enforcement if UK/EU expansion proceeds** | 2 | 4 | 8 | UK student complaint | EU data residency requires Supabase region migration — significant work |
| B7 | **Razorpay account suspension / KYC issue** | 1 | 5 | 5 | Email from Razorpay | Have Cashfree as backup tested before need |
| B8 | **Solo-founder dependency (key-person risk)** | 5 | 5 | 25 | Founder unavailable for >2 weeks | Document critical operations; have a second person who can run prod ops; SOC for top 10 emergency procedures |
| B9 | **Capital runway under 12 months** | 3 | 5 | 15 | Bank balance + projected burn < 12 months | Track this monthly; reduce voice cost cap if needed; defer non-revenue features |
| B10 | **Parent perception ("kids using AI to cheat")** | 3 | 3 | 9 | Reddit / WhatsApp parent group rant | Pre-empt with "AI tutor" framing; let parents see child's Brain Map progress via parent dashboard |

---

## 8.2 Technical risks

| # | Risk | Likelihood | Impact | Score | Trigger event | Mitigation |
|---|------|------------|--------|-------|---------------|------------|
| T1 | **OpenAI rate limits / outage / suspension** | 4 | 5 | 20 | 429 errors spike; account email | Multi-key rotation (1 wk); multi-provider with Claude fallback (2-3 wks) — *Anthropic SDK already installed, just wire it up* |
| T2 | **Supabase outage** | 2 | 5 | 10 | status.supabase.com red | Supabase historical uptime good; document failover for Postgres read-only mode if happens; have managed backup |
| T3 | **Cost runaway from a single abusive user** | 4 | 4 | 16 | Sentry alert / OpenAI dashboard | Phase 3 CRIT-1 — monthly $-cap per user with circuit breaker (2-3 days) |
| T4 | **DashboardContext refactor causes regression** | 3 | 3 | 9 | Production errors after deploy | Extract one context at a time + integration tests + feature flag |
| T5 | **Streaming protocol break (`__META__` format change)** | 3 | 4 | 12 | Frontend breaks on prod deploy | Version field in protocol (Phase 3 HIGH-7) |
| T6 | **pgvector IVFFlat performance degradation** | 2 | 3 | 6 | Q&A latency p95 > 3s | Re-index with sqrt(rows); monitor before it bites |
| T7 | **No backup tested** | 2 | 5 | 10 | Disaster | Supabase managed backup runs daily; test restore quarterly |
| T8 | **WhatsApp webhook spoofing** | 2 | 4 | 8 | Suspicious traffic | HMAC verified per code; verify `WHATSAPP_APP_SECRET` set in prod |
| T9 | **Cron failure (e.g. briefings stop generating)** | 3 | 3 | 9 | Users complain "no briefing today" | External health check on cron endpoints (UptimeRobot $0/mo for 10 monitors) |
| T10 | **Dead code accumulating (Anthropic SDK, pdf-parser, 3 markdown libs, `src/next-app/`)** | 5 | 1 | 5 | Build size grows | Phase 3 LOW-1/2/3 cleanup; quarterly housekeeping |

---

## 8.3 Market risks

| # | Risk | Likelihood | Impact | Score |
|---|------|------------|--------|-------|
| M1 | **JEE/NEET prep market saturation** | 3 | 3 | 9 |
| M2 | **Coaching-industry pushback (lobbying)** | 2 | 3 | 6 |
| M3 | **Student preference shifts away from AI tutors** | 2 | 3 | 6 |
| M4 | **WhatsApp meta-platform regulatory changes** | 3 | 2 | 6 |
| M5 | **Indian RBI rules on recurring auto-debit further tighten** | 3 | 4 | 12 | Annual upfront becomes essential |

---

## 8.4 Operational risks

| # | Risk | Likelihood | Impact | Score | Mitigation |
|---|------|------------|--------|-------|------------|
| O1 | **Customer support scaling (solo founder)** | 5 | 3 | 15 | Self-serve docs + FAQ + escalation path; one paid support contractor at ₹5L MRR |
| O2 | **WhatsApp message cost runaway** | 3 | 3 | 9 | Per-user daily cap on outbound messages |
| O3 | **AI API cost runaway** | 4 | 4 | 16 | Phase 3 CRIT-1 |
| O4 | **Compliance (GST, DPDP, UPI mandates)** | 3 | 4 | 12 | Engage CA + lawyer quarterly; document data flows |
| O5 | **No on-call rotation** | 5 | 3 | 15 | Founder is permanent on-call; Sentry alerts to phone |
| O6 | **Knowledge concentrated in founder's head** | 5 | 4 | 20 | Operational documentation; ADRs for major architecture decisions |

---

## 8.5 Top 5 risks by score (action priority)

| Rank | Risk | Score | Action |
|------|------|-------|--------|
| 1 | **Solo-founder key-person risk** (B8) | 25 | Document top 10 emergency procedures; identify backup operator |
| 2 | **OpenAI outage / rate limit / suspension** (T1) | 20 | Wire up Anthropic fallback in 2-3 weeks — closes one of the largest SPOFs |
| 3 | **Knowledge concentrated in founder** (O6) | 20 | Architecture Decision Records (ADRs) for any new major system; weekly written log |
| 4 | **Cost runaway from abusive user** (T3) | 16 | Phase 3 CRIT-1 — monthly $-cap with circuit breaker |
| 5 | **AI API cost runaway in aggregate** (O3) | 16 | Daily cost dashboard + alerts; voice minute caps |

The two biggest risks are *organizational* not technical (B8, O6). At seed scale this is normal; at Series A scale this can collapse the company. **Hire #1 (or recruit a technical co-founder) is a higher-priority topic than any feature on the roadmap.**

---

## 8.6 Risks NOT to worry about right now

- **HNSW vs IVFFlat vector indexes** — premature optimization; revisit at 1M+ vectors
- **TypeScript migration** — useful but not urgent for any specific risk
- **Multi-region Supabase** — only matters if UK/EU is a near-term revenue source
- **Stripe migration** — Razorpay works; don't fix what isn't broken
- **Streaming protocol v2 SSE** — versioning the existing protocol is enough for now
- **Admin dashboard for everything** — narrow admin pages exist; full admin is a 3-week build that's premature

---

## 8.7 "What this analysis might be wrong about" (self-critique seeded for §12)

The biggest assumptions baked in:
1. **Voice tutor will not commoditize.** If a "voice version of ChatGPT" launches with the same Whisper+TTS stack at $0.05/min, the voice differentiator collapses overnight. *Test: how much of the voice "wow factor" is the voice itself vs the in-product integration with the user's PDFs?*
2. **Brain Map is genuinely defensible.** If NotebookLM or PW spots this and ships their own concept-graph extraction in 6 months, the moat is much shorter than estimated. *Test: how unique is the actual graph algorithm vs domain-aware prompts?*
3. **Indian students will accept ₹399/mo Pro.** ARR math assumes 20K paying users at ₹399 avg. If WTP is actually ₹199 floor, all paths collapse. *Test: A/B test ₹199 vs ₹399 conversion rates.*
4. **WhatsApp acquisition will work.** Untested viral channel. If it doesn't, paid acquisition at India edtech CAC ranges (₹500-₹2,000) destroys unit economics. *Test: 50-admin program in next 90 days.*
5. **Founder can run prod ops + sell + build for 18 more months.** Solo-founder fatigue is the #1 risk; if velocity drops, all assumptions weaken. *Test: founder takes 1 week off; what breaks?*
