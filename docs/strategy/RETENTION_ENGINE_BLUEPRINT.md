# Retention Engine Blueprint
*The daily, weekly, and cycle mechanics that hold students for years*
*For: Ask-My-Notes — 90-day execution window*
*Date: May 2026*

---

## 0. The retention thesis in one paragraph

Acquiring users is solvable; **keeping them past month 4 is what separates ₹100-crore companies from hobby projects.** Day-30 retention in the current product is estimated at 12-15%. Top-quartile EdTech is 25-30%. NotebookLM-level products hit 35%+. Every percentage point of Day-30 retention compounds into a different company. The retention engine is therefore the single most important system Ask-My-Notes builds in the next 90 days — more important than any individual feature.

Retention is not a feature. It's a system of three nested loops (daily → weekly → cycle) and four supporting subsystems (notifications, identity, recovery, care). Each loop and subsystem has a measurable target. This document specifies all of them.

---

## 1. The architecture of the retention engine

```
┌──────────────────────────────────────────────────────────┐
│                THE CYCLE LOOP (90-365 days)              │
│   Exam prep journey: prep → mock cycles → exam → after  │
│   ├── pre-exam panic management (T-30 to T-1)            │
│   ├── exam day silence (T-0)                             │
│   └── post-exam pivot (T+1 to T+30)                      │
│                                                          │
│   ┌────────────────────────────────────────────────┐    │
│   │          THE WEEKLY LOOP (7 days)              │    │
│   │   Sunday recap → weekday rhythm → Friday wins  │    │
│   │   ├── Sunday: Weekly Recap (audio + visual)    │    │
│   │   ├── Tue/Thu: Cohort battles (Sprint 4+)      │    │
│   │   ├── Friday: Quiz of the week                 │    │
│   │   └── Saturday: Decompression check-in         │    │
│   │                                                │    │
│   │   ┌────────────────────────────────────┐      │    │
│   │   │      THE DAILY LOOP (24 hours)     │      │    │
│   │   │   Morning Briefing → 3 sessions    │      │    │
│   │   │   ├── 7am: Morning Briefing        │      │    │
│   │   │   ├── 1pm: Lunch micro-session     │      │    │
│   │   │   ├── 6pm: Focus session anchor    │      │    │
│   │   │   └── 9pm: Night closure           │      │    │
│   │   └────────────────────────────────────┘      │    │
│   └────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘

Supporting subsystems (always-on):
  ├── Notification Infrastructure (4 touchpoints/day max)
  ├── Identity Layer (cumulative day badge, cohort handle, Brain Map)
  ├── Recovery System (Streak Freeze, slump grace, pause option)
  └── Care Subsystem (Decompression detection, late-night gentleness)
```

Each layer must be in place for the layer above to compound. Daily loop without identity layer = burnout. Weekly loop without daily loop = irrelevance. Cycle loop without weekly = abandonment at month 3.

---

## 2. The daily loop

### Purpose
Establish a 4-touchpoint ritual that the student integrates into their existing 8-12 hour study day. Each touchpoint takes <10 minutes. Together, they make Ask-My-Notes a habit, not a destination.

### The four touchpoints

#### Touchpoint 1 — Morning Briefing (5-7am)

**Trigger:** Push notification at user's declared study window start time (default 7am).

**Content:**
- 60-90 second audio briefing (see `ELITE_FEATURE_ARCHITECTURE.md` F2.1)
- Brief greeting + acknowledgment of yesterday
- 3 ranked priorities for today
- Explicit permission to do less
- Cohort presence note
- Calm close

**Action it drives:** User listens, opens app, starts first session.

**Measurement:**
- Briefing delivery rate (target: 95%+)
- Briefing listen rate (target: 40%+ of recipients)
- Briefing → session conversion within 2 hours (target: 25%+)

**Failure mode to avoid:** Briefing that feels like a TODO list. The briefing is a friend's voice, not a teacher's assignment.

---

#### Touchpoint 2 — Lunch Micro (12pm-2pm)

**Trigger:** Push notification at user's declared lunch hour (default 1pm). **Conditional:** only fires if user has not yet started a session today.

**Content:** A 30-second flashcard prompt — 3 cards, prioritizing yesterday's shaky concepts.

**Push copy:**
> 3 cards. 30 seconds. While you eat.

**Action it drives:** User opens app, does 3 cards, closes. Friction near zero.

**Measurement:**
- Lunch micro CTR (target: 15%+)
- Completion rate (3 cards done) once opened (target: 80%+)
- Correlation with daily session count (target: lunch micro users 1.4× more likely to study later same day)

**Failure mode to avoid:** Asking for too much. If lunch micro becomes "do 30 cards," it dies.

---

#### Touchpoint 3 — Focus Session Anchor (6-10pm)

**Trigger:** Push notification at user's declared evening study time (default 6pm). **Conditional:** only fires if user opted into Focus Mode in onboarding.

**Content:**
- Subject suggestion based on study plan
- "Ready when you are. 45 min suggested."
- Tap → enters Focus Mode with subject pre-loaded

**Action it drives:** The student's main study session — the 45-90 minute deep work block.

**Measurement:**
- Focus session start rate after notification (target: 40%+)
- Average focus session duration (target: 38+ minutes)
- Focus completion rate (target: 70%+)
- Focus session → Brain Map mastery delta (qualitative)

**Failure mode to avoid:** Reminding the student of work they should already be doing. Should feel like a gentle "I'm here" not "Where have you been?"

---

#### Touchpoint 4 — Night Closure (9-10pm)

**Trigger:** In-app prompt at session end if user has studied today. Or: push notification at 9pm if user hasn't opened app today (last chance, gentle).

**Content:**
- 30-second reflection summary: "Today: 47 min, 3 concepts strengthened. Brain Map +5."
- "Sleep well."
- No new content suggested. No "one more thing."

**Action it drives:** Quiet close. Builds sense of completion. Day is done.

**Measurement:**
- Closure prompt view rate (target: 60%+ of users who studied)
- App close after closure (target: 80%+ — proves the close worked)
- Day-rating "I feel done" (in-product micro-survey, monthly)

**Failure mode to avoid:** ANY push for more content after 9pm. ANY "you're so close to your daily goal!" — kill at design time.

---

### Daily loop guardrails

These are non-negotiable. If any of these rules ever conflict with engagement metrics, **the rules win.**

1. **Max 4 scheduled push notifications per day.** Hard cap.
2. **Zero notifications between 10pm-7am.** Hard rule.
3. **Zero notifications during 2pm-5pm slump window** for users who haven't opened today.
4. **Zero notifications on declared exam day (T-0).** Hard rule.
5. **No "do this NOW" framing.** Always "ready when you are."
6. **No streak guilt.** See Section 6 (Recovery System).

### Daily loop output measurement

The daily loop "works" when:
- DAU/MAU ratio ≥ 0.35 (sticky)
- Average sessions per active user per day ≥ 1.8
- Median session length ≥ 22 minutes
- 4-touchpoint completion rate (any 2+ touchpoints/day) ≥ 40% of weekly actives

---

## 3. The weekly loop

### Purpose
Anchor identity beyond the day. Provide variety in the rhythm. Create natural break points for reflection and re-commitment.

### The weekly rhythm

#### Sunday — Weekly Recap (the keystone)

**When:** Sunday 8pm IST, push notification.

**Content:**
- Full Weekly Recap visual + 90-second audio narration
- Highlights:
  - Concepts mastered this week (count + names)
  - Time invested (with comparison to past 4 weeks)
  - Brain Map diff: nodes that grew, nodes that dimmed
  - Cohort: your rank movement, cohort highlights
  - Streak status (Consistent Learner — Day N, freezes status)
  - Next week's planned focus

**Visual asset:** 1080×1920 shareable image (Instagram Story format) auto-generated. User can share to "look at my week."

**Why it matters:** Sunday is the natural reset point. Most students mentally plan for the week ahead Sunday night. Ask-My-Notes Sunday Recap inserts itself into that planning ritual.

**Measurement:**
- Sunday Recap view rate (target: 70%+ of weekly actives)
- Recap → Monday session conversion (target: 60%+)
- Recap share rate (target: 8%+ of viewers share)

---

#### Monday — Soft Restart

**When:** Monday Morning Briefing (replaces standard daily briefing).

**Content:**
- "Welcome back. Sunday's recap is in your inbox if you missed it."
- Slightly more directive plan than weekday briefings
- "This week, let's focus on [chapter from study plan]."

**Why it matters:** Monday is the highest-intent day. Student typically over-commits to study plans on Monday. Catch that intent gently.

---

#### Tuesday/Thursday — Cohort Pulse (Sprint 4+)

**Status for 90-day window:** Out of scope. Add to Sprint 4+.

**Future content:** A 3-question cohort quiz delivered Tuesday/Thursday at lunch. User opts in; results show cohort distribution.

---

#### Friday — Week-end Practice

**When:** Friday morning push.

**Content:**
- "Friday: 20 questions, mix of week's topics. Test what stuck."
- Generates a custom 20-question quiz from week's studied concepts + their PYQ counterparts.
- Score visible to user only (no leaderboard pressure).
- Optional: "share your score with cohort" (anonymous handle).

**Why it matters:** Friday before weekend is the natural "audit my week" moment. Quiz is the audit.

**Measurement:**
- Friday Quiz start rate (target: 35%+ of weekly actives)
- Completion rate (target: 75%+)
- Score sharing rate (target: 12%+)

---

#### Saturday — Decompression Check-in

**When:** Saturday morning (only if user studied 4+ days that week).

**Content:**
- "You put in 4 days this week. Saturdays are good for rest or for review — your call."
- Two options: "Take today off (we'll resume Monday)" / "Light review only (10 minutes max)"

**Why it matters:** Saturday is when high-intensity students burn out. Permission to rest is the care pillar made weekly.

---

### Weekly loop output measurement

The weekly loop "works" when:
- Week-2 retention ≥ 60% (someone active in week 1 active in week 2)
- Week-4 retention ≥ 40%
- Sunday Recap is the highest-engagement asset of the week
- Friday Quiz becomes a self-anticipated ritual (>50% of weekly actives take it 2+ times)

---

## 4. The cycle loop

### Purpose
Hold the student through the multi-month exam preparation journey, including the most emotionally turbulent phases.

### Cycle phases and their mechanics

#### Phase A — Early Prep (T-365 to T-180)

**Student state:** Optimistic, exploring, not yet under pressure.

**Engine behavior:**
- Establish baseline daily loop
- Build out Brain Map (it's empty now)
- Slowly accumulate longitudinal data
- Weekly Recap normalizes the rhythm

**Mechanic to ship:** None new. Standard daily + weekly loops.

---

#### Phase B — Building Momentum (T-180 to T-60)

**Student state:** Settling into routine. Mock test pressure begins. Identifying weak topics.

**Engine behavior:**
- Mock simulator becomes available (F3.4A)
- Weekly mocks recommended
- Brain Map weak-zone highlighting becomes prominent
- Cohort comparison becomes salient

**Mechanic to ship:** Mock cadence reminders. "It's been 2 weeks since your last mock. Want to take one?"

---

#### Phase C — Pre-Exam Panic (T-60 to T-7)

**Student state:** Anxiety peaks. Self-doubt cycles. Comparison spirals.

**Engine behavior:** Transitions to "panic management mode."

Specific behavioral changes:
- **T-60:** Daily briefing tone shifts to slightly more directive
- **T-30:** Cycle marker — special screen, "30 days. The hardest 30. We're with you."
- **T-30 to T-15:** Decompression nudges 2× more frequent
- **T-15 to T-7:** "Focused review mode" enabled — only review of previously-studied concepts, no new chapters offered
- **T-7:** Lockdown lite — special daily briefing acknowledging the week
- **T-3:** No new content, only review prompts
- **T-1:** Lockdown full

Specific UI changes during T-30 to T-1:
- Hide pricing reminders entirely
- Suppress upsell prompts
- Hide aggressive metric pulses
- Surface "anxiety supports" (breathing exercise, 5-minute decompression)
- Increase Brain Map review animations ("here's what you've built")

**Mechanic to ship in 90-day window:** T-30 cycle marker + T-1 lockdown UI + suppress pricing/upsell during panic phase. The advanced anxiety supports are Sprint 4+.

**Critical UX rule:** Pre-exam panic phase users should never see growth-marketing surfaces. Their relationship with the product right now is sacred.

---

#### Phase D — Exam Day (T-0)

**Student state:** The day. The product cannot help. It must not pretend to.

**Engine behavior:**
- All scheduled push notifications: DISABLED
- App opens to: "We're with you today. Come back tomorrow."
- All metrics: hidden
- Streak/badge: permanently graced (no day count change)

**Mechanic to ship:** Hard switch via cron + UI override on exam_date matches.

---

#### Phase E — Post-Exam Pivot (T+1 to T+30)

**Student state:** Mixed elation/grief. Identity in flux. Future uncertain.

**Engine behavior:**
- T+1: Special "How did it go?" screen (see `STUDENT_PSYCHOLOGY_EXECUTION.md` Section 9)
- T+1 to T+7: Reduced notification frequency (1/day max). No upsell. No new feature push.
- T+7: Begin "what's next" conversation gently. Options:
  - Prep for next phase (JEE Advanced if Main was T-0)
  - Prep for next cycle (if didn't clear or didn't get target)
  - Pivot to new exam (rare but supported)
  - Pause subscription (offer prominently — this is the kindest action)
- T+8 to T+30: Re-establish daily loop with new exam_date if applicable

**Mechanic to ship in 90-day window:** T+1 special screen + reduced notification frequency T+1 to T+7. Full pivot logic Sprint 4+.

**The retention insight:** Most EdTech products lose ~80% of users at T+1. The ones that survive T+30 with the user become the products that get the user's next-cycle business too. **The post-exam window is where the cycle moat is built.**

---

#### Phase F — Continuation (T+30 onward)

**Student state:** Either continuing to next exam phase or pausing.

**Engine behavior:** Standard daily + weekly loops re-establish. Brain Map continues to accumulate.

---

### Cycle loop output measurement

The cycle loop "works" when:
- Pre-exam (T-60 to T-1) churn rate ≤ 8%
- Exam day "graceful behavior" achieved (no notifications sent, app shows correct screen)
- T+30 continuation rate ≥ 40% (of users active in T-7 are active again at T+30)
- T+90 continuation rate ≥ 25%

T+90 continuation rate is the **single most important long-term metric** for Ask-My-Notes. It proves the product retains across exam cycles, which proves the longitudinal memory moat is real.

---

## 5. The notification subsystem

### Architecture
See `ELITE_FEATURE_ARCHITECTURE.md` F2.3 for technical spec. This section is the *content + policy* layer above the technical infrastructure.

### The notification budget

Each user has a **daily budget of 4 notifications, weekly budget of 18**. The budget is hard-capped. If a 5th notification of the day is requested, it's silently dropped (and logged for analysis).

The 4 daily slots:
1. Morning Briefing
2. Lunch Micro (conditional)
3. Focus Anchor (conditional)
4. Night Closure (conditional)

Plus weekly:
- Sunday Recap
- Friday Quiz
- Saturday Decompression Check-in (conditional)

Plus event-triggered:
- Care nudges (decompression triggers) — max 2/day, count against daily budget
- Cohort milestones (rare) — count against daily budget

### The notification copy library

Every notification has 3-5 variants to prevent fatigue. Rotated by day-of-week and random selection.

#### Morning Briefing notification
```
v1: Good morning, {name}. Your briefing — 90 sec.
v2: Your briefing is ready, {name}. 90 sec, your pace.
v3: Day {N} of your prep. Here's today.
v4: 90 seconds before you start.
v5: Morning. Let's plan.
```

#### Lunch Micro notification
```
v1: 3 cards. 30 seconds. While you eat.
v2: Quick — 3 cards from yesterday.
v3: 30-second review break?
v4: 3 cards. Or just close. Your call.
```

#### Focus Anchor notification
```
v1: Ready when you are. 45 min suggested.
v2: Tonight's focus: {chapter}. Tap when you're set.
v3: Your study time is here. No rush.
v4: {Cohort} is in deep work right now.
```

#### Night Closure notification
```
v1: Good night, {name}. Today: {N} min, {M} concepts strong.
v2: Day done. Sleep well.
v3: You showed up today. That's enough.
```

#### Sunday Recap notification
```
v1: Your week is summarized. 90 seconds, just for you.
v2: Sunday. Look at what you did this week.
v3: Weekly Recap is in.
```

#### Friday Quiz notification
```
v1: Friday — 20 questions. Test what stuck.
v2: 20 questions from this week. 15 min.
v3: How well did this week go? Let's see.
```

### Notification grammar enforcement

Every notification must pass these tests before shipping:
1. **Specifics test:** Does it contain a number or specific noun? ("3 cards" yes, "study now" no)
2. **Permission test:** Does it explicitly or implicitly allow not-acting?
3. **Anti-guilt test:** Does it avoid "you should" / "you must" / "don't break" framing?
4. **Length test:** Is it ≤80 characters total?
5. **Authentic-voice test:** Does it sound like a friend who knows your work?

Any notification failing these tests is rewritten or killed.

### Notification A/B testing rules

You may A/B test:
- Time of delivery
- Voice/voicing variants
- Copy variants

You may NOT A/B test:
- Frequency (4/day cap is permanent)
- Time-of-night silence (10pm-7am is permanent)
- Slump-window silence (2-5pm for inactive users is permanent)
- Exam-day silence (T-0 is permanent)

The above rules are not optimization targets. They are values.

---

## 6. The identity layer

### Purpose
A student's sense of "I am someone who studies on Ask-My-Notes" is the real retention mechanic. Features come and go; identity persists.

### The identity surfaces

#### Cumulative Day Badge (replaces fragile streak)
- Display: "Consistent Learner — Day {N}"
- Where N = cumulative days studied (not consecutive)
- Visible on dashboard, profile, shareable
- Never resets (unlike streak)
- Tied to FSRS state, not just app opens (≥5 min session required for day to count)

**Why cumulative over consecutive:** A student who studied 47 of the last 60 days has built more identity than a student with a 7-day perfect streak. The metric should reward the long-form commitment, not punish the inevitable slip.

#### Cohort Handle
- Anonymous: `swift-tiger-247`, `quiet-fox-883`
- Persistent across cohort lifetime
- Visible on leaderboards
- Can be regenerated once (in case student dislikes initial assignment)
- Cannot be linked to real name unless user opts in (deferred to Sprint 4+)

**Why anonymous over real-name:** Indian students (especially repeat aspirants) are sensitive about being identified. Anonymous handles let them participate in cohort dynamics without social risk. Real-name reveal is opt-in only.

#### Brain Map Identity
- The Brain Map *is* the student. It's their cognitive shape.
- Personal, unique, evolves with them
- Shareable as snapshot (1080×1920 image)
- Encourages identity statement: "this is what I've built"

#### Profile Page (Sprint 3+)
- Display: cumulative day, total study time (lifetime), Brain Map summary, cohort handle, exam target
- No vanity metrics (no XP, no levels, no points)
- All metrics are honest reflections of work done

### Identity layer measurement

The identity layer "works" when:
- Brain Map snapshot share rate ≥ 5% of users monthly
- Cohort handle is referenced in user-to-user communication (qualitative)
- "I've been on Ask-My-Notes for {N} days" appears in user social posts (qualitative)
- Cumulative day badge is mentioned in cancellation reasons (positive signal — students feel attached)

---

## 7. The recovery system

### Purpose
Make falling off the wagon recoverable. Every product loses users in moments of crisis (exam stress, family pressure, illness, motivation crash). The product that supports recovery wins the long game.

### The recovery mechanics

#### Streak Freeze (auto-applied)
See `ELITE_FEATURE_ARCHITECTURE.md` F2.4 for spec.

Key behaviors:
- 1 freeze earned per 7 consecutive days, capped at 3 banked.
- Auto-applied on missed days — no manual action.
- Post-hoc gentle message: "You missed yesterday. We applied a freeze. Day {N} holds."
- No celebration of freeze usage (it's a quiet kindness, not an achievement).

#### Slump Grace
- Days where session < 5 min do not count against cumulative day.
- But: 0 punishment. No notification. No "you tried."
- A grace is silent.

#### Welcome Back Flow (after 7+ day absence)
When a user returns after missing 7+ days:
- App opens to a calm screen, not the regular dashboard
- "Welcome back, {name}. It's good to see you."
- Three options:
  - "Pick up where I left off" — restores dashboard, picks last study plan
  - "Start fresh" — soft reset, but Brain Map persists
  - "I'm not ready yet, just looking"
- No guilt. No "you missed {N} days."

**The key insight:** Most products treat returning users as re-acquisitions. Treat them as friends returning. Different.

#### Pause Subscription
- Available 30/60/90 day pause
- Data + Brain Map preserved
- Cohort spot held for the duration
- Resume on user choice
- This is offered prominently in any "wanting to cancel" flow

**Why pause matters:** Some students go silent during board exam crunch (Class 12 boards conflict with JEE prep). A pause option means they don't have to choose between cancelling and over-paying.

#### Cancel Confirmation Soft-Land
- Cancellation never auto-resubscribes.
- Final email: "We're here if you come back. Your data stays for 12 months."
- 12 months later, if no return, data is anonymized or deleted on user request.

### Recovery system measurement

The recovery system "works" when:
- Welcome-back flow → 7-day re-engagement ≥ 50%
- Pause → resume rate ≥ 60% (within 90 days)
- Cancellation reason "I felt pressured" frequency declining month over month
- Returning-after-cancel rate ≥ 8% within 6 months

---

## 8. The care subsystem

### Purpose
The product is *visibly on the student's side.* Care is the cultural moat (see `MASTER_VISION_AND_MOAT.md` Pillar 3).

### The care touchpoints

#### Decompression Detection
See `ELITE_FEATURE_ARCHITECTURE.md` F3.3 for spec.

Triggers (all run in shadow mode for 2 weeks first):
- Session duration >180 min continuous
- Accuracy drops below 50% in session
- 3+ repeat errors on same concept
- Active studying past 11pm (outside declared window)
- App opened 10+ times in 30 min without session start

Response: gentle prompt with 3 options (break / continue / something easier).

#### Slump Window Silence
2pm-5pm: no notifications to inactive users. If they open, dashboard shows softer "tired? take 5 minutes" screen.

#### Night Mode (post-10pm)
- UI shifts: muted colors, no metric flashing, no exam countdown
- Push notifications disabled
- If user opens, calm closing prompt
- Doom-scroll interrupt at 8+ minutes of activity without session start

#### Exam Day Silence
- All notifications disabled on declared exam_date
- App shows: "We're with you today. Come back tomorrow."
- No streak loss for exam day, ever

#### Pre-Exam Lockdown (T-7 to T-1)
- New content suggestions suppressed
- "Focused review only" mode auto-enabled
- Pricing/upsell surfaces hidden
- Anxiety support tools surfaced

#### Post-Exam Silence (T+1 to T+7)
- Notification frequency reduced to 1/day max
- No feature pushes
- "How did it go?" screen on first open

### Care subsystem measurement

The care subsystem "works" when:
- Decompression nudge → user-reported "this helped" rate ≥ 35%
- Slump window app opens without complaint
- Night Mode adoption (users opening app post-10pm) doesn't drop (proves Night Mode isn't experienced as restrictive, just respectful)
- Exam day silence praised in user feedback (qualitative)
- Pre-exam users complete the cycle without churn spike

---

## 9. The retention math

How the engine compounds.

### Baseline (current state, estimated)
- Day-1 → Day-7 retention: 40%
- Day-7 → Day-30 retention: 38%
- Day-30 → Day-90 retention: 32%
- Combined Day-1 → Day-90: ~5%

### Target after 90 days of engine work
- Day-1 → Day-7: 55%
- Day-7 → Day-30: 50%
- Day-30 → Day-90: 45%
- Combined Day-1 → Day-90: ~12%

### Target at 12 months (full engine + cycle loop maturity)
- Day-1 → Day-7: 65%
- Day-7 → Day-30: 60%
- Day-30 → Day-90: 55%
- Day-90 → Day-180: 50%
- Day-180 → Day-365: 60% (cycle loop kicks in)
- Combined Day-1 → Day-365: ~11%

If 11% sound low, consider: it's compounded. At 50K acquisition over 12 months, 11% Day-365 retention = 5,500 retained users. That's a real cohort to monetize, to amplify, to learn from.

Compare to a 5% Day-1→Day-365 retention rate: 2,500 retained. Half the company.

### The single most important number
**Day-30 retention.** Everything compounds from here.
- Baseline 12-15% → Target 22-25% by end of 90 days → Target 35%+ by month 12.
- Doubling Day-30 in 90 days is the bar.
- If we hit that, all other metrics follow.

---

## 10. The retention engine ship order

What gets built in what sprint to make this engine real.

### Sprint 1 (Weeks 1-4)
- Notification infrastructure (Web Push, service worker, dispatcher)
- Cumulative Day Badge (replaces existing streak display)
- Welcome Back flow (basic version)
- Slump window silence rules
- Night Mode UI rules
- Exam day silence logic

### Sprint 2 (Weeks 5-8)
- Morning Briefing pipeline (full)
- Lunch Micro touchpoint
- Focus Anchor touchpoint
- Night Closure touchpoint
- Sunday Weekly Recap
- Streak Freeze auto-apply
- Cohort handle assignment
- Cohort presence indicator
- Cohort weekly leaderboard

### Sprint 3 (Weeks 9-12)
- Decompression detection (shadow mode → live)
- Friday Quiz of the Week
- Saturday Decompression Check-in
- Pre-exam mode transitions (T-30 / T-7 / T-1)
- Post-exam pivot screen (T+1)
- Pause subscription option

### Deferred to Sprint 4+
- Cohort battles (Tuesday/Thursday)
- Real-name reveal for cohort friends
- Advanced anxiety supports (breathing exercises, etc.)
- Voice tutor weekly check-in calls
- WhatsApp cohort group integration
- Parent transparency reports

---

## 11. The retention engine instrumentation

Every touchpoint of the engine emits a measurement event. Without measurement, the engine cannot improve.

### Event taxonomy
```
retention.daily.briefing.delivered
retention.daily.briefing.listened
retention.daily.briefing.skipped
retention.daily.lunch_micro.sent
retention.daily.lunch_micro.opened
retention.daily.lunch_micro.completed
retention.daily.focus_anchor.sent
retention.daily.focus_anchor.session_started
retention.daily.night_closure.shown
retention.daily.night_closure.app_closed_after

retention.weekly.sunday_recap.delivered
retention.weekly.sunday_recap.viewed
retention.weekly.sunday_recap.shared
retention.weekly.friday_quiz.invited
retention.weekly.friday_quiz.completed

retention.cycle.t_minus_30.entered
retention.cycle.t_minus_7.entered
retention.cycle.t_zero.silent
retention.cycle.t_plus_1.screen_shown

retention.recovery.welcome_back.shown
retention.recovery.welcome_back.completed
retention.recovery.pause.requested
retention.recovery.pause.resumed
retention.recovery.cancel.requested
retention.recovery.cancel.confirmed

retention.care.decompression.triggered
retention.care.decompression.response
retention.care.slump_silence.applied
retention.care.exam_day_silence.applied
```

Each event includes: `user_id`, `cohort_id`, `timestamp`, `context` (JSON).

Daily aggregation produces a retention dashboard:
- Day-N retention curve (where N = 1, 7, 14, 30, 60, 90)
- Cohort comparison (signups by week show different curves)
- Engagement per touchpoint
- Care subsystem activation rates

This dashboard is read every Monday morning by the founder. If a metric falls outside expected bounds, investigation starts that day.

---

## 12. The honest acknowledgement

Building the retention engine right takes longer than building any individual feature. There will be weeks where it feels like nothing is shipping. The work is invisible from the outside — small UX rules, gentle copy choices, careful policy decisions.

It is also the most leveraged work in the company.

A retention engine that's 80% built and 80% adhered-to is worth more than any single feature shipped. A retention engine that's broken in 1 of 12 places (e.g., one notification still fires at midnight, one upsell still shows during exam week) breaks the trust the rest of the engine builds.

**Discipline matters more than speed here.** Better to ship 8 touchpoints that all respect the care rules than 12 that mostly do.

---

*Next: `UI_UX_SYSTEM.md` for the screen-by-screen visual implementation. Then `MOBILE_AND_GAMIFICATION.md` for phone-shaped surfaces and non-cheap motivation.*
