# Sprint 06 — Scale & Measure
*Weeks 18-24 (Days 120-168): Double down on what works, hit 100 paying users*
*For: Ask-My-Notes solo founder — Claude Code execution-ready*

---

## Sprint 6 outcome targets

By end of Week 24 (Day 168):
- 1000+ cumulative signups
- 100+ paying users (₹20-40K MRR)
- Day-7 retention ≥40%
- Day-30 retention ≥20% (first cohorts crossing day 30)
- Clear product-market fit signal (or clear pivot signal)
- 10+ creator partnerships active and producing signups
- SEO traction: 5+ pages ranking in Google for JEE/NEET queries
- Ready for next phase: scale aggressively OR pivot based on data

---

## Pre-Sprint 6 decision

Before Week 18, look at your Sprint 5 data and answer:

**Question 1: Which channel converted best?**
- Product Hunt? (Tech-forward early adopters)
- Reddit? (Genuine community engagement)
- Email? (Pre-existing audience)
- Direct/organic? (Word of mouth from beta)

**Pick ONE primary channel for Sprint 6. Double down. Cut others.**

**Question 2: What's your most popular feature?**
Run this query:
```sql
SELECT
  CASE 
    WHEN COUNT(*) FILTER (WHERE feature = 'brain_map_view') > 0 THEN 'brain_map'
    WHEN COUNT(*) FILTER (WHERE feature = 'pyq_practice') > 0 THEN 'pyqs'
    WHEN COUNT(*) FILTER (WHERE feature = 'mock_test') > 0 THEN 'mocks'
    WHEN COUNT(*) FILTER (WHERE feature = 'briefing_played') > 0 THEN 'briefing'
    ELSE 'qa'
  END as primary_feature,
  COUNT(*) as user_count
FROM analytics_events
WHERE created_at >= NOW() - INTERVAL '14 days'
GROUP BY primary_feature
ORDER BY user_count DESC;
```

**The most-used feature is your "wedge."** Lead all marketing with that feature.

**Question 3: Where's the leak?**
Funnel analysis:
- Signup → Onboarding complete: ___%
- Onboarding → First question: ___%
- First question → Day 7 return: ___%
- Day 7 return → Day 30 return: ___%
- Free → Paid: ___%

**Find the biggest drop and fix it in Sprint 6.**

---

## Week 18 — Channel Optimization (Days 120-126)

The goal: **Identify and double down on the channel that's working best.**

---

### Day 120 (Monday) — Weekly metrics deep-dive

**Claude Code prompt:**

```
TASK: Comprehensive metrics analysis from Sprints 4-5
SPRINT: 6, Week 18, Day 120

Step 1: Run all 5 measurement queries from SPRINT_4_AND_BEYOND_PLANNING.md (1 hour)
Save results to docs/launch/METRICS_WEEK_18.md:
- Day-7 retention by cohort
- Day-30 retention (first cohorts available)
- Trial-to-paid conversion
- Channel performance (PH vs Reddit vs Email)
- Feature adoption rates
- Churn analysis

Step 2: Build channel-level conversion funnel (1 hour)
For each channel (PH, Reddit, Email, Direct):
- Signups (top of funnel)
- Onboarding completed (%)
- First question asked (%)
- Returned Day 2 (%)
- Returned Day 7 (%)
- Converted to paid (%)
- Active Day 14 (%)

Query:
WITH channel_funnel AS (
  SELECT 
    COALESCE(utm_source, 'direct') as channel,
    COUNT(DISTINCT p.id) as signups,
    COUNT(DISTINCT CASE WHEN p.onboarding_completed = true THEN p.id END) as onboarded,
    COUNT(DISTINCT CASE WHEN c.user_id IS NOT NULL THEN p.id END) as asked_question,
    COUNT(DISTINCT CASE WHEN p.last_active_at >= p.created_at + INTERVAL '6 days' THEN p.id END) as day_7_active,
    COUNT(DISTINCT CASE WHEN up.plan IN ('student', 'pro', 'family') AND up.activated_at IS NOT NULL THEN p.id END) as paid
  FROM profiles p
  LEFT JOIN conversations c ON p.id = c.user_id
  LEFT JOIN user_plans up ON p.id = up.user_id
  WHERE p.created_at >= NOW() - INTERVAL '21 days'
  GROUP BY channel
)
SELECT * FROM channel_funnel ORDER BY signups DESC;

Step 3: Identify winning channel (30 min)
Calculate conversion economics:
- Channel X drove [N] signups
- Of those, [M] converted to paid
- ARPU (Average Revenue Per User): ₹399/month avg
- Acquisition cost: ₹0 (organic launch)
- Payback period: Immediate (no spend)

WINNER: Channel with highest signup-to-paid % AND highest absolute paid count

Step 4: Decision document (1 hour)
Create docs/launch/SPRINT_6_STRATEGY.md:

WINNING CHANNEL: [Channel name]
WHY IT WON: [Specific reasons - users active there, value resonates, etc.]
DOUBLE-DOWN STRATEGY:
- More content for [channel type] (e.g., more Reddit posts, more PH-style launches)
- Find similar channels (e.g., if Reddit worked: try r/Indian_Academia, r/SchoolBeMyDad)
- Build feature/partnerships that align with [channel] audience

WHAT TO CUT:
- Stop investing time in channels with <5% conversion
- But keep "maintenance mode": reply to comments, basic engagement

WEAKEST POINT IN FUNNEL: [step name]
EXAMPLE: 40% drop between onboarding completion and first question
FIX: Redesign first question flow, add prompt suggestions, add sample queries
```

**Time estimate:** 4 hours

---

### Days 121-125 (Tue-Fri) — Channel doubling-down

**Claude Code prompt template (depends on winning channel):**

```
TASK: Double down on [WINNING CHANNEL]
SPRINT: 6, Week 18, Day [N]

IF WINNING CHANNEL IS REDDIT:

Step 1: Find 5 adjacent subreddits (1 day)
- r/IndiaEducation
- r/IndianSchooledKids
- r/SchoolBeMyDad
- r/StudyTips_India
- r/12thgradehelp_India

Step 2: Build genuine presence in 2-3 of them (2-3 weeks total)
- Comment helpfully without promoting (10 comments/day)
- Build karma in those subs (>50 karma before posting)
- After 1 week of engagement, post your tool naturally
- Different angle for each sub (don't copy-paste)

Step 3: Content marketing on Reddit (ongoing)
- 1 useful post per week per sub
- "How to memorize organic chemistry reactions" (helpful, mentions tool naturally)
- "JEE Mains prep mistakes I see in r/JEE" (positions you as expert)
- "Built an FSRS scheduler for JEE — here's what I learned" (technical/interesting)

Step 4: Cross-platform (Twitter/Instagram)
Reddit-style content also works on:
- Twitter threads
- Instagram carousels
- YouTube shorts


IF WINNING CHANNEL IS PRODUCT HUNT:

Step 1: Launch on adjacent platforms (1 week)
- Hacker News "Show HN"
- Indie Hackers
- BetaList
- AlternativeTo
- StackShare

Step 2: Get more PH visibility
- Follow up with PH hunters who upvoted
- Comment on other PH launches in your category
- Build follower count
- Re-launch with major update in 3-6 months

Step 3: Tech press outreach
- TechCrunch (long-shot)
- YourStory, Inc42, Entrackr (Indian tech press)
- AI newsletters: Ben's Bites, TLDR AI, The Rundown
- Personal blogs of tech VCs in India


IF WINNING CHANNEL IS EMAIL:

Step 1: Build email list aggressively (1 week)
- Lead magnet: "JEE Physics formula sheet (free PDF)" → collect emails
- "NEET Biology mnemonics (free guide)" → collect emails
- Each lead magnet adds 100+ emails/week if done well

Step 2: Email automation sequences
- Welcome series (5 emails over 14 days)
- Re-engagement (for inactive users)
- Referral push (for happy paying users)
- Educational content (weekly tips)

Step 3: Newsletter (weekly)
- "Ask-My-Notes Weekly" — 1 study tip + 1 product update + 1 user story
- Build to 5000+ subscribers
- Become a content brand, not just a tool


IF WINNING CHANNEL IS CREATORS:

Step 1: Formalize partnerships (1 week)
- Affiliate dashboard at /partners
- Track each creator's referrals
- Pay commissions monthly (10-20% of first-month subscription)

Step 2: Sponsorship deals
- For mid-tier creators (50K-200K subs): paid placements
- Budget: ₹5K-20K per sponsored video
- Track ROAS (Return on Ad Spend)

Step 3: Co-create content
- "Solve a JEE problem with Ask-My-Notes" videos
- Live streams with creators using the product
- Joint webinars on study strategies

VERIFICATION:
By end of Week 18:
- 2x signups from winning channel vs previous week
- 1.5x conversion rate (more targeted = better quality)
- Identified 3 next channels to test
```

**Time estimate:** 6 hours/day Tue-Fri

---

### Days 125-126 (Sat-Sun) — Rest

Light work only. Sprint 6 is a 7-week marathon — pace yourself.

---

## Week 19 — Fix the Biggest Funnel Leak (Days 127-133)

The goal: **Improve the worst conversion point in your funnel by 50%.**

---

### Day 127 (Monday) — Funnel leak diagnosis

**Claude Code prompt:**

```
TASK: Identify and fix the #1 funnel leak
SPRINT: 6, Week 19, Day 127

Step 1: Re-run funnel analysis (30 min)
From Day 120 data, identify the BIGGEST drop-off:

Common leak points:
A. Signup → Onboarding (>30% drop = critical)
B. Onboarding → First question (>40% drop = critical)
C. First question → Day 7 return (>50% drop = expected, but >70% = problem)
D. Free → Paid (>92% drop = expected for B2C, but >95% = problem)

The biggest drop is YOUR leak.

Step 2: User interviews (3 hours)
DM or email 10 users who dropped off at that point:
"Hi [Name], saw you signed up but didn't [complete onboarding/ask question/etc]. 
Mind sharing what stopped you? 5 questions, I'll send 1 month free Pro."

5 questions:
1. What were you hoping the product would do?
2. What stopped you from continuing?
3. What was confusing?
4. What was missing?
5. What would make you try again?

Step 3: Synthesize feedback
Look for patterns:
- 3+ users mention same issue = real problem
- 5+ users mention same issue = critical, fix immediately
- 1-2 users = edge case, log but don't prioritize

Step 4: Plan fixes (1 hour)
Create docs/launch/FUNNEL_FIX_PLAN.md with:
- The leak: [exact step]
- The cause: [from interviews]
- The fix: [specific change]
- Success metric: [target % improvement]
- Time estimate: [hours]
- Risk: [what could go wrong]
```

**Time estimate:** 5 hours

---

### Days 128-132 (Tue-Sat) — Build the fix

**Claude Code prompt template (depends on the leak):**

```
TASK: Fix [BIGGEST LEAK] — implementation
SPRINT: 6, Week 19, Day [N]

IF LEAK IS SIGNUP → ONBOARDING:
Common fixes:
- Reduce signup friction (one-tap Google OAuth)
- Show value immediately (don't ask questions before showing product)
- Skip optional fields (mark fewer required)
- Add progress indicator (5 steps shown clearly)
- Mobile-optimize signup flow

Files to touch:
- app/onboarding/page.js
- components/onboarding/*.jsx
- lib/auth.js (Google OAuth)


IF LEAK IS ONBOARDING → FIRST QUESTION:
Common fixes:
- Pre-load sample PDF (so users can ask immediately)
- Show suggested questions ("Try: 'Explain Newton's third law'")
- Make Q&A button prominent (not buried)
- Reduce friction to ask (one-click examples)
- Tutorial overlay highlighting Q&A button

Files to touch:
- app/dashboard/page.js (suggest first question)
- components/dashboard/EmptyState.jsx (with sample queries)
- components/qa/SuggestedQuestions.jsx (new component)


IF LEAK IS FIRST QUESTION → DAY 7 RETURN:
Common fixes:
- Send Day 1 re-engagement email ("Try asking about ___")
- Push notification Day 1 (if enabled)
- Better Briefing on Day 2 (highlight what they learned)
- Email digest if no push
- Make Brain Map more visible (it's the "come back" hook)

Files to touch:
- lib/notifications/dispatcher.js (Day 1 nudge)
- lib/emails/dayOneNudge.js (new)
- app/dashboard/page.js (Brain Map prominent for returning users)


IF LEAK IS FREE → PAID:
Common fixes:
- Make trial limits clearer (show "X questions left this week")
- Show paid features in free (with lock icon + upgrade CTA)
- Better trial-end email (specific benefits, not generic)
- Lower price test (₹199 → ₹99 special, A/B test)
- Annual plan more prominent (33% off)
- Family plan more prominent (4 students = better deal)

Files to touch:
- components/banners/TrialBanner.jsx (clearer countdown)
- app/pricing/page.js (better tier comparison)
- lib/emails/trialEnding.js (better copy)
- app/api/payments/create-order/route.js (test price)

VERIFICATION:
After fix, measure same funnel step:
- Before: [%]
- After: [%]
- Improvement: [N percentage points]
TARGET: 50% improvement in that specific step
```

**Time estimate:** 5-6 hours/day

---

### Day 133 (Sunday) — Test + measure improvement

**Claude Code prompt:**

```
TASK: Verify funnel fix worked
SPRINT: 6, Week 19, Day 133

Step 1: Re-run funnel query (30 min)
Compare:
- Last week (before fix): [%]
- This week (after fix): [%]

Step 2: A/B test if possible
For payment/pricing changes:
- 50% see old version
- 50% see new version
- Compare conversion rates

For other changes:
- Compare cohorts: users signed up before fix vs after fix

Step 3: Iterate or accept
If improvement ≥50%: SUCCESS, move on
If improvement 20-50%: PARTIAL, iterate one more week
If improvement <20%: WRONG DIAGNOSIS, re-interview users
```

**Time estimate:** 3 hours

---

## Week 20 — Content + SEO Sprint (Days 134-140)

The goal: **Start ranking on Google for JEE/NEET search queries. SEO compounds for months.**

---

### Day 134 (Monday) — SEO strategy + content calendar

**Claude Code prompt:**

```
TASK: SEO strategy and content production
SPRINT: 6, Week 20, Day 134

Step 1: Keyword research (2 hours)
Target keywords for JEE/NEET:
- "JEE Main mechanics formulas" (high volume, medium competition)
- "NEET biology mnemonics" (high volume, low competition)
- "JEE 2024 physics PYQ" (high commercial intent)
- "How to memorize organic chemistry"
- "JEE Main vs Advanced difference"

Use Google Search Console + Ahrefs + answer the public (free) to find:
- 50 keywords with 1000+ monthly searches
- Low competition (Domain Authority needed <30)
- High commercial intent (PYQ-related, prep-related)

Save to docs/launch/SEO_KEYWORDS.csv:
- keyword
- monthly_volume
- competition (low/med/high)
- commercial_intent (info/transactional)
- our_page (URL to optimize)

Step 2: Content production plan (2 hours)
For Week 20-24 (5 weeks), produce 25 pieces of content:
- 10 blog posts (study guides, how-tos)
- 10 PYQ solution pages (with detailed explanations)
- 5 comparison pages ("Ask-My-Notes vs X")

Each piece:
- Target 1 specific keyword
- 1500-2500 words
- Includes Ask-My-Notes CTA at end
- Internal links to product
- Schema.org markup

Step 3: Create blog infrastructure (3 hours)
Files to create:
- app/blog/page.js (blog index)
- app/blog/[slug]/page.js (individual posts)
- supabase/migrations/<ts>_blog_posts.sql
- components/blog/PostCard.jsx
- components/blog/PostBody.jsx (with markdown rendering)
- lib/blog/seo.js (schema.org generators)

Migration:
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  meta_description TEXT,
  body MARKDOWN,
  author TEXT,
  category TEXT,
  published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  read_time_minutes INT,
  target_keywords TEXT[]
);

CREATE INDEX blog_posts_published_idx ON blog_posts (published_at DESC) WHERE published_at IS NOT NULL;
CREATE INDEX blog_posts_category_idx ON blog_posts (category);

Step 4: Sitemap update
Update app/sitemap.ts to include blog posts.
```

**Time estimate:** 8 hours

---

### Days 135-139 (Tue-Sat) — Content production (5 posts)

**Claude Code prompt template:**

```
TASK: Write blog post #[N] for SEO
SPRINT: 6, Week 20, Day [N]

Topic: [from SEO_KEYWORDS.csv - day's keyword]
Target keyword: [exact phrase]
Word count: 2000+

Structure:
1. H1: Include exact keyword
2. Intro (150 words): Hook + problem + what they'll learn
3. Main content: 5-7 H2 sections, each with H3 subsections
4. Practical examples (use real PYQs from your database)
5. Common mistakes section
6. FAQ section (5 questions, schema markup)
7. Conclusion + CTA: "Practice with Ask-My-Notes free trial"

SEO checklist:
- Keyword in: title, H1, first paragraph, last paragraph, 2-3 H2s
- Internal links: 5+ to other blog posts or PYQ pages
- External links: 1-2 to authoritative sources (NTA, official IIT pages)
- Image: 1 featured image with alt text
- Meta description: 155 chars, includes keyword
- Schema.org: Article + FAQPage markup

Use Claude or ChatGPT to write first draft, then:
- Edit ruthlessly (remove fluff)
- Add personal voice (you're a JEE/NEET aspirant who built this)
- Include specific Indian context (Allen, Aakash, Brilliant Pala references)
- Add Ask-My-Notes screenshots
- Final CTA: clear and specific

Post URL pattern:
/blog/[slug]
Example: /blog/jee-main-rotational-motion-formulas-and-tricks

VERIFICATION:
- Word count >2000
- All SEO checklist items
- Lighthouse on blog post ≥90
- Schema.org validates
- Internal links work
```

**Time estimate:** 4-5 hours/day

---

### Day 140 (Sunday) — Submit to Google + measure

```
TASK: Submit sitemap, request indexing, set up tracking
SPRINT: 6, Week 20, Day 140

Step 1: Google Search Console setup (1 hour)
- Submit sitemap.xml
- Request indexing for top 10 blog posts (manual)
- Set up email alerts for ranking changes

Step 2: Analytics (1 hour)
Set up rank tracking:
- Use Google Search Console (free)
- Track positions for all 50 keywords
- Weekly report: which keywords moved up/down

Step 3: Plan next 4 weeks (1 hour)
Content calendar for Weeks 21-24:
- 5 more posts per week = 20 more total
- Mix of: blog posts, PYQ pages, comparison pages
- Each targets specific keyword
```

---

## Week 21 — Creator Partnerships (Days 141-147)

The goal: **5 active creator partnerships driving consistent signups.**

---

### Day 141 (Monday) — Partner program launch

**Claude Code prompt:**

```
TASK: Formal creator partner program
SPRINT: 6, Week 21, Day 141

Step 1: Build affiliate dashboard (4 hours)
Files to create:
- app/partners/page.js (landing page for creators)
- app/partners/dashboard/page.js (their referral tracker)
- app/api/partners/signup/route.js
- app/api/partners/referrals/route.js (their tracking data)
- supabase/migrations/<ts>_partners_schema.sql

Schema:
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_code TEXT UNIQUE NOT NULL,  -- unique referral code
  commission_rate DECIMAL DEFAULT 0.20,  -- 20% default
  approved_at TIMESTAMPTZ,
  tier TEXT DEFAULT 'standard',  -- standard | premium | featured
  total_signups INT DEFAULT 0,
  total_paid INT DEFAULT 0,
  total_commission_owed_inr INT DEFAULT 0,
  total_commission_paid_inr INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partner_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES partners(id),
  user_id UUID REFERENCES auth.users(id),
  signed_up_at TIMESTAMPTZ DEFAULT NOW(),
  converted_to_paid_at TIMESTAMPTZ,
  commission_amount_inr INT
);

Step 2: Partner landing page (2 hours)
/partners shows:
- "Earn ₹100 per paid signup"
- 20% recurring commission (lifetime)
- How it works: 3 steps
- Apply button → /partners/apply

Step 3: Approval flow (1 hour)
- Manual approval for first 50 partners
- Review their content/audience
- Approve via admin dashboard
```

**Time estimate:** 7 hours

---

### Days 142-147 — Active outreach + management

```
Daily rhythm:
- Morning: Approve new partner applications (15 min)
- Reach out to 5 new creators per day (1 hour)
- Reply to existing partner questions (1 hour)
- Send weekly performance updates to active partners (Fri only)
- Track commissions, pay monthly
```

**Expected outcomes by end of Week 21:**
- 20+ approved partners
- 10+ active partners (driving 1+ signup/week)
- 50+ partner-driven signups
- 10+ partner-driven paid users

---

## Week 22 — Retention Push (Days 148-154)

The goal: **Move Day-7 retention from 30% → 45%.**

By now, you have enough Day-7 data to know if retention is working.

**Claude Code prompt:**

```
TASK: Retention improvement sprint
SPRINT: 6, Week 22

Step 1: Identify retention gaps (1 day)
Query: Which users churn between Day 1-7?
Common patterns:
- "Signed up but never returned" (Day 1 churn) — 40-60% common
- "Used 2-3 days then stopped" (Day 3-4 churn) — 20% common
- "Active week 1, gone week 2" (Day 7-14 churn) — 10-15% common

For each pattern, build re-engagement:

DAY 1 CHURN FIX (3 days):
- Push notification Day 1 with specific concept they uploaded
- Email Day 1: "Did you forget about ___?"
- WhatsApp message (if you have number)

DAY 3-4 CHURN FIX (2 days):
- Better Briefing on Day 3
- Highlight what they're missing
- "Your Brain Map needs feeding" notification

DAY 7-14 CHURN FIX (2 days):
- Week 1 summary email
- "You're in top 30% of users at Day 7" social proof
- Cohort message ("Other JEE 2027 users studied X this week")

Files to touch:
- lib/notifications/dispatcher.js (add Day 1, Day 3, Week 1 nudges)
- lib/emails/retentionSeries.js (email automation)
- app/api/cron/retention-nudges/route.js (daily cron)
```

**Expected outcomes:**
- Day-7 retention: 30% → 45%
- Day-30 retention: 15% → 25%

---

## Week 23 — Conversion Optimization (Days 155-161)

The goal: **Trial-to-paid from 8% → 12%.**

**Claude Code prompt:**

```
TASK: Conversion optimization
SPRINT: 6, Week 23

Step 1: A/B test pricing (3 days)
Test variants:
- Current: ₹199/₹399/₹4499
- Variant A: ₹149/₹299/₹3999 (-25%)
- Variant B: ₹249/₹499/₹4999 (+25%)
- Variant C: Limited-time launch pricing ₹99/₹199 (first 100)

Files to touch:
- app/pricing/page.js (variant rendering based on user.id hash)
- analytics events for variant tracking

Step 2: Trial flow optimization (2 days)
- Day 5 of trial: "2 days left" email with specific benefits
- Day 6: "Tomorrow your trial ends" with social proof
- Day 7: "Last day" with discount option
- Day 7 + 1: "Trial ended" with re-engagement

Step 3: Payment flow optimization (2 days)
- Reduce steps in checkout
- Add UPI as primary payment (Indian users prefer)
- Show "₹X/month" not "₹X every 30 days"
- Trust signals: "Cancel anytime", "Secure payment", testimonials
```

**Expected outcomes:**
- Trial-to-paid: 8% → 12%
- Annual plan: 30% → 45% of payments

---

## Week 24 — Sprint 6 Final & Decision Point (Days 162-168)

The goal: **Hit 100 paying users + decide what comes next.**

---

### Day 162-166 — Final push

```
TASK: Last week before measurement deadline
SPRINT: 6, Week 24

Daily tasks (Mon-Fri):
- Continue best-performing channel
- Continue content production
- Engage with paying users (build advocacy)
- Fix any remaining bugs
- Track progress toward 100 paying users

Stretch goals:
- 100 paying users (primary)
- 1000 cumulative signups
- Day-30 retention measurable for 3 cohorts
- 5 paid users from each channel (PH, Reddit, Email, Partner, Direct)
```

---

### Day 167 (Saturday) — Final metrics + retrospective

**Claude Code prompt:**

```
TASK: Sprint 6 + Months 4-6 final retrospective
SPRINT: 6, Week 24, Day 167

Step 1: Final metrics gathering (2 hours)
Compile docs/launch/MONTHS_4_6_FINAL.md:

USERS:
- Total signups: ___
- Paying users: ___ (target: 100)
- MRR: ₹___ (target: ₹20K-40K)
- Free users: ___

RETENTION:
- Day-7 retention: ___% (target: 40%)
- Day-30 retention: ___% (target: 20%)
- Day-90 retention: ___% (early data)

CONVERSION:
- Trial-to-paid: ___% (target: 12%)
- Channel performance: ___

CONTENT:
- Blog posts published: ___ (target: 25)
- PYQ pages: ___
- Google rankings: ___ keywords in top 100

PARTNERSHIPS:
- Active partners: ___ (target: 10)
- Partner-driven signups: ___
- Partner-driven paid: ___

LEARNINGS:
- What worked: ___
- What didn't: ___
- Biggest surprise: ___
- Hardest week: ___

NEXT PHASE DECISION:

Based on data, choose:

OPTION A: SCALE (if 100+ paid + good retention)
Next 6 months: 10x users to 1000 paying users
Focus: Paid acquisition, content, hiring first employee

OPTION B: FIX (if <100 paid but good signals)
Next 3 months: Focus on conversion, retention
Don't add features, fix the funnel

OPTION C: PIVOT (if metrics are weak)
Try: UPSC, GATE, or different vertical
3-month test, then decide for sure

OPTION D: SUSTAIN (if MRR covers basics)
Don't grow fast, maintain user base
Build slowly, side project mode
Focus on profitability over growth
```

---

### Day 168 (Sunday) — Final day, rest, plan next

**Take Sunday completely off after final retrospective.**

Then Week 25 (next Monday) starts the next phase.

---

## Sprint 6 done test

```
[ ] 1000+ cumulative signups
[ ] 100+ paying users
[ ] ₹20-40K MRR
[ ] Day-7 retention ≥40%
[ ] Day-30 retention ≥20%
[ ] Clear winning channel identified
[ ] 5-10 active creator partnerships
[ ] 20+ blog posts published
[ ] 5+ pages ranking in Google
[ ] Funnel improved by 50% on weakest step
[ ] Decision made for next phase
```

If all checked: 6 months from idea to validated business. Tag: `git tag months-4-6-complete && git tag v2.0-validated`.

---

## The 6-month checkpoint

By Day 168, you'll know:
- Whether the market wants what you built
- Which channel grows you
- Where revenue lives
- What to do next 6 months

This is the moment to decide:
- **Raise seed funding?** (₹50L-2Cr for 12-18 month runway)
- **Stay solo + grow slowly?** (lifestyle business, profitable, sustainable)
- **Hire first employees?** (with revenue base now, could afford 1-2 hires)
- **Pivot vertical?** (UPSC/GATE/CA if JEE/NEET didn't work)

That decision deserves time. Take 2 weeks off after Day 168. Then plan next 6 months from rest, not exhaustion.

---

*End of the 90-day build + 90-day launch sequence. From here: continue scaling, fundraising, or pivoting based on real data.*
