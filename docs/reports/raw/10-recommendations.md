# Phase 10 — Strategic Recommendations

*Generated 2026-05-27. Synthesizes Phases 1-9. Ranked by ROI vs effort. Specific, actionable, time-bound.*

---

## 10.1 Top 5 things to fix RIGHT NOW (next 30 days)

These are blockers, bugs, or near-zero-cost wins. Do these first.

### 1. Fix pricing data drift (`planLimits.js` vs `pricing.js`)
- **What:** `planLimits.js` has stale prices (₹299/₹599). `pricing.js` is correct (₹199/₹399/₹4499).
- **Why:** Active revenue-leak bug. Any UI surface reading `PLANS[plan].price` shows wrong number.
- **Effort:** 1-2 hours
- **Expected impact:** Eliminates "I was charged a different price" support tickets and trust erosion. Prevents potential chargebacks.
- **How:** Delete `price` field from `planLimits.PLANS` OR derive it from `pricing.js`. Add a unit test asserting UI prices match Razorpay order amounts.

### 2. Wire up Anthropic Claude as OpenAI fallback
- **What:** `@anthropic-ai/sdk@0.90.0` is installed but unused. Wire it as a fallback in `/api/ask` when OpenAI returns 429/500.
- **Why:** Closes the #2 risk in Phase 8 (T1, score 20/25). Removes single-OpenAI SPOF. Marketing bonus: "Powered by Claude + GPT" is a Pro+ differentiator.
- **Effort:** 1 week (SDK is installed; need streaming protocol adapter + prompt parity testing)
- **Expected impact:** Eliminates whole-product outage on OpenAI issues. Enables Pro+ tier (Phase 6 #19).

### 3. Add monthly $-budget per user circuit breaker
- **What:** Phase 3 CRIT-1. Track per-user AI spend daily; hard cap at e.g. ₹500/mo for Pro users.
- **Why:** A single abusive Pro user can cost ₹11,250/mo (15 voice calls/day × 10 min × ₹25/min) against ₹399/mo revenue.
- **Effort:** 2-3 days (table + nightly aggregator + check in API routes)
- **Expected impact:** Eliminates worst-case margin collapse scenario.
- **How:** Add `user_ai_spend_daily` view. Add `metadata: { tokens, cost_usd, model }` to AI events in `learning_events`. Check sum-this-month before voice call start.

### 4. Gate `/dev/*` and `/api/concepts/backfill` in production
- **What:** Phase 3 CRIT-3. Audit's CQ-8 still applies. `/dev/graph/[docId]` leaks any user's concept graph; `/api/concepts/backfill` triggers expensive gpt-4o.
- **Why:** Information disclosure + cost leak vectors.
- **Effort:** 1 hour
- **Expected impact:** Closes the only remaining "exploitable in prod" surface.
- **How:** Verify `lib/devGuard.js` is imported in each handler with a 404 return when `NODE_ENV !== "development"` AND user is not internal_dev.

### 5. Build minimal admin dashboard (user-management page)
- **What:** Single page at `/admin/users` showing email, plan, last active, current AI spend; with "change plan" + "refund" buttons.
- **Why:** Currently every paying customer issue requires direct DB access. Not scalable past 100 paying users.
- **Effort:** 5-7 days
- **Expected impact:** Operational sanity. Enables customer support without engineering involvement.
- **How:** Gated by `internal_dev` flag. Direct Supabase queries (service role). No public API.

**Sum of effort for the top 5: ~2-3 weeks.** Output: a measurably more stable, observable, and reversible-from-incidents product.

---

## 10.2 Top 5 things to build NEXT (next 90 days)

These set up the multi-million ARR trajectory. Build only after the top 5 above.

### 1. Fix activation funnel (empty state + starter PDF + first-question prompt)
- **What:** Phase 7 §7.3. The first 10 minutes of a new user's experience is broken.
- **Why:** Single biggest lever for trial→paid conversion. Audit identified this 12 days ago and it's still open.
- **Effort:** 1 week
- **Expected impact:** +30% Day 0 activation; +50-100% conversion improvement downstream.
- **Success metric:** % of new signups asking 3+ questions in first session goes from <50% to >75%.

### 2. Build the cost / funnel dashboard (Phase 9 essential metrics)
- **What:** Internal dashboard with: MRR, daily new users, funnel (signup → trial → paid), Day-7 retention curve, top 20 users by AI cost.
- **Why:** Without these, every strategic decision is intuition. Investors will ask. Phase 9 §9.10 is the priority list.
- **Effort:** 2-3 weeks
- **Expected impact:** Unblocks all subsequent A/B testing and prioritization.
- **Success metric:** Founder can answer "what's our Day 30 retention by cohort?" in <30 seconds.

### 3. Annual-first checkout + UPI mandate flow
- **What:** Phase 7 §7.5. Make annual the primary checkout CTA. Add UPI auto-debit setup for monthly users.
- **Why:** India's 80% credit-card mandate failure rate per `market_research_report.md`. Annual upfront is the most reliable revenue path.
- **Effort:** 1-2 weeks
- **Expected impact:** +25-45% on annual conversion share; +20-30% LTV from reduced auto-debit churn.

### 4. WhatsApp admin program (50 group admins × free Pro for pinned post)
- **What:** Phase 7 §7.2. Identify 50 university WhatsApp group admins; offer lifetime Pro for pinning a referral link.
- **Why:** Untested viral channel. Untested = unknown CAC = de-risk before scaling paid.
- **Effort:** 3-4 weeks (outreach is human-time-intensive)
- **Expected impact:** 500-2,000 net new signups in pilot. Proves or kills the channel cheaply.

### 5. Add `src/middleware.ts` + finish auth helper rollout
- **What:** Phase 3 HIGH-1. Make `verifyAuth()` defense-in-depth via global middleware. Audit all 96+ routes to confirm none use inline copy-pasted auth.
- **Why:** A regression PR that forgets `verifyAuth()` would ship unauth'd otherwise. Prevention >> detection.
- **Effort:** 2-3 days
- **Expected impact:** Eliminates a class of regression bugs. Reduces "did I add auth?" cognitive load on every new route.

---

## 10.3 Top 3 strategic bets (next 6-12 months)

These are bigger, riskier moves with bigger payoffs.

### Bet 1: Vertical expansion to UPSC + GATE
- **Thesis:** The product is curriculum-aware via 11-domain prompts + PYQ infrastructure. UPSC ARPU is higher (₹599+ acceptable). GATE adds a B.Tech-graduate continuum from current users.
- **Investment:** 8-12 weeks of curriculum work (PYQ ingestion, prompt tuning, content marketing).
- **Expected payoff:** +30-50% TAM expansion. UPSC unlocks the 1M+ aspirant market that pays.
- **Downside risk:** Diluted focus during a critical phase of JEE/NEET execution. Don't do this until JEE/NEET MRR exceeds ₹5L sustainably.
- **Decision rule:** Start UPSC pilot only after Path B (Phase 6) Stage 2 metrics are achieved.

### Bet 2: Series A fundraise at ₹15-25 crore valuation
- **Thesis:** With 6-12 months of execution at ₹5-15L MRR + 20%+ MoM growth + 30%+ Day-30 retention, the right time to raise is when bootstrap funding becomes the constraint on growth (not the founder's bandwidth).
- **Investment:** 3-4 months of founder time + 1-2% dilution.
- **Expected payoff:** ₹3-5 crore at ₹15-25 crore pre-money. Funds 18-24 months of operations + 1-2 hires.
- **Downside risk:** Distraction from product execution. Indian edtech multiples have compressed.
- **Decision rule:** Only fundraise when (a) ARR growth > 15% MoM, (b) Day-30 retention > 30%, (c) at least 1 viable acquisition channel proven (CAC payback < 6 months).

### Bet 3: Voice tutor as standalone paid premium tier (Pro+)
- **Thesis:** Voice is the most "wow" demo and most expensive feature. Bundling it in Pro at ₹399 sets up margin pressure. Carving it out as "Pro+ ₹699/mo" or "₹49 per call" lets cost scale with revenue.
- **Investment:** 2-3 weeks of pricing UX + cost-per-minute tracking.
- **Expected payoff:** Pro tier becomes profitable; voice becomes a separate revenue line.
- **Downside risk:** Loss of a key differentiator from the bundled Pro experience.
- **Decision rule:** Only carve out if Pro gross margin drops below 50% sustained.

---

## 10.4 Top 3 things to KILL or SHRINK

### Kill 1: `@anthropic-ai/sdk` (decision: turn on, not remove)
- **Reframe:** Originally flagged as dead dependency. Re-evaluated as strategic asset (Bet 1 above). Don't remove — wire it up.
- **Time saved if killed:** 5 minutes
- **Time saved if used strategically:** Removes a 20-point risk, opens new revenue tier
- **Decision:** USE IT, don't kill it.

### Kill 2: Custom `__META__` streaming protocol (v1 → standard SSE v2)
- **Why:** Source of architectural debt for negligible benefit over SSE. Existing clients can be migrated gradually.
- **Effort to kill:** 3 days
- **Decision:** Schedule the v2 migration for Sprint 3-4. Add `"v": 1` to existing protocol now (1 hour) as bridge.

### Kill 3: Three markdown libraries → one (`react-markdown` only)
- **Why:** Three different renderers can produce subtly different output for the same input. Bundle bloat is secondary; correctness is primary.
- **Effort to kill:** 1-2 hours
- **Decision:** Drop `marked` and `markdown-it`. Standardize on `react-markdown` + `remark-gfm`.

### (Bonus kill: dead directory + checked-in artifacts)
- `src/next-app/` (likely worktree leftover), `tsconfig.tsbuildinfo`, `test-output.txt`, `build_output.txt` should not be in working tree. **Effort: 30 min.**

---

## 10.5 The single most important experiment to run next

**Experiment:** A/B test Pro pricing at ₹199 vs ₹399 vs ₹499/mo, on new sign-ups for 4 weeks.

**Why this:** Three of the five paths to $1M ARR in Phase 6 depend on Pro pricing assumptions. If Indian WTP is genuinely ₹199 floor (one hypothesis), then Paths B-D all need revision. If WTP supports ₹499 (another hypothesis), then ARR projections under-shoot by 25%.

**Sample size needed:** ~500 sign-ups per arm to detect a 10% conversion difference at 80% power (so ~1,500 total).

**Time:** 4-6 weeks at current acquisition rate (assuming ~50-100 new signups/day).

**Outcome scenarios:**
- If ₹499 conversion is within 10% of ₹399 → raise prices. +25% MRR for free.
- If ₹199 conversion is 2x ₹399 → consider lowering Pro to ₹199 to spike growth, defer ARPU to upsells.
- If ₹399 wins decisively → current pricing is right; double down on volume.

**Why not just do it:** Need the funnel/conversion measurement (Phase 9) in place first, otherwise the test is uninterpretable.

---

## 10.6 Decision tree summary

```
Today's situation: ~67% feature complete, ~38 dev-days of debt, 30 new features in 12 days.

Path forward:
  Week 1-2:    Top 5 fixes (10.1)
  Week 3-4:    Begin top 5 builds (10.2)
  Week 5-8:    Continue + start WhatsApp pilot + start pricing A/B
  Week 9-12:   Measurement L2 (Phase 9 §9.10) operational
  Month 4-6:   Continue execution; decide vertical expansion based on metrics
  Month 6-9:   If metrics support, begin Series A conversations
  Month 9-12:  Vertical expansion OR international (whichever metrics suggest)

If a metric collapses:
  - Activation < 30% after fix: revisit empty-state design
  - Day 30 retention < 20% after 60 days: pause acquisition, fix product
  - AI cost per user > 50% of ARPU: enforce monthly cap urgency
  - Conversion rate < 5% after pricing test: revisit positioning

If runway < 9 months without revenue growth:
  - Raise pre-seed bridge OR
  - Reduce voice tutor budget (highest cost feature) OR
  - Pivot pricing aggressively
```
