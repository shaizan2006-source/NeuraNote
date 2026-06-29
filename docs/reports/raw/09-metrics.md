# Phase 9 — Metrics Dashboard (Current State + Tracking Gaps)

*Generated 2026-05-27. The honest version: most of these are not currently measured. The point of this section is to define what to measure first.*

---

## 9.1 Measurement maturity

| Maturity | What it means | Where Ask-My-Notes is |
|----------|---------------|------------------------|
| L0 — No data | Pure intuition | — |
| L1 — Vanity numbers | Just total signups visible | **Close to here** |
| L2 — Funnel basics | Activation + retention curves | Should be here in 30 days |
| L3 — Cohort + LTV | Per-cohort behavior over time | 90-day goal |
| L4 — Predictive + AB-tested | Pre-built experiment engine | Future |
| L5 — Automated decisioning | Models drive product changes | Future |

The product has the *infrastructure* for L3 (the `learning_events` table is canonical, with realtime broadcast). The *dashboards / queries / interpretation* are at L1.

---

## 9.2 User metrics

| Metric | Currently tracked? | Source | Today's value |
|--------|--------------------|--------|---------------|
| Total registered users | Yes — Supabase Auth | Supabase dashboard | TBD (ask founder) |
| MAU | Approximate | `learning_events` aggregate | **NEEDS QUERY** |
| WAU | No | derivable from learning_events | NEEDS DASHBOARD |
| DAU | No | learning_events | NEEDS DASHBOARD |
| DAU/MAU stickiness ratio | No | derived | NEEDS DASHBOARD |
| Onboarding completion rate | No | `/api/onboarding/complete` calls vs signups | NEEDS QUERY |
| Days to first study session | No | derived from learning_events | NEEDS QUERY |
| Avg session length | No | learning_events duration_ms | NEEDS QUERY |
| Sessions per user per week | No | learning_events | NEEDS QUERY |

**Action:** build a Supabase view called `user_activity_daily` that aggregates `learning_events` by user × date. From this view, all 8 metrics above derive trivially. Effort: 1 day.

---

## 9.3 Conversion metrics

| Metric | Currently tracked? | Source | Today |
|--------|--------------------|--------|-------|
| Trial activation rate | No | `user_plans` table + signup timestamps | NEEDS QUERY |
| Trial → Paid conversion | No | `user_plans` history + `payment_orders` | NEEDS COHORT QUERY |
| Pricing tier distribution | Approximate | `user_plans` | Approx 80% Free / 15% Student / 5% Pro |
| Avg time to conversion | No | derived | NEEDS QUERY |
| % choosing Annual | Approximate | `payment_orders.cycle` | NEEDS QUERY |

**Action:** build a Supabase view `conversion_funnel_daily` that for each signup-day cohort tracks: signups, trial-starts, trial-day-3-active, trial-day-7-converted, churned. Effort: 1 day.

---

## 9.4 Retention metrics

| Metric | Currently tracked? | Source | Today |
|--------|--------------------|--------|-------|
| Day 1 retention | No | `learning_events` | NEEDS QUERY |
| Day 7 retention | No | same | NEEDS QUERY |
| Day 30 retention | No | same | NEEDS QUERY |
| Day 90 retention | No | same | NEEDS QUERY |
| Cohort retention curves | No | same | NEEDS DASHBOARD |
| Monthly churn rate | No | `user_plans` plan transitions | NEEDS QUERY |
| LTV (months × ARPU) | No | derived | NEEDS QUERY |

**Action:** classic SQL retention query against `learning_events` grouped by signup cohort. Effort: 1-2 days for SQL + chart.

---

## 9.5 Revenue metrics

| Metric | Currently tracked? | Source | Today |
|--------|--------------------|--------|-------|
| MRR | Manual | `payment_orders` + `user_plans.cycle` | NEEDS DASHBOARD |
| ARR | Derived | 12× MRR | — |
| ARPU by tier | Manual | sum(`payment_orders.amount`) / users | NEEDS QUERY |
| Revenue growth (MoM) | No | derived | NEEDS QUERY |
| Net revenue retention | No | cohort revenue over time | NEEDS QUERY |
| Refund / chargeback rate | No | `payment_orders` status | NEEDS QUERY |

**Action:** Razorpay also has dashboards for some of this. But integrating into the in-product admin dashboard would close the operator-visibility loop. Effort: 2 days.

---

## 9.6 Engagement metrics

| Metric | Currently tracked? | Source | Today |
|--------|--------------------|--------|-------|
| Q&A per user per week | Derivable | `qa_usage` | NEEDS QUERY |
| FSRS cards reviewed per user per week | Derivable | `learning_events` event_type filter | NEEDS QUERY |
| Briefings opened (% of generated) | Yes | `briefing_listens` / `daily_briefings` | NEEDS QUERY |
| Mock tests taken per user per month | Yes | `mock_test_*` tables | NEEDS QUERY |
| Cohort participation rate | Yes | `cohort_members` activity | NEEDS QUERY |
| Voice calls per user per week | Yes | `voice_calls` | NEEDS QUERY |
| Photo doubts per user per week | Yes | `photo_doubts` | NEEDS QUERY |
| Push notification click-through rate | No | needs event log | NEEDS INSTRUMENTATION |
| WhatsApp message reply rate | No | webhook events | NEEDS INSTRUMENTATION |

---

## 9.7 AI cost metrics

| Metric | Currently tracked? | Source |
|--------|--------------------|--------|
| Cost per user per month | No | needs per-event token tracking in `learning_events.metadata` |
| Cache hit rate | Derivable | `qa_cache` reads vs `qa_usage` records |
| Avg tokens per Q&A | No | needs token logging |
| Total monthly OpenAI spend | Yes (OpenAI dashboard) | external |
| Total monthly TTS / Whisper cost | Yes | external |
| Per-feature cost breakdown | No | needs event-level instrumentation |

**Action (critical for Phase 3 CRIT-1):** add `metadata: { tokens_in, tokens_out, cost_usd, model }` to every AI-event in `learning_events`. Aggregate nightly into `user_ai_spend_daily`. This *also* powers the monthly $-cap circuit breaker. **Effort: 3-5 days. Value: high — closes a critical risk.**

---

## 9.8 Technical metrics

| Metric | Currently tracked? | Source |
|--------|--------------------|--------|
| Lighthouse scores | No | needs CI step or external (PageSpeed Insights) |
| API p50/p95/p99 latency | No | could be derived from Sentry transactions or Vercel logs |
| Error rate | Yes | Sentry |
| Uptime % | No | external (UptimeRobot) |
| Page load time | No | Sentry browser monitoring (if enabled) |
| Cron success rate | No | derived from cron table or Sentry breadcrumbs |

**Action:** UptimeRobot free tier monitors `/api/health`, briefings cron URL, and 8 other crons via secret token. Effort: 30 min. Value: medium.

---

## 9.9 Recommended dashboard architecture

Build a single `/admin/dashboard` page with three sections:

### Section 1 — Acquisition & Funnel
- Daily signups (7-day rolling)
- Funnel: visitors → signup → onboarding-complete → first-Q&A → trial-start → trial-D3 → trial-D7 → paid
- UTM source breakdown

### Section 2 — Engagement & Retention
- DAU / WAU / MAU
- Cohort retention curves (Day 0/1/7/30)
- Feature engagement heatmap (which features drive sessions)

### Section 3 — Revenue & Cost
- MRR + ARR
- Top 20 users by AI cost (the cost-runaway watchlist)
- Conversion rate by source / cohort
- Refund / churn rate

**Effort to build:** 2-3 weeks of focused work. **Value:** all subsequent decisions become evidence-based instead of intuition-based.

---

## 9.10 The "must measure in next 30 days" list (priority order)

1. **AI cost per user per day** (closes CRIT-1, enables monthly cap)
2. **Trial → Paid conversion rate** (enables A/B testing pricing)
3. **Day 7 retention by cohort** (proves whether activation interventions work)
4. **MRR + month-over-month growth** (the headline metric for any investor conversation)
5. **Q&A cache hit rate** (validates the largest unit-economics lever)

These 5 metrics unblock 80% of strategic decision-making for the next 6 months.
