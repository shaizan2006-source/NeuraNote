# Sprint 4, 5, 6 File Navigation Guide
*Quick reference: which files to use for each sprint*

---

## The 5 core Sprint execution files

### **SPRINT_04_PRELAUNCH_AND_BETA.md**
**Weeks 13-14 (Days 85-98)**
- Week 13: Pre-launch prep (production audit, landing page polish, copy creation, creator outreach)
- Week 14: Friends & family beta (send 100 invites, daily bug fix cycle, feedback collection)

**Contains:**
- Day-by-day Claude Code prompts (7 days)
- All verification checklists
- Beta feedback infrastructure setup
- Launch asset preparation

**When to use:** Read this during Week 13. Execute daily tasks Monday-Friday.

---

### **SPRINT_05_PUBLIC_LAUNCH.md**
**Weeks 15-17 (Days 99-119)**
- Week 15: Product Hunt launch (Mon prep, Tue-Sun live execution)
- Week 16: Reddit campaign (4 subreddits, sustained engagement)
- Week 17: Email campaign (waitlist, beta users, paid users, referrals)

**Contains:**
- Day-by-day execution tasks for 3 weeks
- PH submission process + response templates
- Reddit posting + engagement strategy
- Email segmentation + templates
- Tracking metrics for each channel

**When to use:** Read during Week 14 (preview). Execute during Weeks 15-17.

---

### **SPRINT_06_SCALE_AND_MEASURE.md**
**Weeks 18-24 (Days 120-168)**
- Week 18: Channel optimization (identify winning channel, double down)
- Week 19: Fix biggest funnel leak (funnel analysis, user interviews, implementation)
- Week 20: Content + SEO sprint (25 blog posts, keyword strategy)
- Week 21: Creator partnerships (affiliate dashboard, formal program)
- Week 22: Retention push (Day-7 from 30%–45%)
- Week 23: Conversion optimization (A/B testing, payment flow)
- Week 24: Final sprint + decision point (hit 100 paying users, retrospective, decide next phase)

**Contains:**
- Weekly theme + Claude Code prompts for each week
- SQL queries for measuring progress
- Specific growth experiments per week
- Funnel improvement strategies
- Content production guidelines
- Partner program setup

**When to use:** Read Week-by-week as you progress. Heavy execution for 7 weeks.

---

## 2 Supporting Files (use with all sprints)

### **LAUNCH_COPY_AND_ASSETS.md**
**All copy templates for Sprints 4-6**

**Contains:**
- Product Hunt: submission fields, maker comment, daily updates, response templates
- Reddit: posts for r/JEE, r/NEET, r/JEENEETards, r/IndianStudents + response templates
- Email: 5 templates (waitlist, beta, trial ending, paying user, friends/family)
- Creator outreach: initial + follow-up templates
- Twitter threads: launch day + day-end
- Tone guidelines + timing recommendations

**When to use:** 
- **Week 13 Day 88:** Create all copy (won't write under pressure during launch)
- **Week 15:** Paste into PH, Reddit, email systems
- **Weeks 15-17:** Reference response templates during engagement

**Pro tip:** Edit to match your voice, then save as reference.

---

### **METRICS_SQL_QUERIES.md**
**All tracking queries for Sprints 4-6**

**Contains:**
- Daily signup tracking by source
- Complete conversion funnel by channel
- Retention metrics (Day-7, Day-30, churn analysis)
- Feature adoption rates
- Revenue/MRR calculations
- Cost tracking (AI spend per user)
- Partner/creator performance
- Weekly reporting template

**When to use:**
- **Week 18 Day 120:** Run queries to baseline your metrics
- **Every Monday:** Run 5 key queries for weekly metrics report
- **Throughout:** Use specific queries when investigating problems

**Pro tip:** Save results in `docs/launch/weekly-reports/week-NN.md` to track progress.

---

## File Dependency Map

```
Sprint 4 (Weeks 13-14)
├── SPRINT_04_PRELAUNCH_AND_BETA.md – Read first
├── LAUNCH_COPY_AND_ASSETS.md – Use Day 88 to create all copy
└── METRICS_SQL_QUERIES.md – Optional (no users yet to measure)

Sprint 5 (Weeks 15-17)
├── SPRINT_05_PUBLIC_LAUNCH.md – Read Week 14, execute Weeks 15-17
├── LAUNCH_COPY_AND_ASSETS.md – Reference for templates, response patterns
└── METRICS_SQL_QUERIES.md – Run daily to track signups & conversion

Sprint 6 (Weeks 18-24)
├── SPRINT_06_SCALE_AND_MEASURE.md – Read weekly, execute weekly
├── METRICS_SQL_QUERIES.md – Critical: run every Monday + daily for problem-solving
└── LAUNCH_COPY_AND_ASSETS.md – Reference only (less active use)
```

---

## Quick Reference: What to read when

### **This Week (if you're in Week 13):**
1. Read: SPRINT_04_PRELAUNCH_AND_BETA.md (full)
2. Read: LAUNCH_COPY_AND_ASSETS.md sections 1-4 (PH, Reddit, Email, Creator)
3. Execute: Day 85 task from SPRINT_04_PRELAUNCH_AND_BETA.md

### **Week 14-15 (transition to public):**
1. Execute: Days 86-98 from SPRINT_04_PRELAUNCH_AND_BETA.md
2. Read: SPRINT_05_PUBLIC_LAUNCH.md (full)
3. Prepare: PH submission (use LAUNCH_COPY_AND_ASSETS.md)

### **Week 15-17 (public launch):**
1. Execute: Day-by-day from SPRINT_05_PUBLIC_LAUNCH.md
2. Track: Run METRICS_SQL_QUERIES.md daily
3. Respond: Use templates from LAUNCH_COPY_AND_ASSETS.md
4. Iterate: Adjust strategy based on metrics

### **Week 18+ (scale phase):**
1. Execute: Week-by-week from SPRINT_06_SCALE_AND_MEASURE.md
2. Track: Run 5 key queries every Monday (METRICS_SQL_QUERIES.md)
3. Reference: METRICS_SQL_QUERIES.md for specific problem-solving

---

## File sizes and read time

| File | Size | Read time | Execute time |
|---|---|---|---|
| SPRINT_04_PRELAUNCH_AND_BETA.md | ~15KB | 30 min | 14 days (2 weeks) |
| SPRINT_05_PUBLIC_LAUNCH.md | ~18KB | 35 min | 21 days (3 weeks) |
| SPRINT_06_SCALE_AND_MEASURE.md | ~22KB | 45 min | 49 days (7 weeks) |
| LAUNCH_COPY_AND_ASSETS.md | ~20KB | 30 min | Once (Week 13 Day 88) |
| METRICS_SQL_QUERIES.md | ~16KB | 20 min | Weekly (5 min/week) |

**Total read time:** ~2.5 hours (spread across 12 weeks)
**Total execution:** 12 weeks of focused work
