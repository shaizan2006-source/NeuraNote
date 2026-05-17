# Claude Code Execution Master
*The index and router for sprint-by-sprint execution*
*For: Ask-My-Notes solo founder using Claude Code*
*Date: May 2026*

---

## 0. What this document is

This is the **operating manual for the next 90 days**. It tells you:
- What to work on each week
- Which files to read first
- How to feed sprint files into Claude Code
- How to know when a sprint is "done"
- What to cut when reality hits

It is **not** a feature spec (those live in `ELITE_FEATURE_ARCHITECTURE.md`). It is **not** strategy (that's `MASTER_VISION_AND_MOAT.md`). It is the project-management glue that makes the 14-document system actually executable.

---

## 1. The document map

```
┌──────────────────────────────────────────────────────────────┐
│                    READ FIRST (1 hour)                        │
│  1. MASTER_VISION_AND_MOAT.md      — why                     │
│  2. UNIFIED_PRODUCT_STRATEGY.md    — how (high-level)        │
│  3. STUDENT_PSYCHOLOGY_EXECUTION.md — who you serve          │
└─────────────────────────────┬────────────────────────────────┘
                              │
┌─────────────────────────────▼────────────────────────────────┐
│                READ BEFORE BUILDING (2 hours)                 │
│  4. ELITE_FEATURE_ARCHITECTURE.md   — what to build          │
│  5. RETENTION_ENGINE_BLUEPRINT.md   — how to retain          │
│  6. UI_UX_SYSTEM.md                 — how it feels           │
│  7. MOBILE_AND_GAMIFICATION.md      — phone + identity       │
└─────────────────────────────┬────────────────────────────────┘
                              │
┌─────────────────────────────▼────────────────────────────────┐
│              READ BEFORE WRITING CODE (1 hour)                │
│  8. AI_SYSTEMS_ARCHITECTURE.md      — AI pipelines           │
│  9. TECHNICAL_ARCHITECTURE.md       — backend + data         │
└─────────────────────────────┬────────────────────────────────┘
                              │
┌─────────────────────────────▼────────────────────────────────┐
│              EXECUTION DOCUMENTS (you live in these)          │
│  10. THIS DOCUMENT                  — the index              │
│  11. SPRINT_01_IMPLEMENTATION.md    — weeks 1-4              │
│  12. SPRINT_02_IMPLEMENTATION.md    — weeks 5-8              │
│  13. SPRINT_03_IMPLEMENTATION.md    — weeks 9-12             │
│  14. MVP_CRITICAL_TASKS_AND_HIGH_LEVERAGE_FEATURES.md       │
│      — prioritization + cut list when reality hits          │
└──────────────────────────────────────────────────────────────┘
```

### Reading sequence on Day 1
Total: ~4 hours, but worth it before writing any code.

1. Master Vision (45 min) — internalize the "why"
2. Unified Strategy (30 min) — the operational picture
3. Psychology Execution (45 min) — the human substrate
4. Feature Architecture (60 min, skim Sprint 1 deep) — what you're building
5. Sprint 01 file (30 min, deep) — what to do tomorrow
6. MVP Critical Tasks (15 min) — the cut list

After this, you're calibrated. Start building.

### Re-reading cadence
- **Master Vision:** read again at end of Sprint 1, end of Sprint 2, end of Sprint 3, and any time you're confused about a feature decision.
- **Sprint files:** read at start of each week within the sprint.
- **MVP Critical Tasks:** read when behind schedule or making cuts.
- **Psychology Execution:** read before writing any user-facing copy.

---

## 2. The sprint structure

Each sprint is 4 weeks. Each week has a theme.

### Sprint 1 — Foundation (Weeks 1-4)
**Theme:** Stop the bleeding. Surface what's hidden. Narrow the positioning.

- Week 1: Phase 0 stabilization
- Week 2: Visibility unlocks (Brain Map, peer percentile, PDF feedback)
- Week 3: Dashboard + onboarding rewrite
- Week 4: Pricing groundwork + Sprint 1 polish

### Sprint 2 — Retention Engine (Weeks 5-8)
**Theme:** Build the systems that hold users for years.

- Week 5: Push infrastructure
- Week 6: Briefing + Cohort
- Week 7: Photo Doubt Cam + Pricing live
- Week 8: Weekly Recap + Sprint 2 polish

### Sprint 3 — PYQ Engine + Polish (Weeks 9-12)
**Theme:** Lock in the content moat. Ship for users.

- Week 9: PYQ database + SEO pages
- Week 10: FSRS scheduler
- Week 11: Mock simulator + Decompression
- Week 12: Polish, audit, ship

---

## 3. How to use sprint files with Claude Code

Each sprint file (`SPRINT_01_IMPLEMENTATION.md`, etc.) contains:
- Day-by-day or feature-by-feature work breakdowns
- Acceptance criteria for each task
- Specific Claude Code prompts (paste-ready)
- Verification steps after each task

### The Claude Code workflow

**Step 1 — Set the working context**

Before any session, open the sprint file in Claude Code's project. Reference it explicitly:

> "I'm working on Sprint 1, Week 1, Day 2 from `SPRINT_01_IMPLEMENTATION.md`. The task is: Fix the auth vulnerability in `/api/conversations`. Acceptance criteria: returns 401 without Bearer token, derives user_id from JWT only."

**Step 2 — Reference architecture as needed**

When Claude Code asks for context, point to specific architecture docs:

> "Auth pattern is defined in `TECHNICAL_ARCHITECTURE.md` Section 3 (API conventions). Apply that pattern."

**Step 3 — Verify before moving on**

After each task, run the verification steps explicitly:

> "Run the verification commands for this task and report results."

**Step 4 — Commit + log**

Each completed task = one commit with a clear message. Sprint file marks task as done.

### The Claude Code prompt template

A working prompt looks like this:

```
TASK: [task name from sprint file]
SPRINT: [sprint number, week, day]
ARCHITECTURE REFERENCE: [doc + section]
ACCEPTANCE CRITERIA:
  - [criterion 1]
  - [criterion 2]
  - [criterion 3]

Files to modify:
  - [path]
  - [path]

Constraints:
  - Do not refactor outside this task
  - Follow patterns from [reference doc]
  - Add migration if schema changes

VERIFICATION:
  - [test/command 1]
  - [test/command 2]
```

The sprint files contain this scaffolding for every task. Copy and paste into Claude Code.

---

## 4. The weekly rhythm

A solo founder's week of execution.

### Monday morning (2 hours)
- **9-10am:** Read this week's section in the current sprint file.
- **10-11am:** Update the cost dashboard. Check retention metrics. Read user feedback from past week.

### Monday afternoon — Friday afternoon (build mode)
- **Deep work blocks:** 90-min focus sessions, target 4-6 per day.
- **Claude Code execution:** Use sprint file tasks as the queue.
- **Commits:** Daily minimum 3 commits. End-of-day push.

### Friday afternoon (2 hours)
- **2-3pm:** Sprint progress review. Mark completed tasks. Move incomplete to next week.
- **3-4pm:** Weekly metrics roll-up. Note retention trends. Update the Master Vision check (are we still on track?).

### Saturday (4 hours, optional)
- Catch-up day. Skip if family / personal needs.
- Polish, bug fixes, content work.

### Sunday (rest day)
- Don't work. Founder care = product care.
- Read user feedback (5 min, on phone).
- Maybe write one social post (founder narrative moat — see Master Vision Section 6, Moat 6).

---

## 5. The "definition of done" for each sprint

### Sprint 1 is done when:
- [ ] All Phase 0 work complete (security, Sentry, CI, migrations, monitoring)
- [ ] Brain Map accessible in production at non-dev route
- [ ] Peer percentile visible on dashboard
- [ ] Empty state dashboard live (sample PDF option works)
- [ ] PDF processing status feedback live
- [ ] Onboarding rewritten with JEE/NEET focus
- [ ] Pricing schema in place (new tiers configurable)
- [ ] Dashboard 4-mode system implemented
- [ ] Landing page rebuilt
- [ ] Lighthouse mobile score ≥85
- [ ] No regressions in existing features (verified)
- [ ] All tasks committed and deployed

### Sprint 2 is done when:
- [ ] Web Push working (Android + iOS PWA)
- [ ] Daily Briefing pipeline running (audio generated nightly)
- [ ] 4 daily touchpoints scheduled per user (with guardrails)
- [ ] Cohort assignment on signup
- [ ] Cohort presence + leaderboard live
- [ ] Streak Freeze auto-applied
- [ ] Photo Doubt Cam in production
- [ ] New pricing tiers live with 7-day Pro trial
- [ ] Sunday Recap generated and delivered
- [ ] Friday Quiz live
- [ ] At least 50 paying users (organic + small outreach)
- [ ] Day-30 retention improvement visible vs baseline

### Sprint 3 is done when:
- [ ] 500+ PYQs in database, tagged, indexed
- [ ] 20+ PYQ SEO pages indexed in Google
- [ ] FSRS scheduler in production
- [ ] Existing SM-2 cards migrated to FSRS state
- [ ] Decompression detection live (post-shadow-mode)
- [ ] JEE Main Mock Simulator working end-to-end
- [ ] Mock test analytics + recovery plan generation working
- [ ] All Sprint 1 + 2 features polished
- [ ] Lighthouse mobile ≥90
- [ ] First 3 organic creator partnerships in motion
- [ ] Product is presentable to seed investors

If a sprint isn't "done" by the deadline, do NOT extend. Apply the cut list from `MVP_CRITICAL_TASKS_AND_HIGH_LEVERAGE_FEATURES.md` and move forward.

---

## 6. The cut list philosophy

Reality hits every solo founder around week 4-6. Energy dips, surprises eat days, family things happen.

When that happens, **don't slip silently.** Open the cut list (`MVP_CRITICAL_TASKS_AND_HIGH_LEVERAGE_FEATURES.md`) and explicitly cut.

The cut order is:
1. First: Sprint 3 features marked "stretch"
2. Second: Sprint 3 features marked "optional"
3. Third: Sprint 2 differentiation feature (Photo Doubt Cam moves to Sprint 4 if needed)
4. Fourth: Family tier (move to Sprint 4)
5. Never cut: Phase 0 work. Pricing rebuild. Brain Map. Onboarding rewrite. Briefing. Cohort.

The "never cut" items are the spine of the 90-day work. Cutting them defeats the purpose.

---

## 7. The metric checkpoints

Every Monday morning, check these metrics. If any falls outside expected bounds, investigate.

### Sprint 1 checkpoints

| Metric | Week 1 | Week 2 | Week 3 | Week 4 |
|---|---|---|---|---|
| Day-1 retention | ≥40% | ≥45% | ≥48% | ≥50% |
| Activation (signup → first Q&A) | n/a | ≥50% | ≥60% | ≥65% |
| AI cost per active user | ≤₹30/mo | ≤₹30/mo | ≤₹28/mo | ≤₹28/mo |
| Error rate (Sentry) | ≤2% | ≤1.5% | ≤1% | ≤1% |
| Lighthouse mobile | n/a | n/a | n/a | ≥85 |

### Sprint 2 checkpoints

| Metric | Week 5 | Week 6 | Week 7 | Week 8 |
|---|---|---|---|---|
| Day-7 retention | ≥48% | ≥50% | ≥52% | ≥55% |
| Push permission grant rate | n/a | ≥25% | ≥30% | ≥35% |
| Briefing listen rate | n/a | n/a | ≥30% | ≥40% |
| Trial → paid conversion (Day-7) | n/a | n/a | ≥10% | ≥12% |
| Paying users | ≥10 | ≥20 | ≥35 | ≥50 |

### Sprint 3 checkpoints

| Metric | Week 9 | Week 10 | Week 11 | Week 12 |
|---|---|---|---|---|
| Day-30 retention | ≥18% | ≥20% | ≥22% | ≥25% |
| PYQ pages indexed | ≥5 | ≥10 | ≥15 | ≥20 |
| Mock test completion rate | n/a | n/a | ≥60% | ≥65% |
| WAU | ≥500 | ≥700 | ≥900 | ≥1000 |
| Paying users | ≥65 | ≥80 | ≥95 | ≥100 |

If a metric is consistently below threshold for 2 weeks: stop, investigate, fix root cause before continuing.

---

## 8. The personal-care protocol

This document needs a section on you, the founder, because the engine you're building depends on you not breaking.

### Signs you're heading for burnout
- Working > 60 hours/week for 3 weeks straight
- Eating only when forced to remember
- No social contact for 7+ days
- Resentment toward users
- Decision fatigue (everything feels like a hard choice)

### The protocol when you hit them
1. Take Saturday completely off. No exceptions.
2. Walk 30 minutes on Sunday.
3. Sleep 8 hours. Set a hard sleep deadline.
4. Eat actual meals at actual times.
5. Talk to one human (not about work) within 48 hours.
6. Re-read `MASTER_VISION_AND_MOAT.md` Section 9 (acknowledgements).

### The build-in-public anchor
Twice a week, post a short update on Twitter/LinkedIn:
- What shipped
- What you learned
- A user quote (with permission)

This serves three purposes:
- Marketing (the founder narrative moat)
- Accountability (public progress = real progress)
- Connection (people respond, you don't feel alone)

If you can't post for 2 weeks straight, that's a signal something is off.

---

## 9. The escalation triggers

When to stop building and rethink:

### Trigger 1 — Day-30 retention doesn't improve by Week 6
If Sprint 1 ships fully and retention is still ≤15%, something fundamental is wrong. Stop adding features. Talk to 20 users. Find out what's missing.

### Trigger 2 — Paying users < 30 by end of Sprint 2
Pricing might be wrong. Positioning might be wrong. Trial flow might be broken. Investigate before Sprint 3.

### Trigger 3 — AI cost per user > ₹60/month
Cost discipline broke. Review model routing, cache hit rate, free tier limits. Fix before adding new AI features.

### Trigger 4 — Error rate > 3% for any week
Quality regressed. Sentry is screaming. Stop new feature work, fix the foundation.

### Trigger 5 — Founder energy is at <50% for 2 weeks
This is real. Build slower. Cut more. The 90-day plan is aggressive; it must accommodate human limits.

---

## 10. The handoff readiness checklist

If at some point in the 90 days you need to bring in help (contractor, future cofounder, or back to community), the product should be handoffable. Verify weekly:

- [ ] README.md describes how to run locally in <10 minutes
- [ ] All env vars documented in `.env.example`
- [ ] Critical paths have at least one test
- [ ] Architecture decisions are documented (this file series serves)
- [ ] No "magic" undocumented behavior in critical paths
- [ ] Supabase migrations match production schema

If not, fix incrementally. Don't let bus factor stay at 1.

---

## 11. The Sprint 0 (right now, before Sprint 1 starts)

If you haven't done these yet, do them this week (~10 hours):

1. **Set up Sentry account.** Get DSN. (1 hour)
2. **Set up UptimeRobot account.** (15 min)
3. **Verify GitHub Actions config exists.** (30 min)
4. **Pull production schema for diff baseline.** `supabase db dump --schema-only > current-schema.sql` (30 min)
5. **Set up cost tracking baseline.** Note today's OpenAI spend per day. (30 min)
6. **Set up retention baseline metrics.** Query current Day-1, Day-7, Day-30. Note the numbers. (1 hour)
7. **Tell 5 active users about the upcoming changes.** Get their reactions. Adjust expectations. (2 hours)
8. **Block calendar for the next 90 days.** 30+ hours/week minimum. Honest with family/friends. (1 hour)
9. **Order the sample PDF content** (a sample JEE Physics chapter ready for users). Curate it. (2 hours)
10. **Read all 14 documents.** Highlight uncertainty. Note questions for yourself. (4 hours — over the weekend before Sprint 1)

---

## 12. The accountability rhythm

How to know you're staying on track without micromanaging yourself.

### Daily
- One commit minimum.
- One sprint task moved to done OR moved with reason.
- Note one user feedback if any received.

### Weekly
- Friday: progress review (2 hours).
- Friday: metrics check.
- Sunday: brief weekend reflection (15 min). What worked. What didn't. What's next week's anchor.

### Bi-weekly
- Open `MASTER_VISION_AND_MOAT.md`. Reread Section 10 (single decision test).
- Ask: "Is what I'm building making Priya/Arjun feel like this is their best decision?"
- If yes, continue. If no, pause.

### Monthly
- Full retrospective. What worked across the month. What didn't. Adjust next month's plan.
- Share an honest update publicly (build-in-public).
- Take one full day off.

### End of 90 days
- Comprehensive review.
- Compare actual vs planned across all 14 documents.
- Note what shipped, what was cut, what surprised.
- Plan months 4-6.
- Take 5 days off completely before starting the next leg.

---

## 13. The "I'm stuck" protocol

When you're stuck on a specific technical or design problem:

### Step 1 — Read the architecture doc
The answer is probably in `ELITE_FEATURE_ARCHITECTURE.md`, `AI_SYSTEMS_ARCHITECTURE.md`, or `TECHNICAL_ARCHITECTURE.md`. Search for the topic.

### Step 2 — Reframe the problem
Write the problem as one sentence on paper. If you can't, you don't understand it yet.

### Step 3 — Ask Claude (or Claude Code)
With full context, including which document section is relevant. Reference the specific patterns and rules.

### Step 4 — Talk to a user
If still stuck, find a paying user. Ask them about the underlying need, not your solution.

### Step 5 — Defer
If still stuck after 90 minutes, defer. Add to "investigate later" list. Move to a different task. Return tomorrow.

### Step 6 — Cut
If returning tomorrow doesn't help, cut the feature. The 90-day window doesn't include unbounded research.

---

## 14. The mid-sprint adjustment protocol

If mid-sprint you realize a task is bigger than estimated:

### If it's a critical path task
- Cut a non-critical task to make room.
- Don't extend the sprint.
- Note the trade-off explicitly.

### If it's a non-critical task
- Move it to the next sprint.
- Or cut it entirely if it falls below the line.

### If it's a Sprint 3 task that's blocking Sprint 1 work
- Re-evaluate the Sprint 3 task. Probably should have been Sprint 1.
- Adjust this document if patterns emerge.

The sprint files are a plan, not a contract. Adjust as needed. Track adjustments.

---

## 15. The "what if I'm ahead" protocol

If you're somehow ahead of schedule (unlikely but possible):

### Don't add features
The temptation to add features when ahead is the biggest enemy of a 90-day plan. Resist.

### Do these instead, in priority order:
1. **Talk to users.** Spend the bonus time on user research. Schedule 5 calls.
2. **Write content.** Blog posts for SEO. Founder build-in-public updates.
3. **Pre-build the next sprint's content** (PYQs, copy variants, designs).
4. **Refactor a long-standing pain point** (the DashboardContext is a candidate — but with caution).
5. **Take time off.** Genuine downtime improves Sprint 2 + 3 quality.

Adding "one more cool feature" because you have time is anti-pattern. The discipline of the cut list also includes the discipline of not over-building.

---

## 16. The voice of this document

If you ever feel lost in the 14-document system, return here. This document is the simple one. It tells you:
- What to do this week
- How to use Claude Code with the sprint files
- When to check metrics
- When to cut
- When to rest

The other 13 documents are referenced, not duplicated. They have the depth. This document has the rhythm.

When you don't know what to do today, open the current sprint file and start the next task.

---

*Next: `SPRINT_01_IMPLEMENTATION.md` — what to do on Day 1 of Week 1.*
