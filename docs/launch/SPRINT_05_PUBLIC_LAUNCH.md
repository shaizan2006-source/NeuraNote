# Sprint 05 — Public Launch (Product Hunt, Reddit, Email)
*Weeks 15-17 (Days 99-119): Public launch through 3 channels*
*For: Ask-My-Notes solo founder — Claude Code execution-ready*

---

## Sprint 5 outcome targets

By end of Week 17 (Day 119):
- Product Hunt launch executed (target: top 10, 200+ upvotes)
- Reddit campaign across 4 subreddits (target: 1500+ total upvotes)
- Email campaign to waitlist (target: 30% open, 8% signup)
- 500+ total signups (cumulative since launch)
- 30+ paying users (₹6K+ MRR)
- Clear winning channel identified (which drove most paid signups)
- 5+ creator partnerships in motion
- Day-7 retention measurable (first cohort hit 7-day mark)

---

## Week 15 — Product Hunt Launch (Days 99-105)

The goal: **Top 10 of the day on Product Hunt + 200+ signups from PH alone.**

PH algorithm favors Tuesday-Thursday launches starting at 12:01 AM PST (which is 12:31 PM IST). You'll be live during peak US daytime hours.

---

### Day 99 (Monday) — Final PH prep + dry run

**Claude Code prompt:**

```
TASK: Final Product Hunt prep + practice runs
SPRINT: 5, Week 15, Day 99

Step 1: Verify all PH assets (1 hour)
Open docs/launch/PRODUCT_HUNT_COPY.md and verify:
- Title is exactly 60 chars or less
- Tagline is exactly 60 chars or less  
- First comment is 500-800 chars (sweet spot for engagement)
- All 5 screenshots are 1024x768, under 2MB each
- Thumbnail is 500x500, under 1MB
- Categories selected: Education, Productivity, AI

Step 2: Find a PH Hunter (2 hours)
A hunter posts on your behalf. They have higher follower count = more initial visibility.

Find hunters:
1. Browse Product Hunt's top hunters: https://www.producthunt.com/topics/hunters
2. Filter for hunters in Education/AI/Productivity categories
3. DM 5-10 hunters with template:

"Hi [Name], 

I'm launching Ask-My-Notes (AI study tool for JEE/NEET Indian competitive exams) on Tuesday on Product Hunt.

Would you be interested in hunting it? I have:
- Polished landing page
- 5 screenshots ready
- Pre-written first comment
- Clear value prop for ed-tech category

Happy to share early access if you want to try it first.

Thanks!"

If no hunter responds by Monday 6 PM, self-launch is fine. Solo launches can hit top 10.

Step 3: Schedule the submission (30 min)
1. Login to Product Hunt
2. Click "Ship a Product" → "Submit"
3. Fill all fields from docs/launch/PRODUCT_HUNT_COPY.md
4. Upload screenshots + thumbnail
5. Set categories: Education, Productivity, Artificial Intelligence
6. Set launch date: Tuesday (tomorrow) 12:01 AM PST
7. Submit for review

Step 4: Prepare 10 responses (2 hours)
Create docs/launch/PH_FAQ_RESPONSES.md with ready answers:

Q: How is this different from NotebookLM?
A: NotebookLM is general — works for any document. Ask-My-Notes is built specifically for Indian competitive exams (JEE/NEET): pre-loaded with 1000+ official PYQs, exam-aware features (T-30/T-7/T-1 modes), and Indian-context AI (knows Allen Kota, Aakash Bangalore, Brilliant Pala, etc.). NotebookLM gives you AI chat; Ask-My-Notes gives you a study system.

Q: How is this different from Doubtnut/Vedantu/Physics Wallah?
A: Those are content platforms (videos + courses). Ask-My-Notes is a study system — works with whatever notes/books you already have. We're not trying to replace your coaching; we make your study more efficient by mapping concepts visually and identifying gaps automatically.

Q: How is this different from Anki?
A: Anki is manual flashcards. Ask-My-Notes auto-generates SRS cards from your notes using FSRS (newer algorithm). Plus Brain Map, Daily Briefing, and 1000+ PYQs — Anki gives you cards, we give you a complete study OS.

Q: Why ₹399/month when ChatGPT is ₹2000?
A: We're 1/5 the price because we're specialized. ChatGPT is amazing but not built for the JEE/NEET grind. We've baked in everything specific to Indian competitive exams: PYQ database, exam-date awareness, cohort with other students, Brain Map for concept tracking. Plus free 7-day Pro trial — try before paying.

Q: Is there a mobile app?
A: PWA (Progressive Web App) right now — works exactly like a native app on Android (with notifications, offline reading). iOS PWA support is good too (iOS 16.4+). Native apps coming Q3/Q4 2026.

Q: Is my data private?
A: Your notes/PDFs stay in your account, never shared with other users. AI calls to OpenAI follow their policies — we strip PII before sending. Full data export and 1-click delete available. RLS (Row-Level Security) enforces strict per-user isolation.

Q: When are you adding UPSC/GATE/CA?
A: Q4 2026 onwards. We're vertical-focused on JEE/NEET for the first 6 months to nail the product. Adding more verticals too early would split focus.

Q: Why solo? Where's your team?
A: I built this for myself first. JEE/NEET grind is brutal and I wanted tools that don't exist. Solo for now; hiring after first 1000 paying users. Plan is to stay small and focused.

Q: How are PYQs sourced? Is it legal?
A: All PYQs are from public sources (NTA official papers, NEET official papers, JEE Advanced official papers from IIT Delhi/Madras). These are public exam materials, distributed for educational use. We attribute every source and don't claim copyright.

Q: Can I get a discount?
A: 7-day free trial covers most evaluation needs. Annual plan is ~33% off monthly. Family tier (₹4499/year) covers 4 students. Student discounts for verified .edu emails coming soon. DM me if you have specific situation.

Step 5: Practice your "live" Tuesday (1 hour)
Walk through what Tuesday will feel like:
- Wake up 5:30 AM IST (PH goes live 12:01 AM PST = 12:31 PM IST, you'll be ahead)
- 5:30-6:00: Coffee, login to PH, post first comment
- 6:00-12:00: Respond to every comment within 5 minutes
- 12:00-13:00: Lunch + reply to social media
- 13:00-17:00: Continue PH engagement
- 17:00-18:00: Reddit (if not done) + email blast prep
- 18:00-20:00: Dinner + family
- 20:00-22:00: Final PH check, replies
- 22:00: Sleep
```

**Time estimate:** 6 hours

---

### Day 100 (Tuesday) — PRODUCT HUNT LAUNCH DAY

**This is THE day. Block calendar entirely.**

**Claude Code prompt:**

```
TASK: Product Hunt launch — live execution day
SPRINT: 5, Week 15, Day 100

NOTE: Today is execution-heavy, not code-heavy. Most of your day is engagement, not building.

MORNING (6:00 AM - 12:00 PM):

6:00 AM — Wake up, coffee, breakfast
6:30 AM — Check PH: is the product live?
6:35 AM — Post your maker comment (from docs/launch/PRODUCT_HUNT_COPY.md)
6:40 AM — Tweet/Instagram story announcing PH launch with link
6:45 AM — Reach out to beta users (Week 14): "We're live on PH today, would mean a lot if you upvote: [link]"
7:00 AM — Start responding to comments within 5 minutes each
9:00 AM — First metric check: 
  - Position on PH leaderboard
  - Upvote count
  - Comment count
  - Signups from utm_source=producthunt

AFTERNOON (12:00 PM - 6:00 PM):

12:00 PM — Quick lunch
12:30 PM — Continue responses, engage with comments
14:00 PM — Mid-day pulse check:
  - PH position (should be top 20 if going well)
  - Upvote velocity
  - Most-discussed topics in comments
14:30 PM — Post update on Twitter: "Halfway through PH launch day! [N] upvotes, top [N] of the day. Thanks to everyone supporting!"
15:00 PM — Continue PH engagement
16:00 PM — Check email for new signups, respond personally to first 20

EVENING (6:00 PM - 10:00 PM):

18:00 PM — Dinner with family
19:00 PM — Final PH push: post update with new feature mention
20:00 PM — Reply to all evening comments
21:00 PM — Post day-end stats on Twitter
22:00 PM — Sleep

ALL DAY: 
- Respond to EVERY comment within 5 min during peak hours (US daytime)
- Reply to EVERY email within 30 min
- DM hunters/supporters thanking them personally
- Update PH "maker comment" 2-3 times with new improvements

Step 6: Track metrics (every 2 hours):
Use this query:
SELECT 
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day' AND utm_source = 'producthunt') as ph_signups,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '2 hours' AND utm_source = 'producthunt') as last_2h_ph,
  COUNT(DISTINCT user_id) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day') as ph_active_users
FROM profiles p
LEFT JOIN focus_progress fp ON p.id = fp.user_id;

LATE NIGHT FIXES (only if critical):
If a bug breaks signup → fix immediately, deploy
If just minor issues → log and fix tomorrow
DO NOT REFACTOR ANYTHING ON LAUNCH DAY.
```

**Time estimate:** 14 hours of intense engagement (yes, full day)

**Expected outcomes:**
- 200-500 upvotes by end of day
- Top 5-15 placement on PH for the day
- 100-300 signups from PH alone
- 5-15 conversion to paid (Pro trial → paid)
- Multiple meaningful conversations

---

### Days 101-105 (Wednesday-Sunday) — PH afterglow + post-launch fixes

**Claude Code prompt template:**

```
TASK: Day [N] of post-PH — engagement + critical fixes
SPRINT: 5, Week 15, Day [N]

PH is still gaining momentum. Most of the daily routine:

MORNING (1 hour):
- Check PH new comments (respond within 30 min)
- Check Sentry: any new errors from PH users
- Check signups overnight

MIDDAY (3-4 hours):
- Fix critical bugs found by new users
- Reply to all support emails personally
- DM PH supporters with personal thank you
- Reach out to hunters who upvoted (potential partnership)

AFTERNOON (2-3 hours):
- Continue PH replies
- If trending Reddit comments on launch → engage
- Twitter responses

EVENING (1 hour):
- Daily metrics summary in docs/launch/DAILY_METRICS_<day>.md
- Tomorrow's priorities

Specific actions for each day:

DAY 101 (Wed) — Engagement continues
- Reach out to 10 PH commenters offering 1-month free Pro
- Track viral coefficient (signups referring others)
- Fix top 3 bugs

DAY 102 (Thu) — Cross-promotion
- Find adjacent products that launched today on PH
- Cross-promote: "Try [their product] + Ask-My-Notes together"
- Tweet thread about lessons from launch day

DAY 103 (Fri) — Press/media outreach
- Find Indian tech journalists (YourStory, Inc42, The Ken)
- Send launch announcement with PH stats
- Pitch: "Solo founder builds AI study tool for JEE/NEET in 90 days, top X on PH"

DAY 104-105 (Sat-Sun) — Rest + planning
- Light work only
- Write retrospective: "What worked vs what didn't"
- Plan Week 16 (Reddit) precisely
```

**Time estimate:** 6-8 hours/day Wed-Fri, 2-3 hours Sat-Sun

---

## Week 16 — Reddit Launch (Days 106-112)

The goal: **Sustained engagement across 4 subreddits, 500+ signups from Reddit.**

Reddit is different from PH — slower burn, longer engagement. Don't expect instant viral.

---

### Day 106 (Monday) — Reddit campaign launch

**Claude Code prompt:**

```
TASK: Reddit campaign across 4 subreddits
SPRINT: 5, Week 16, Day 106

CRITICAL: Reddit is allergic to corporate spam. Be HUMAN. Use real Reddit account with karma history.

Step 1: Verify your Reddit account (if needed) (15 min)
If your account is new (<1 month old, <100 karma), DO NOT post — it will be auto-removed or flagged.
Either:
- Use a friend's old account (with permission)
- Wait 1 month for your account to mature
- Engage genuinely first: comment helpfully in target subs for 2 weeks

Step 2: Post in 4 subreddits over the day (5 hours)

Subreddit 1: r/JEE (Monday 10 AM IST)
Title: "Built an AI study tool for JEE prep — would love your honest feedback"
Body: From docs/launch/REDDIT_POSTS.md r/JEE section
KEY: Be self-critical. Mention limitations. Reddit respects honesty.

Subreddit 2: r/NEET (Monday 12 PM IST)
Title: "Made something for NEET prep — built solo, looking for feedback"
Body: From docs/launch/REDDIT_POSTS.md r/NEET section
Different angle: emphasize biology mapping, repeat-aspirant friendly

Subreddit 3: r/JEENEETards (Monday 2 PM IST)
Title: "I made a thing for the JEE/NEET grind 😅"
Body: Casual, meme-aware. From docs/launch/REDDIT_POSTS.md r/JEENEETards section
Reddit subs vary in formality. This one's casual.

Subreddit 4: r/IndianStudents (Monday 4 PM IST)
Title: "AI study companion for Indian competitive exams — feedback wanted"
Body: From docs/launch/REDDIT_POSTS.md r/IndianStudents section
More general framing, appeals to broader student base

Step 3: Engage with comments (rest of day + week)
Reddit rules:
- Respond to EVERY top-level comment within 1 hour
- Reply to replies (threads matter for visibility)
- Don't be defensive — acknowledge criticism
- Ask follow-up questions
- Give specific examples
- Never delete negative comments

Step 4: Track metrics
Reddit-specific:
- Upvote ratio (>80% = good signal)
- Comment count (engagement quality > quantity)
- Awards (if any)
- Cross-posts (when others share to other subs)

Signup tracking:
SELECT COUNT(*) FROM profiles 
WHERE utm_source LIKE 'reddit_%' 
  AND created_at >= 'YYYY-MM-DD';
```

**Time estimate:** 8 hours

---

### Days 107-112 (Tue-Sun) — Sustained Reddit engagement

**Daily rhythm:**

```
8:00 AM — Check overnight comments (Reddit US users active when India sleeps)
9:00 AM — Reply to all new comments (within 1 hour rule)
10:00 AM — Check signups + Sentry
11:00 AM — Engage in other r/JEE r/NEET threads (BE HELPFUL, don't promote)
            Goal: build karma so Reddit doesn't flag you as spammer
12:00 PM — Lunch
13:00 PM — Continue Reddit replies + Twitter engagement
15:00 PM — If a Reddit post is gaining traction → cross-post to relevant subs
            (with mod approval, never spam)
16:00 PM — Fix critical bugs found by Reddit users
18:00 PM — Daily metrics summary
20:00 PM — Final check, then close
```

**Key Reddit hacks:**
1. **AMA-style responses:** Treat your launch post like an AMA. Be transparent, share details.
2. **Update OP:** Add "EDIT: Holy s***, thanks for the response. Top 3 things you asked for: [list]"
3. **Cross-promote subtly:** "If you found this useful, my post in r/JEE has more discussion"
4. **Give value first:** Answer JEE/NEET questions in other threads. Build karma. Then occasional mention of your tool.

**Expected outcomes by end of Week 16:**
- 1500-3000 cumulative upvotes across 4 subs
- 300-600 signups from Reddit alone  
- 10-30 conversion to paid
- 50+ meaningful conversations
- 5+ creator partnerships from Reddit visibility

---

## Week 17 — Email Campaign (Days 113-119)

The goal: **Activate waitlist + convert beta users to paid + first referral wave.**

---

### Day 113 (Monday) — Email launch to waitlist

**Claude Code prompt:**

```
TASK: Email campaign to waitlist + beta users
SPRINT: 5, Week 17, Day 113

Step 1: Segment your email list (1 hour)
Export from Supabase:
- Segment A: Waitlist signups who never created account
- Segment B: Beta users who signed up but didn't convert
- Segment C: Free users (signed up, no payment)
- Segment D: Paying users (Pro/Family)

Each segment gets DIFFERENT email.

Step 2: Write segment-specific emails (3 hours)

EMAIL A: Waitlist → Activation
Subject: "Ask-My-Notes is live (and you have early access)"
Body:
"Hi [Name],

You signed up for the waitlist back in [month]. We just went public last week 
on Product Hunt and Reddit. You're getting early access before we open it fully.

What's new since you signed up:
- 1000+ PYQs from JEE/NEET (added this week)
- Daily Briefing with audio (added 2 weeks ago)
- Brain Map showing your concept network

[Direct signup link with utm_source=email_waitlist]

Free 7-day Pro trial. No card needed.

If you have 5 min, would love your feedback after trying it.

[Your name]"

EMAIL B: Beta no-convert → Re-engagement
Subject: "Quick question about Ask-My-Notes"
Body:
"Hi [Name],

You signed up for Ask-My-Notes during our beta last week. Noticed you 
didn't continue past day [X].

Was something broken/confusing? Would really value 30 seconds of feedback.

I'll send you 1 month free Pro just for telling me what didn't work.

Reply to this email with your thoughts. Or DM on Twitter @[handle].

[Your name]"

EMAIL C: Free users → Conversion push
Subject: "Your free trial ends in [X] days"
Body:
"Hi [Name],

Your 7-day Pro trial is ending [date]. 

You've:
- Asked [N] questions
- Studied [N] concepts
- Built a Brain Map with [N] connections

Pro keeps all of this + unlocks:
- Mock test simulator (JEE Main/NEET)
- 1000+ PYQs unlimited practice
- Decompression Mode for burnout prevention

Continue Pro: ₹399/month or ₹2999/year (33% off)
[Upgrade link with utm_source=email_trial_end]

Or stay free with limited features — your Brain Map and progress will be preserved.

Questions? Just reply.

[Your name]"

EMAIL D: Paying users → Referral request
Subject: "Quick favor (1 minute, 1 month free Pro)"
Body:
"Hi [Name],

Thanks for being one of Ask-My-Notes' early paying users. Really means a lot.

Small ask: do you know 1-3 friends prepping for JEE/NEET who'd benefit?

Share this link with them: [your referral link]

For each friend who signs up + tries it, I'll add 1 month free Pro to your account 
(up to 3 months free).

No pressure. But if you're enjoying the tool, your friends might too.

[Your name]"

Step 3: Send emails (1 hour)
Use Mailchimp, SendGrid, or Resend.
Send each segment separately.
Stagger sends throughout day to avoid overwhelming you with replies.

Step 4: Track + reply (rest of week)
- Track opens (target: 30% overall)
- Track clicks (target: 8%)
- Track signups (target: 5%)
- Reply to ALL replies within 24 hours
- For paying users who reply with feedback → 1-month free Pro as gift
```

**Time estimate:** 6 hours setup + 2 hours/day reply for week

---

### Days 114-119 (Tue-Sun) — Email follow-ups + referral push

**Daily rhythm:**

```
Morning (1 hour):
- Check email open/click rates
- Reply to email responses
- Track new referral signups

Midday (2 hours):
- Continue engagement
- For high-engagement responders, send personal follow-up
- Update docs/launch/REFERRALS_DASHBOARD.md

Evening (1 hour):
- Daily metric summary
- Plan tomorrow
```

**Expected outcomes by end of Week 17:**
- 30% open rate on emails
- 200-400 signups from email (across segments)
- 20-40 conversions to paid
- 50+ referrals through paying users
- Identify your best advocates (top 5-10 referrers)

---

## Sprint 5 done test

```
[ ] Product Hunt launch executed (top 20 finish minimum)
[ ] Reddit campaign across 4 subreddits with sustained engagement
[ ] Email campaign sent to 4 segments
[ ] 500+ cumulative signups
[ ] 30+ paying users
[ ] Clear winning channel identified (PH vs Reddit vs Email)
[ ] 5+ creator partnerships in motion
[ ] First Day-7 retention data collected
[ ] No critical production bugs
```

If all checked: Sprint 5 done. Tag: `git tag sprint-5-public-launch-done && git push --tags`.

---

## What's working signal vs noise

By end of Sprint 5, look for:

**Strong signal (means you're on right track):**
- One channel converts >2× the others — double down on it
- Specific feature mentioned positively by 10+ users — that's your "winning feature"
- Users referring friends without being asked
- Paying users asking for specific features (NOT just complaining)

**Warning signs:**
- Signups but no conversion — pricing/value prop issue
- High onboarding drop-off — UX issue
- High refund requests — quality issue
- No referrals — product isn't sticky enough yet

---

*Next: `SPRINT_06_SCALE_AND_MEASURE.md` — Weeks 18-24: Scale what works, measure everything, hit 100 paying users.*
