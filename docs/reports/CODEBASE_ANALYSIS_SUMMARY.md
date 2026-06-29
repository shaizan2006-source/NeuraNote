# Ask My Notes — Codebase Analysis Executive Summary

**Date:** 2026-05-27 · **Version:** 1.0 · **Author:** Claude (Opus 4.7) for Shafi

---

## What this report is

A self-contained strategic intelligence document covering the *current* state of the Ask My Notes codebase, its competitive position, monetization potential, growth opportunities, and the next-90-day path forward. Built from a live codebase scan (2026-05-27) reconciled against the project's own May 15-16 audit docs, and supplemented with public market research.

## The headline (in one sentence)

**Ask My Notes is a feature-complete, technically sophisticated AI study product (~96 API routes, ~35 pages, ~35 DB tables, 10 active crons, ~67% overall completion) sitting on roughly ₹0-5L MRR with the engineering foundation to reach $1M ARR — but acquisition channel proof and measurement infrastructure are the gating constraints, not product quality.**

## What's changed since the last audit (12 days, 2026-05-15 → 2026-05-27)

- ✅ All 3 CRITICAL security issues from the May 15 audit are **fixed**
- ✅ Sentry, CI/CD, `/api/health` are **wired up**
- ✅ Webhook idempotency via `payment_orders` table — **fixed**
- ✅ The "13 missing database migrations" debt is **largely closed** (22 new migrations including a baseline schema)
- 🆕 ~30 new features shipped: PYQ marketplace, Mock Tests, Photo Doubt Cam, Cohorts + Leaderboard, Family Plan (₹4,499/yr), Daily Briefings (cron-generated), Weekly Friday Quiz, Streak Freeze, WhatsApp webhook, Web Push (VAPID), Trial Conversion Experience (cognitive-load detection), Account Deletion + Privacy + Data Export (DPDP), UTM/referral tracking
- 🆕 FSRS spaced repetition (`ts-fsrs`) layered on top of SM-2

## The 3 biggest insights

1. **Engineering debt is shrinking faster than it's accumulating.** The team has burned down ~13 days of audit debt while adding ~5 days of new debt in 12 days — net debt reduction of ~8 days. Remaining debt is concentrated in code architecture (DashboardContext monolith, no root middleware) and UX polish (light mode, mobile nav), not in scary security or data-integrity territory.

2. **The product's commercial defensibility is its data graph, not its features.** The Brain Map (user's accumulated concept mastery) is the single strongest moat. Features like voice tutoring or AI quiz generation can be copied by competitors in 6-12 months; the Brain Map for a user with 12+ months of study history cannot be replicated without 12+ months of that user's data. **All strategic decisions should protect, deepen, and exploit this moat.**

3. **Acquisition channel proof, not product completion, is the gating constraint to scale.** The product is more complete than its distribution. Five paths to $1M ARR all assume some viable low-CAC acquisition channel; none of them are yet validated. The WhatsApp admin program (50 admins × free Pro for pinned posts) is the highest-leverage low-risk experiment to run next.

## The 5 most important moves (next 30 days)

| # | Move | Effort | Why |
|---|------|--------|-----|
| 1 | Fix pricing data drift (`planLimits.js` vs `pricing.js`) | 1-2 hrs | Active revenue-leak bug |
| 2 | Wire Anthropic Claude as OpenAI fallback | 1 wk | Closes the single largest production SPOF (Score 20/25 risk); SDK already installed |
| 3 | Add per-user monthly $-budget circuit breaker | 2-3 days | Closes margin-collapse-from-abuse vector (₹11k/mo per power user possible) |
| 4 | Gate `/dev/*` + `/api/concepts/backfill` in production | 1 hr | Information disclosure + cost-leak vectors |
| 5 | Build minimal `/admin/users` dashboard with plan management | 5-7 days | Operations can't scale past 100 paying users without it |

## The 5 most important builds (next 90 days)

| # | Build | Effort | Why |
|---|-------|--------|-----|
| 1 | Fix activation funnel (starter PDF + empty-state + first-question prompt) | 1 wk | Single biggest conversion lever |
| 2 | Build the metrics dashboard (MRR, funnel, Day-7 retention, top 20 users by AI cost) | 2-3 wks | Unblocks all evidence-based decisions |
| 3 | Annual-first checkout + UPI mandate setup | 1-2 wks | India recurring-payment failure rate is 80% — annual is the reliable path |
| 4 | WhatsApp admin program (50 admins × free Pro for pinned posts) | 3-4 wks | Cheapest viral-channel experiment available |
| 5 | Add `src/middleware.ts` + complete `verifyAuth()` rollout | 2-3 days | Defense-in-depth for new routes |

## The pitch in 3 sentences

> Ask My Notes turns a student's own PDFs into a personalized AI tutor with citation-grounded answers, FSRS-backed flashcards, AI voice tutoring, and a live concept-graph of everything they've mastered. Unlike Physics Wallah or Doubtnut, we don't push *our* content — we adapt to *yours*; unlike ChatGPT, we know your exam, your syllabus, and your weak topics. The Brain Map of every concept a student has touched becomes a switching cost that compounds over the 12-24 months they prepare for JEE, NEET, UPSC, or CA.

## Risk heatmap

| Risk | Score | Status |
|------|-------|--------|
| Solo-founder key-person dependency | 25/25 | Highest priority for org investment |
| OpenAI outage / rate limit | 20/25 | Mitigated in 1-2 weeks via Anthropic fallback |
| Knowledge concentrated in founder | 20/25 | Document + ADRs |
| Cost runaway from abusive user | 16/25 | Closed by Move #3 above |
| OpenAI ships native "Study Mode" | 16/25 | Defended by Brain Map moat + India curriculum specificity |

The two highest-scoring risks are *organizational* (B8, O6), not technical. **The highest-leverage hire is not an engineer — it's a co-founder or operational deputy.**

## How to use this document

The full report (15 sections, ~125 pages PDF) is at `docs/reports/CODEBASE_ANALYSIS_2026-05-27.pdf`. The 10 raw section files are at `docs/reports/raw/`.

Paste this executive summary (or the full PDF) into a new Claude conversation to start strategic planning. The "Questions to Ask Claude in Your Next Strategy Session" appendix at the end of the full report provides specific prompts optimized for downstream decisions.

---

*The product has the data. The PDF surfaced it. The next moves are now your decision.*
