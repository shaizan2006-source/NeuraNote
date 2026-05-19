# Sprint 04 — Pre-Launch & Friends/Family Beta
*Weeks 13-14 (Days 85-98): From "code done" to "100 real users testing"*
*For: Ask-My-Notes solo founder — Claude Code execution-ready*

---

## Sprint 4 outcome targets

By end of Week 14 (Day 98):
- Production deployment fully verified
- Landing page polished and converting
- 100 friends/family invited with personal emails
- 50-70 of them signed up and tried the product
- 30+ completed onboarding and asked their first question
- 5+ critical bugs found and fixed
- Feedback infrastructure operational
- Creator outreach started (15+ emails sent)
- Mental + asset preparation for public launch (Week 15)

---

## Week 13 — Pre-Launch Prep (Days 85-91)

The goal: **production is bulletproof before any real user touches it.**

---

### Day 85 (Monday) — Production deployment audit

**Acceptance criteria:**
- [ ] App is live at `ask-my-notes.com` (or your domain)
- [ ] All env vars set correctly in Vercel
- [ ] Database migrations applied to production
- [ ] No Sentry errors in last 24 hours
- [ ] Razorpay set to LIVE mode (not test)
- [ ] All API routes return correct status codes

**Claude Code prompt:**

```
TASK: Production deployment audit
SPRINT: 4, Week 13, Day 85

Verify production is ready for real users. Check each item:

1. Visit production URL — does landing page load?
2. Check Vercel dashboard:
   - All env vars set (compare to .env.example)
   - Build succeeded on latest commit
   - Function logs show no errors
3. Run smoke test on production:
   curl -i https://ask-my-notes.com/api/health
   Expected: 200 OK
4. Check Supabase:
   - All migrations applied (supabase db diff --linked returns empty)
   - RLS enabled on all user-data tables
   - Storage buckets exist (user-pdfs, briefings, photo-doubts, etc.)
5. Check Razorpay:
   - Currently in LIVE mode (not test)
   - Webhook URL pointed to production endpoint
   - Test payment with real ₹1 transaction
6. Check Sentry:
   - No new errors in last 24 hours
   - Dashboard shows production environment
7. Check UptimeRobot:
   - /api/health monitor active
   - Shows 99%+ uptime last 7 days

REPORT:
For each item, mark PASS/FAIL with actual data.
If any FAIL, fix immediately before proceeding.
```

**Time estimate:** 3 hours

---

### Day 86 (Tuesday) — End-to-end user flow testing

**Acceptance criteria:**
- [ ] New user signup flow works (no email, no friction)
- [ ] PDF upload + processing works
- [ ] First Q&A works (streams answer with sources)
- [ ] Brain Map renders correctly
- [ ] Daily Briefing generates (manually trigger cron)
- [ ] Push notifications fire on real devices (iOS PWA + Android)
- [ ] Payment flow completes successfully
- [ ] Pause + cancel subscription works
- [ ] Account export + deletion works

**Claude Code prompt:**

```
TASK: End-to-end smoke test of all critical user flows
SPRINT: 4, Week 13, Day 86

Test on production (not local). Use 3 test accounts:
- Account A: New user (just signed up)
- Account B: Mid-flow user (uploaded PDF, asked 5 questions)
- Account C: Paying user (Pro tier active)

FLOW 1: New signup → first answer
1. Sign up with new email
2. Complete onboarding (JEE/NEET, exam date, etc.)
3. Upload sample PDF (use sample-pdfs/jee-physics-mechanics.pdf)
4. Wait for processing (target: <30s)
5. Ask "what is Newton's third law?"
6. Verify: streaming works, source chips appear, concepts added to Brain Map
TARGET: <3 min from signup to first answer

FLOW 2: Brain Map exploration
1. Open /brain-map
2. Verify graph renders (no empty state if PDF was uploaded)
3. Click a concept node
4. Verify side panel shows: mastery score, recent questions, suggested practice
5. Filter by subject
TARGET: All interactions <500ms

FLOW 3: Payment flow
1. Login as Account A (no subscription)
2. Click "Upgrade to Pro" anywhere
3. Razorpay checkout opens with ₹399/month
4. Use test card: 4111 1111 1111 1111
5. Complete payment
6. Verify: subscription activated, paywall removed
7. Cancel subscription (Settings → Subscription → Cancel)
8. Verify: data preserved, marked cancelled
TARGET: Payment completes in <30s

FLOW 4: Push notifications
1. Login as Account A
2. Settings → Enable notifications
3. Grant browser permission
4. Manually trigger /api/cron/dispatch-notifications via Vercel
5. Verify: push notification arrives within 1 min

FLOW 5: Data export + delete
1. Login as Account B
2. Settings → Privacy → Export my data
3. Verify: JSON file downloads with all user data
4. Settings → Privacy → Delete account
5. Verify: confirmation flow, 90-day grace period explained

REPORT: Document each flow with timestamps and any issues.
Fix critical issues immediately (signup broken = blocker).
```

**Time estimate:** 4 hours

---

### Day 87 (Wednesday) — Landing page final polish

**Acceptance criteria:**
- [ ] Hero loads in <1s, message clear in 3s
- [ ] 3 features visible above the fold
- [ ] Social proof section (even if just "Built solo, beta users from Bangalore/Delhi/Mumbai")
- [ ] Pricing visible (₹199/₹399/₹4499)
- [ ] Email waitlist signup form
- [ ] Mobile responsive (test on real phone)
- [ ] Lighthouse mobile ≥85
- [ ] FAQ section (5-10 common questions)

**Claude Code prompt:**

```
TASK: Final landing page polish for launch
SPRINT: 4, Week 13, Day 87
ARCHITECTURE REFERENCE: UI_UX_SYSTEM.md Section 3 (Landing page)

Refine app/(marketing)/page.js or app/page.js. Final state must include:

HERO SECTION (above the fold):
- Headline: "Remember everything you study. Ace JEE/NEET."
- Subheadline: "AI Brain Map + Daily Briefing + 1000+ official PYQs. Built for Indian competitive exams."
- Primary CTA: "Start free 7-day trial" → /signup
- Secondary: "See how it works" → scroll to features
- Hero image: screenshot of Brain Map (use existing Brain Map screenshot or create one)

FEATURE SECTION (3 cards):
1. Brain Map
   - "See your knowledge grow"
   - Show small visualization
   - "Every concept you study connects automatically"
2. Daily Briefing
   - "90 seconds. Every morning."
   - Show audio player mockup
   - "AI summarizes what to review based on your gaps"
3. PYQs + AI Tutor
   - "1000+ official questions. AI explains every one."
   - "JEE Main 2018-2024, NEET 2018-2024, JEE Advanced"
   - "Ask anything. Get answers from your notes + official solutions."

SOCIAL PROOF (after features):
- "Beta tested by [N] students in Bangalore, Delhi, Mumbai, Pune, Hyderabad"
- 2-3 quotes (you'll get these from Week 14 beta)
- "Built by a JEE/NEET aspirant who needed this themselves"

PRICING PREVIEW:
- Show 3 tiers side-by-side
- Highlight Student tier (most popular)
- "7-day free trial. No card required."
- CTA: "Start trial"

FAQ SECTION (10 questions):
1. Is this only for JEE/NEET?
2. Do I need to upload my own notes?
3. How is this different from Anki?
4. How is this different from NotebookLM?
5. Is my data private?
6. Can I cancel anytime?
7. Does it work offline?
8. Does it work on iPhone?
9. What languages?
10. Can I share with friends?

EMAIL WAITLIST (footer):
- "Not ready to sign up? Get launch updates."
- Email input + Submit button → POST /api/waitlist
- Confirmation: "Thanks. We'll email when something good ships."

TECHNICAL:
- Lazy load below-fold images
- Inline critical CSS
- Defer non-critical scripts
- Lighthouse mobile ≥85
- Test on iPhone Safari + Android Chrome

FILES TO TOUCH:
- app/(marketing)/page.js (or app/page.js)
- components/marketing/Hero.jsx
- components/marketing/FeatureCard.jsx
- components/marketing/PricingPreview.jsx
- components/marketing/FAQ.jsx
- components/marketing/WaitlistForm.jsx
- app/api/waitlist/route.js (creates POST endpoint)
- supabase/migrations/<ts>_waitlist_emails.sql

Migration:
CREATE TABLE IF NOT EXISTS waitlist_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  invited_at TIMESTAMPTZ
);

VERIFICATION:
1. Lighthouse mobile audit ≥85
2. Test on iPhone Safari → looks good
3. Test on Android Chrome → looks good
4. Waitlist email submission works → row inserted
5. All CTAs route correctly
```

**Time estimate:** 5-6 hours

---

### Day 88 (Thursday) — Launch copy + assets

Create all launch copy now so you're not writing under pressure during launch week.

**Claude Code prompt:**

```
TASK: Create all launch copy + screenshots
SPRINT: 4, Week 13, Day 88

Create docs/launch/ folder with these files:

1. docs/launch/PRODUCT_HUNT_COPY.md
   Title: "Ask-My-Notes — AI study companion for JEE/NEET"
   Tagline: "Brain Map + Daily Briefing + 1000+ PYQs. Remember what you study."
   First comment (most important):
   "Hey Product Hunt 👋
   
   I built Ask-My-Notes because I was tired of forgetting concepts I'd studied 
   a week ago. The Indian competitive exam grind (JEE/NEET) requires you to 
   retain massive amounts of information across Physics, Chemistry, Math/Biology.
   
   Most study tools just give you AI chat. Ask-My-Notes adds:
   - Brain Map: every concept you touch connects visually
   - Daily Briefing: 90-second AI audio summarizing your weak spots  
   - 1000+ official PYQs (JEE Main, NEET, JEE Advanced)
   - Decompression Mode: detects when you're overwhelmed, suggests breaks
   
   Built solo over 3 months. Tested with friends prepping for JEE 2026/2027.
   
   Free 7-day Pro trial. No card required.
   
   Would love feedback from anyone who's struggled with study retention!"
   
   Categories: Education, Productivity, Artificial Intelligence
   Topics: Education, EdTech, India, AI, Study tools

2. docs/launch/REDDIT_POSTS.md
   For each subreddit, separate post:
   - r/JEE (1.2M members) - focus on Mock Sim + PYQs + Brain Map
   - r/NEET (500K members) - focus on biology mapping + practice + briefing  
   - r/IndianStudents (200K) - general benefits
   - r/JEENEETards (100K) - casual tone, meme-aware
   
   Each post structure:
   - Honest opening ("I built this because...")
   - 4 specific features
   - Honest limitations ("doesn't have X yet")
   - Free trial mention
   - "AMA in comments"
   - Link in body (Reddit allows once per top-level post in dedicated subs)
   
   IMPORTANT: Different angle per sub. Don't copy-paste.

3. docs/launch/EMAIL_LAUNCH.md
   For waitlist + friends:
   Subject: "Ask-My-Notes is live (and you're invited first)"
   Body: Personal tone, mentions you spent 3 months on it, asks for feedback,
   provides direct link with utm_source=email_launch

4. docs/launch/CREATOR_OUTREACH.md
   Template for reaching 15 micro-creators:
   Subject: "5-min feedback on AI study tool for JEE/NEET?"
   Tone: Genuine, not salesy. Asks for feedback first, mentions partnership only at end.
   Customization placeholders: {creator_name}, {their_recent_video}, {their_audience_topic}

5. docs/launch/SCREENSHOTS/
   Generate or capture 5 screenshots for PH gallery:
   - 01_hero_brain_map.png (Brain Map visualization, 1024x768)
   - 02_daily_briefing.png (player UI, 1024x768)
   - 03_qa_with_sources.png (Q&A streaming + sources, 1024x768)
   - 04_pyq_practice.png (PYQ search + practice, 1024x768)
   - 05_progress_dashboard.png (analytics view, 1024x768)
   Use puppeteer or manual screenshots from production.

6. docs/launch/THUMBNAIL.png
   500x500 for Product Hunt thumbnail
   Logo + "Ask-My-Notes" + "AI study for JEE/NEET"

VERIFICATION:
- All 5 .md files created
- 5 screenshots captured at correct resolution  
- Thumbnail 500x500
- All copy reviewed for: no typos, no exaggeration, no false claims
- Reddit posts feel native to each sub (not corporate)
```

**Time estimate:** 4-5 hours

---

### Day 89 (Friday) — Creator outreach + tracking setup

**Claude Code prompt:**

```
TASK: Identify creators + send outreach + set up tracking
SPRINT: 4, Week 13, Day 89

Step 1: Build creator list (1 hour)
Create docs/launch/CREATOR_LIST.csv with columns:
- name
- platform (youtube|instagram|twitter|reddit)
- follower_count
- niche (JEE Physics|NEET Bio|General prep|etc)
- contact (email|DM|comment)
- status (not_contacted|contacted|responded|partnership|declined)
- utm_code (unique tracking code: creator_<lastname>)

Target 20 creators (mix of sizes):
- 5 mid-tier YouTubers (50K-200K subs)
- 5 small YouTubers (10K-50K subs)  
- 5 Instagram educators (10K-100K)
- 3 Twitter accounts (active in JEE/NEET space)
- 2 Reddit power users (high karma in r/JEE or r/NEET)

How to find them:
- YouTube search "JEE Physics" → sort by upload date → top 10 in last month
- Same for NEET, JEE Math, JEE Chemistry
- Instagram: search hashtags #JEE2026 #NEET2026 #JEEPrep
- Twitter: search "JEE prep" → filter people, sort by followers

Step 2: Personalized outreach (3 hours)
For each creator:
- Watch/read 1 piece of their recent content
- Note something specific in the email
- Send personalized email (use docs/launch/CREATOR_OUTREACH.md template)

Goal: 15 emails sent by EOD Friday.

Step 3: Set up referral tracking (1 hour)
- Add UTM tracking to all signup links
- Create app/api/admin/referrals/route.js (admin-only)
- Returns: signups by utm_source + utm_medium + utm_campaign
- Track conversion to paid per source

VERIFICATION:
1. CREATOR_LIST.csv exists with 20 entries
2. 15 personalized emails sent (check sent folder)
3. /api/admin/referrals returns correct data
4. UTM parameters on landing page tracked correctly
```

**Time estimate:** 5 hours

---

### Days 90-91 (Saturday-Sunday) — Mandatory rest

**No coding. Repeat: no coding.**

What you CAN do:
- Final review of Week 14 plan
- Light reading
- Sleep 8+ hours
- Eat real food
- See family

What you must NOT do:
- "One small fix"
- "Quick deploy"
- Refactor anything
- Check Sentry obsessively

Week 14 starts Monday. You'll need full energy for 7 days of intense user feedback.

---

## Week 14 — Friends & Family Beta (Days 92-98)

The goal: **100 real users touch your product. You learn what's actually broken.**

---

### Day 92 (Monday) — Send beta invites

**Claude Code prompt:**

```
TASK: Beta launch — send 100 personalized invites
SPRINT: 4, Week 14, Day 92

Step 1: Build invite list (30 min)
Create docs/launch/BETA_INVITES.csv:
- 50 friends/classmates studying for JEE/NEET
- 30 people from your network (Twitter mutuals, college friends)
- 20 from waitlist (if you collected emails on landing page)

Step 2: Set up tracking (30 min)
- Add ?utm_source=beta_friends to all invite links
- Create dashboard query to track beta cohort separately:
  SELECT * FROM profiles WHERE referral_source = 'beta_friends'

Step 3: Send personalized emails (4 hours)
For EACH person, send a personalized email:
- Mention how you know them
- 1-line about why you built this
- Direct link with their unique referral code
- Ask 1 specific thing ("try uploading a PDF" or "ask about ___")
- Promise: "I'll respond to your feedback within 24h"

Email template (customize for each):
"Hi [Name],

You're one of 100 people I'm inviting to test Ask-My-Notes before the public launch next week.

I spent 3 months building this because [why - personalized].

It's an AI study companion for JEE/NEET. The 3 things I'm most proud of:
1. Brain Map — see everything you're learning, visually
2. Daily Briefing — 90-second audio every morning about your weak spots
3. 1000+ PYQs from JEE Main, NEET, JEE Advanced

Free 7-day Pro trial. No card needed.

[Personal link with their ref code]

If you have 10 minutes, try uploading one of your study PDFs and asking 3 questions.

Then tell me what's broken / confusing / missing. Honestly.

I'll respond within 24 hours. Promise.

Thanks,
[Your name]"

Step 4: Set up feedback channels (1 hour)
- WhatsApp group: "Ask-My-Notes Beta" — invite all 100
- Or Discord server with #feedback channel  
- Or just direct WhatsApp/email — whichever you'll actually respond to
- Make sure you can respond fast (within 1 hour during day)

VERIFICATION:
1. 100 personalized emails sent (NOT a mass blast)
2. Tracking shows beta_friends cohort separately
3. Feedback channel set up and tested
4. You can see new signups in real-time
```

**Time estimate:** 6 hours

---

### Days 93-97 (Tuesday-Saturday) — Daily feedback + fix cycle

**Daily rhythm (every day, same):**

```
8:00 AM — Check overnight signups
8:30 AM — Check Sentry for new errors
9:00 AM — Read all new feedback (messages, emails)
9:30 AM — Categorize feedback:
  - Critical bugs (fix today)
  - UX confusion (fix this week if quick)
  - Feature requests (log for later, don't build)
  - Compliments (read for energy)
10:00 AM — Start fixing top 3 critical bugs
1:00 PM — Lunch + walk
2:00 PM — Continue fixes
5:00 PM — Reply to all feedback messages
6:00 PM — Deploy fixes
7:00 PM — Eat dinner
8:00 PM — Final check, then close laptop
```

**Daily Claude Code prompt template:**

```
TASK: Day [N] of beta — bug triage + fixes
SPRINT: 4, Week 14, Day [N]

Step 1: Read Sentry (15 min)
Group errors by:
- Frequency (highest first)
- User impact (signup broken > slow load > minor UI)

Step 2: Fix top 3 issues (4-5 hours)
For each:
- Reproduce locally
- Fix
- Test locally
- Deploy to production
- Verify fix in production
- Notify affected users if needed

Step 3: Track metrics (15 min)
Run these queries:
- New signups today
- Onboarding completion rate
- First question rate
- Active users today
- Conversion to paid (any?)

Step 4: Reply to feedback (2 hours)
- Reply to EVERY message within 24h
- Acknowledge issue
- Tell them when fix will land
- Thank them genuinely

Step 5: Update beta dashboard
Create/update docs/launch/BETA_DASHBOARD.md with:
- Total signups: X
- Onboarding completion: X%
- First question rate: X%
- Active today: X
- Top 3 issues found today
- Top 3 issues fixed today
- Most common feedback theme
```

**By end of Saturday (Day 97):**
- 50-70 of 100 invitees signed up
- 30-50 completed onboarding
- 20-30 asked first question
- 5-10 paying users (organic, no push)
- 10-15 critical bugs fixed
- Clear feedback themes identified

---

### Day 98 (Sunday) — Beta retrospective + Week 15 prep

**Claude Code prompt:**

```
TASK: Beta retrospective + Week 15 launch prep
SPRINT: 4, Week 14, Day 98

Step 1: Write retrospective (1 hour)
Create docs/launch/BETA_RETRO.md:

What worked:
- Top 3 things users loved (with quotes)
- Conversion numbers vs expectations
- Bugs caught early (would have been disasters in public launch)

What didn't work:
- Top 3 friction points (with examples)
- Onboarding drop-off points
- Feature confusion areas

Decisions for public launch:
- What to fix before Tuesday (Week 15 Day 99)
- What to defer to post-launch
- What to remove/hide from landing page
- Pricing adjustments needed?

Step 2: Final fixes (3 hours)
Fix only critical issues that would tank public launch:
- Signup flow broken anywhere
- Payment flow has any issue
- Mobile rendering completely broken
- Crash on common action

NOT this week:
- Refactors
- New features
- Polish that beta users didn't complain about

Step 3: Product Hunt prep (2 hours)
- Verify thumbnail, screenshots, copy all ready
- Schedule PH submission for Tuesday 12:01 AM PST (12:31 PM IST Tuesday)
- Tell PH hunter you have (if you found one via outreach)
- Prepare 10 responses for common PH questions
- Stockpile 3-4 "feature improvements" to announce DURING PH day

Step 4: Mental prep
- Block calendar for Tuesday-Thursday (PH days)
- Tell family/friends you're heads-down
- Buy snacks
- Set phone reminders for 6am, 10am, 1pm, 5pm, 8pm to check PH
- Sleep early Monday night
```

**Time estimate:** 6 hours

---

## Sprint 4 done test

```
[ ] Production deployment fully verified
[ ] Landing page final, Lighthouse ≥85
[ ] All launch copy ready (PH, Reddit, email)
[ ] 5 screenshots + thumbnail prepared
[ ] 15 creator outreach emails sent
[ ] 100 beta invitations sent personally
[ ] 50+ beta signups
[ ] 30+ completed onboarding
[ ] 10+ critical bugs fixed
[ ] Feedback infrastructure operational
[ ] Beta retrospective complete
[ ] Week 15 (Product Hunt) fully prepped
```

If all checked: Sprint 4 done. Tag: `git tag sprint-4-prelaunch-beta-done && git push --tags`.

---

## What gets cut if Sprint 4 runs over

In order:
1. Creator outreach (defer to Week 15-16 — they'll see PH anyway)
2. Some FAQ items on landing (ship with 5, not 10)
3. Some screenshots (3 is enough for PH, not 5)
4. Some beta invitees (60 personal invites is better than 100 mass emails)

Never cut:
- Production deployment audit (Day 85)
- Smoke testing (Day 86)
- Landing page polish (Day 87)
- Beta invites (Day 92) — without users, Week 15 launch is shouting into void

---

*Next: `SPRINT_05_PUBLIC_LAUNCH.md` — Weeks 15-17: Product Hunt, Reddit, Email.*
