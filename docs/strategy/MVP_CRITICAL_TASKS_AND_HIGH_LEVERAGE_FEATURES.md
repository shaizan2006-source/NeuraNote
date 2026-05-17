# MVP Critical Tasks and High-Leverage Features
*The prioritization filter — what to ship, what to cut, in what order*
*For: Ask-My-Notes solo founder, 90-day window*
*Date: May 2026*

---

## 0. What this document is for

This is the **decision-making document for when reality hits.** Read it before Sprint 1 starts. Re-read it the moment you realize you're behind.

The document classifies every feature in the 90-day plan into four tiers:

- **Tier 1 — MUST SHIP:** if these don't ship, the product fails its purpose. Never cut.
- **Tier 2 — HIGH LEVERAGE:** ship if humanly possible. Real retention/revenue impact.
- **Tier 3 — NICE TO HAVE:** first to cut. Adds polish, not survival.
- **Tier 4 — DEFERRED:** explicitly out of scope. Reaffirms the 90-day boundary.

If you're ever uncertain whether to push through with a task or cut it, find it in this document. Trust the tier.

---

## 1. Tier 1 — MUST SHIP (never cut)

These items are the floor. If any one doesn't ship, the 90 days has failed in some material way, and Sprint 4 starts from a broken foundation.

### 1.1 — Phase 0 Foundation (Week 1)
- 3 critical API security fixes (`/api/conversations`, `/api/delete-pdf`, `/api/upload`)
- `/dev/*` route gating in production
- Sentry error monitoring
- GitHub Actions CI/CD
- `/api/health` + UptimeRobot
- 13 missing migrations created
- Razorpay webhook idempotency

**Why never cut:** without this, the product is one bug away from a major incident. Trust evaporates. Recovery takes 6+ months.

**Time investment:** ~25 hours (Week 1).

### 1.2 — Brain Map promotion to production
**Why never cut:** the single highest-ROI feature in the existing codebase. Already 80% built. Surfacing it is the cheapest possible win.

**Time investment:** ~10 hours (Week 2-3).

### 1.3 — PDF processing realtime feedback
**Why never cut:** the worst current user experience is the silent post-upload wait. Fixing it makes the "wow moment" possible.

**Time investment:** ~4 hours.

### 1.4 — Empty state dashboard
**Why never cut:** the first impression for every new user. Currently terrible.

**Time investment:** ~5 hours.

### 1.5 — Onboarding rewrite (JEE/NEET vertical)
**Why never cut:** signals vertical commitment from minute 1. Generic positioning kills the product before any retention mechanic can compound.

**Time investment:** ~10 hours.

### 1.6 — Pricing rebuild (₹199 / ₹399 + Family + B2B)
**Why never cut:** current pricing (₹299/₹599) is wrong relative to market evidence (Knowt free, NotebookLM free, Mindgrasp dark patterns). Rebuild is non-negotiable.

**Time investment:** ~15 hours total across schema + UI + flow.

### 1.7 — 7-day Pro trial on every signup
**Why never cut:** removes the friction that kills paid conversion. Industry standard. No card required.

**Time investment:** ~3 hours.

### 1.8 — Push notification infrastructure
**Why never cut:** without push, the retention engine has no rails. Daily Briefing + Lunch Micro + Focus Anchor + Night Closure all require this.

**Time investment:** ~10 hours.

### 1.9 — Daily Morning Briefing pipeline
**Why never cut:** the single most important retention ritual. Establishes daily habit. Generates AI cost but delivers measurable retention impact.

**Time investment:** ~12 hours (pipeline + UI).

### 1.10 — Cohort system (assignment + handles + presence)
**Why never cut:** the community moat. Indian students need to feel they're part of a group. Anonymous handles + presence widget = belonging without comparison anxiety.

**Time investment:** ~12 hours total.

### 1.11 — Streak Freeze (replace fragile streak)
**Why never cut:** prevents the #1 anti-pattern in EdTech retention. Removes streak guilt as a churn driver.

**Time investment:** ~4 hours.

### 1.12 — PYQ database (≥500 questions)
**Why never cut:** the content moat. SEO compounding. Without this, retention plateaus and acquisition stays paid-only.

**Time investment:** ~30 hours engineering + 30 hours content curation.

### 1.13 — FSRS scheduler (replace SM-2)
**Why never cut:** SM-2 is a 1985 algorithm. Anki users have migrated. To compete on serious study, FSRS is the baseline.

**Time investment:** ~5 hours (algorithm + migration).

### 1.14 — Pre-exam mode transitions (T-30/T-7/T-1) + Exam Day silence (T-0)
**Why never cut:** the highest-stakes moments in a student's life. Getting these right defines the brand. Getting them wrong (sending a push at midnight before NEET) defines the brand differently.

**Time investment:** ~6 hours.

---

## Total Tier 1 time investment: ~190 hours

Solo founder available time in 90 days at 40 hours/week × 12 weeks = 480 hours.

After buffer for life, debugging, support, content writing, breaks: **~400 productive hours.**

Tier 1 takes 190 hours = **47.5% of available time.**

The other 52.5% is split between Tier 2 (~150-180 hrs) and Tier 3 (whatever's left).

**Read this sentence twice:** if you spend more than 200 hours on Tier 1 work, you've over-engineered. Move on. Tier 1 should be *enough,* not *excellent.*

---

## 2. Tier 2 — HIGH LEVERAGE (ship if humanly possible)

These features have real impact but are not survival-critical. Ship them if Tier 1 leaves time. The cut order within Tier 2 is specified.

### 2.1 — Peer percentile surfacing (1-day task) — TOP PRIORITY in Tier 2
**Why ship:** already computed, just hidden. 1 day of work for visible improvement on Progress + Dashboard.

**ROI ratio:** ~10× (small effort, real signal).

### 2.2 — Photo Doubt Cam
**Why ship:** differentiation feature. Demand exists. Leverages existing RAG. Cost-controllable via tier limits.

**Trade-off:** GPT-4o Vision adds AI cost per use. Must enforce free-tier limit (3/day) to control unit economics.

### 2.3 — Sunday Weekly Recap (audio + page)
**Why ship:** weekly ritual. Anchors the cycle loop. Highest expected open rate of any retention asset.

**Cut order if needed:** if Sprint 2 slips, ship audio-only without the image. Drop image to Sprint 4.

### 2.4 — Welcome Back flow (7+ day absence)
**Why ship:** recovers ~20% of users who would otherwise silently churn.

**Cut order:** simple version (just a friendly toast) is fine if full flow can't ship. Defer the 3-option screen to Sprint 4 if needed.

### 2.5 — JEE Main Mock Simulator
**Why ship:** weekly ritual potential. Builds on PYQ corpus. Highest investor-demo value.

**Cut order:** ship JEE Main only. NEET Mock, JEE Advanced Mock → Sprint 4+.

### 2.6 — Decompression Mode (rule-based)
**Why ship:** the care pillar made concrete. Differentiator against engagement-maximizing competitors.

**Cut order:** ship the 5 rule-based triggers. Sentiment-based detection → Sprint 4+.

### 2.7 — Brain Map snapshot sharing
**Why ship:** identity reinforcement + organic distribution. Easy to share to Instagram Stories.

**Cut order:** defer if Sprint 3 is tight. Sprint 4 can add this.

### 2.8 — Dashboard 4-mode system (Morning / Active / Slump / Night)
**Why ship:** time-of-day adaptation. Slump silence + Night Mode are the care pillar made real.

**Cut order:** ship Slump and Night Mode rules at minimum (just the guardrails). Full visual mode-switching can be polished Sprint 4.

### 2.9 — Friday Quiz of the Week
**Why ship:** Friday ritual completes the weekly loop.

**Cut order:** lowest priority in Tier 2. Defer to Sprint 4 if needed.

### 2.10 — Family tier
**Why ship:** unlocks a revenue segment (younger sibling + parent dashboard).

**Cut order:** ship primary-tier purchase only. Family invite flow + parent dashboard → Sprint 4 if needed.

### 2.11 — Anki import
**Why ship:** removes switching cost from the most committed segment of competitive-exam aspirants.

**Cut order:** if it doesn't ship by Sprint 3, defer to Sprint 4. Don't compromise PYQ work to fit it in.

### 2.12 — Pause subscription (30/60/90 day)
**Why ship:** kindness to students whose lives change (boards crunch, illness, family). Reduces churn that would otherwise be permanent.

**Cut order:** ship the basic version. Polish copy and reminders can come later.

---

## 3. Tier 3 — NICE TO HAVE (first to cut)

These are the items that get cut when Sprint 3 hits week 11 and reality bites. Cut without hesitation.

### 3.1 — Voice Tutor Call upgrade (initiated weekly calls)
**Cut reason:** chose Mock Simulator instead. Voice is high-cost, low-retention vs. Mock.

### 3.2 — Hindi / Hinglish voice tutor
**Cut reason:** locked out of scope. Sprint 5+.

### 3.3 — WhatsApp cohort group integration
**Cut reason:** out of scope. Bot infrastructure + moderation is multi-month work.

### 3.4 — Cohort battles (Tuesday/Thursday)
**Cut reason:** belongs in Sprint 4+ once cohort baseline retention proves the channel works.

### 3.5 — Real-name reveal for cohort friends
**Cut reason:** social pressure features defer to Sprint 4+ for trust + product-market-fit reasons.

### 3.6 — Advanced anxiety supports (breathing exercises, journaling)
**Cut reason:** medical-adjacent. Needs care. Sprint 5+.

### 3.7 — Profile page (with public-facing display)
**Cut reason:** privacy implications + design complexity. Sprint 4+ if at all.

### 3.8 — Lecture transcript processing
**Cut reason:** would partner with creators on this. Not for solo build phase.

### 3.9 — Coaching institute B2B platform
**Cut reason:** sales motion, not engineering. Pilot outreach only in Sprint 3. Real product Sprint 6+.

### 3.10 — Native React Native / Flutter mobile app
**Cut reason:** locked out of scope. PWA polish only.

### 3.11 — TypeScript migration
**Cut reason:** code quality, not user value. Sprint 4+ post-PMF.

### 3.12 — DashboardContext refactor (1467 lines)
**Cut reason:** working code. Refactor without user value is vanity. Sprint 4+ if needed.

### 3.13 — Real-time collaborative study rooms
**Cut reason:** novel feature, no validation, high complexity. Sprint 5+.

### 3.14 — Parent transparency reports (opt-in)
**Cut reason:** Family tier covers this minimally. Detailed report system Sprint 4+.

### 3.15 — A/B testing framework
**Cut reason:** at <1000 users, statistical power is insufficient. Sprint 5+ once sample size matters.

### 3.16 — Custom fine-tuned models
**Cut reason:** gpt-4o-mini + good prompts beat fine-tuning at this stage. Maybe never necessary.

---

## 4. Tier 4 — EXPLICITLY OUT OF SCOPE (don't waste cycles)

These items have been *decided* to not happen in 90 days. Don't re-litigate. Don't even discuss.

### 4.1 — University student vertical
**Decision rationale:** vertical commitment to JEE/NEET in 90 days. University = month 4+.

### 4.2 — Other Indian exams (UPSC, CA, GATE)
**Decision rationale:** JEE/NEET first. UPSC etc. = month 9+.

### 4.3 — Global market (US/UK/Other)
**Decision rationale:** India-first is strategic. Global = year 2+.

### 4.4 — Founder hires (developer, designer, content)
**Decision rationale:** solo execution. Hires after seed round.

### 4.5 — Paid acquisition
**Decision rationale:** organic + SEO + creator partnerships only. Paid = post-PMF.

### 4.6 — Equity dilution / fundraising
**Decision rationale:** focus on building. Fundraise conversation Sprint 4 onward, not during build.

### 4.7 — Marketplace / API for third parties
**Decision rationale:** premature. Sprint 12+ if ever.

### 4.8 — Crypto / NFT integrations
**Decision rationale:** never.

---

## 5. The cut order matrix

When Sprint 3 hits the wall (almost always Week 11), apply this matrix.

### If you're 1 week behind by Week 10:
Cut from Tier 3 only. Most of Tier 3 is already outside the 90-day plan, so this means: don't *add* anything new. Re-affirm the plan as is.

### If you're 1 week behind by Week 11:
Cut from Tier 2, in this order:
1. Friday Quiz of the Week (2.9)
2. Family tier polish (2.10)
3. Anki import (2.11)
4. Welcome Back flow (defer to simple toast) (2.4)
5. Brain Map snapshot sharing (2.7)

### If you're 2 weeks behind by Week 11:
Cut all of the above PLUS:
6. Sunday Weekly Recap (audio only, no image) (2.3)
7. Dashboard 4-mode system (keep guardrails, defer visual polish) (2.8)

### If you're 3 weeks behind by Week 11:
You should never be this far behind if you've been honest with the metrics. If you are, **stop building** and assess:
- Are you over-engineering? Look at your commits — are they trying to be perfect?
- Are you over-scoping individual features? Look at acceptance criteria — are you exceeding them?
- Are you avoiding hard tasks? Look at what's not done — is it the PYQ content curation (which is grind work, not engineering)?

The answer is almost always over-engineering. Ship 80% of remaining Tier 1, cut everything in Tier 2, accept that v1.0 ships smaller than planned.

---

## 6. The decision frameworks

When you're mid-sprint and unsure whether to push or cut, use these.

### Framework 1 — The "would Priya/Arjun notice?" test
Take any specific feature decision. Ask: would Priya (Class 11 JEE 2027 aspirant) or Arjun (NEET 2026 repeat) notice if this didn't ship?
- If yes: probably keep
- If no: probably cut

### Framework 2 — The "does this serve the moat?" test
Take any feature. Ask: does this feature serve one of the 6 moats (longitudinal memory, cohort, PYQ corpus, care, cultural fluency, founder narrative)?
- If yes to 1+ moat: keep
- If yes to 0 moats: probably cut

### Framework 3 — The "retention delta" test
Take any feature. Estimate: will this feature change Day-30 retention by ≥0.5 percentage points?
- If yes: keep
- If unclear or no: probably cut

### Framework 4 — The "cost of building vs cost of waiting" test
For Sprint 2+ features especially:
- Cost of building now = days of solo founder time
- Cost of waiting 30 days = ?
- If "cost of waiting 30 days" is high (user churn, missed window): build now
- If "cost of waiting 30 days" is low (nice-to-have, polish): defer

### Framework 5 — The "founder energy" test
Take any feature. Ask: am I excited to build this, or am I dreading it?
- Dread is often a signal of misalignment between feature and current priorities.
- If you've been dreading a Tier 2 feature for 2 weeks, the feature is probably Tier 3 actually. Cut it.
- If you're excited about a Tier 3 feature, ask why. Often it's avoiding hard work. Stay disciplined.

---

## 7. The ROI ranking of every Sprint 1-3 feature

Sorted by [estimated retention impact × estimated revenue impact] / [estimated build time]. Highest ROI on top.

| Feature | Tier | Build Time | Est. Retention Impact | Est. Revenue Impact | ROI Score |
|---|---|---|---|---|---|
| Phase 0 Security Fixes | 1 | 8h | n/a (prevents downside) | n/a | INF (mandatory) |
| Peer Percentile surfacing | 2 | 6h | Medium | Low | 9/10 |
| Brain Map promotion | 1 | 10h | High | Medium | 9/10 |
| Onboarding rewrite | 1 | 10h | High | High | 9/10 |
| Pricing rebuild | 1 | 15h | Medium | Very High | 9/10 |
| 7-day Pro Trial | 1 | 3h | Medium | High | 9/10 |
| Empty State + Sample PDF | 1 | 5h | High | Medium | 9/10 |
| Streak Freeze | 1 | 4h | High (prevents churn) | Low | 8/10 |
| PYQ Database (500 questions) | 1 | 60h | Medium (long-term) | Very High (SEO) | 8/10 |
| Daily Morning Briefing | 1 | 12h | Very High | Medium | 8/10 |
| Cohort system | 1 | 12h | High | Medium | 8/10 |
| Pre-exam mode transitions | 1 | 6h | High (preserves T-30 to T-1 retention) | Low | 8/10 |
| Push infrastructure | 1 | 10h | Enables retention engine | Low direct | 8/10 |
| FSRS scheduler | 1 | 5h | Medium | Low | 7/10 |
| Sentry + CI + Migrations | 1 | 15h | n/a (prevents downside) | n/a | 7/10 |
| Photo Doubt Cam | 2 | 11h | High | Medium | 7/10 |
| Mock Test Simulator | 2 | 13h | High | High | 7/10 |
| PDF Processing Feedback | 1 | 4h | Medium (activation) | Low | 7/10 |
| Sunday Weekly Recap | 2 | 7h | High | Low | 6/10 |
| Decompression Mode | 2 | 9h | Medium | Low | 6/10 |
| Brain Map snapshot share | 2 | 5h | Low | Low (organic distribution) | 5/10 |
| Welcome Back flow | 2 | 4h | Medium | Low | 5/10 |
| Family Tier | 2 | 6h | Low | Medium | 5/10 |
| Friday Quiz | 2 | 5h | Low-Medium | Low | 4/10 |
| Anki Import | 2 | 6h | Low | Low | 3/10 |
| Dashboard 4-mode | 2 | 6h | Medium (Slump+Night) | Low | 6/10 |

**ROI interpretation:**
- 8-10: do it, no question
- 6-7: do it if Tier 1 + critical Tier 2 done
- 4-5: do it last
- ≤3: cut without hesitation

---

## 8. The single most important number: Day-30 retention

If you can only track one metric over 90 days, it is **Day-30 retention.**

### Why
- Day-30 is far enough to filter casual signups (Day-1 is noise)
- Day-30 is close enough to learn from (Day-90 takes a quarter to measure)
- Day-30 is the leading indicator of Day-180 retention (which is the leading indicator of revenue at scale)

### Targets
- Baseline (current): 12-15% (estimated)
- End of Sprint 1: 15-18% (foundation alone shouldn't move it much)
- End of Sprint 2: 18-22% (retention engine kicking in)
- End of Sprint 3: 22-25% (mocks + PYQs + cycle awareness)
- 6 months: 30-35%
- 12 months: 35-45%

### What "improving Day-30" requires
- Every feature in Tier 1 + most of Tier 2 has been built for this metric
- The retention engine (briefing, cohort, weekly recap) directly moves this
- The care pillar (decompression, slump silence) prevents churn before it starts
- The vertical commitment (JEE/NEET focus) increases relevance

### What "improving Day-30" does NOT require
- More features
- More content
- Pricing changes
- Brand redesigns

If Day-30 is stuck, the answer is *almost never* to add more. It's to fix the foundation (Tier 1 work) and ensure the retention engine is actually running (Tier 2 mandatories).

---

## 9. The trigger-based cut protocol

Pre-decided triggers for when to cut what. Apply automatically without second-guessing.

### Trigger 1 — End of Sprint 1, retention not improved
**If:** Day-30 retention same as baseline (within 2 percentage points) at end of Week 4.

**Then:** Pause Sprint 2 retention engine work for 3 days. Talk to 20 users. Find out why Sprint 1 work didn't shift the curve. Re-prioritize Sprint 2 based on user input.

### Trigger 2 — End of Sprint 2, paid conversion <10%
**If:** Trial → paid conversion <10% at end of Week 8.

**Then:** Don't add Sprint 3 differentiation features. Spend Sprint 3 Week 9 on:
- Pricing A/B test (cut to ₹149/₹299?)
- Trial length test (extend to 14 days?)
- Onboarding conversion deep dive

### Trigger 3 — AI cost per user >₹60/month
**If:** AI cost per active user exceeds ₹60/month at any point.

**Then:** STOP new AI feature work. Spend 2 days on:
- Cache hit rate audit
- Model routing audit (is gpt-4o being overused?)
- Free tier abuse detection
- Cost-per-feature breakdown

### Trigger 4 — Error rate >3% for 2 consecutive weeks
**If:** Sentry shows >3% error rate for 2 weeks.

**Then:** STOP new feature work. Spend a week on stability:
- Top 10 Sentry errors → fix
- Performance audit
- Mobile compatibility issues

### Trigger 5 — Founder energy <50% for 2 weeks
**If:** You've been working long hours, feeling resentful or exhausted, for 2 weeks.

**Then:** Take a full week off. Cut Sprint 3 stretch items proactively. The 90-day plan accommodates this — your health is in the plan.

### Trigger 6 — One user requests Hindi/regional language
**If:** A paying user asks for Hindi support.

**Then:** Note for Sprint 5. **Do not** drop everything to build it. The 90-day plan is JEE/NEET English-first. Hindi is in Sprint 5+ regardless of one request.

### Trigger 7 — Competitor launches direct equivalent
**If:** Physics Wallah, NotebookLM, or another major player launches a near-direct JEE/NEET AI tool during the 90-day window.

**Then:** Don't panic. Read `MASTER_VISION_AND_MOAT.md` Section 9. Continue executing the plan. The moats (longitudinal memory, cohort, care, founder narrative) are not built faster by reactivity.

---

## 10. The honest 90-day budget

Let's be explicit about what you're committing to.

### Hours available
- 12 weeks × ~40 productive hours/week = ~480 hours
- Subtract: support (~30h), debugging (~30h), life (~30h) = **~390 productive build hours**

### Tier 1 budget: ~190 hours
- Phase 0 (Week 1): 25h
- Brain Map, peer percentile, empty state (Week 2): 15h
- Onboarding, dashboard, Q&A polish (Week 3): 15h
- Pricing schema, trial, landing (Week 4): 15h
- Push infrastructure (Week 5): 10h
- Briefing pipeline, Cohort (Week 6): 24h
- Photo Doubt Cam, pricing live, Streak Freeze (Week 7): 15h
- Weekly Recap, Friday Quiz (Week 8): 11h
- PYQ database engineering (Week 9): 30h
- FSRS, pre-exam transitions, decompression shadow (Week 10): 15h
- Mock simulator, decompression live (Week 11): 13h
- Polish, audit, ship (Week 12): 12h

### Tier 2 budget: ~120-150 hours
- Various Sprint 2-3 features that ship if Tier 1 doesn't overflow

### Tier 3 / non-coding: ~50 hours
- PYQ content curation (~30h)
- Founder narrative posts (5h)
- User interviews (10h)
- Investor prep (5h)

### Slack / buffer: ~30-50 hours
- Account for unexpected complexity, illness, life events

**This is tight but achievable** if discipline holds. If anything in the budget blows out by 20%, apply the cut order from Section 5.

---

## 11. The "is this v1 worth shipping?" final test

At end of Week 12, before tagging v1.0, ask these questions:

1. **Does it ship Phase 0 safely?** (security + monitoring + migrations)
2. **Can a new user reach their first wow moment within 3 minutes?** (empty state + sample PDF + first Q&A)
3. **Does it commit to JEE/NEET specifically?** (onboarding + landing + copy)
4. **Does it surface what makes the product unique?** (Brain Map + cohort + briefing)
5. **Does it not break basic kindness rules?** (no streak guilt, no slump shaming, no exam-day pushes)
6. **Does it have a content moat?** (≥500 PYQs indexed)
7. **Does it have a retention engine in motion?** (push + briefing + cohort + recap)
8. **Does it have a differentiation feature paying users would mention?** (Photo Doubt Cam OR Mock Simulator)
9. **Does it respect users on their hardest days?** (pre-exam + exam day + post-exam logic)
10. **Is it presentable to a seed investor with a straight face?** (technically sound, strategically clear, retention numbers improving)

If yes to 8+ of 10: ship v1.0. The remaining 2 are Sprint 4 work.

If yes to 6-7 of 10: ship v1.0 but call it beta. Communicate honestly with users.

If yes to <6: don't ship. Spend a week fixing the biggest gap. Then re-test.

---

## 12. The closing thought

A solo founder building EdTech in India in 2026 is doing something that has been attempted hundreds of times. Most attempts fail. The ones that succeed share a pattern:

- They are disciplined about scope. (Tier 1 + critical Tier 2. Everything else cut.)
- They are honest about retention metrics. (Day-30 is the only number that matters.)
- They are unafraid to cut. (Sprint 3 always has a cut list. Cut early; cut explicitly.)
- They show up. (390 productive hours over 90 days is a real commitment, but it's possible.)
- They treat the user as a person, not a metric. (The care pillar isn't a feature; it's a posture.)

The 14 documents in this series are the operational shell. The discipline to execute against them is the founder's work.

The product can absolutely win this niche.

It just has to ship.

---

*End of the 14-document series. Re-read `CLAUDE_CODE_EXECUTION_MASTER.md` Section 11 (Sprint 0) and start.*
