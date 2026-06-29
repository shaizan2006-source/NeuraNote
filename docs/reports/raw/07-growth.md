# Phase 7 — Growth Opportunities

*Generated 2026-05-27. Synthesizes `marketing_roadmap.md`, `marketing_strategy_debate.md`, `LAUNCH_COPY_AND_ASSETS.md`, and the activation/trial infrastructure visible in code.*

---

## 7.1 The growth equation (where leverage lives)

Sustainable growth = `(Acquisition) × (Activation) × (Retention) × (Conversion) × (Expansion)` — each amplifies the next. Today, the **biggest gap is acquisition channel proof**; the **biggest leverage is activation** (the empty-state-to-first-magical-moment gap).

---

## 7.2 Acquisition channels — ranked by viability for current stage

| # | Channel | Stage fit | Est. CAC | Est. ramp | Notes |
|---|---------|-----------|----------|-----------|-------|
| 1 | **Campus ambassador program (tier-1 colleges)** | ✓ ideal | ₹50-₹200 | 4-8 weeks | Already in roadmap; needs 10-20 ambassadors at IIT/BITS/IIIT for hyper-local capture |
| 2 | **WhatsApp group infiltration** (admin discount play) | ✓ ideal | ₹0-₹50 | 6-10 weeks | "Pin a 20% off message in your class group" — viral, near-zero CAC |
| 3 | **Short-form video (Reels/Shorts/TikTok)** | ✓ if execution good | ₹100-₹300 | 8-12 weeks | Voice tutor demo is the killer hook per `marketing_strategy_debate.md` |
| 4 | **Reddit / Discord communities** | ✓ for tier-1 | ₹0-₹100 | 8-12 weeks | r/JEE, r/NEET, study Discord servers — community-respect strategy |
| 5 | **Tier-2/3 college Telegram bots** | ✓ specific | ₹50-₹200 | 4-6 weeks per city | High-density, low-noise; admins are bribable |
| 6 | **Brain Map share virality** (built-in mechanism) | ⚠️ requires execution | ₹0 | 12+ weeks | `/brain-map/share` exists; needs OG image generation tested at scale |
| 7 | **SEO long-tail (PYQ pages, study guides)** | ⚠️ slow | ₹0 marginal | 12-24 weeks | PYQ marketplace gives structured content for indexing |
| 8 | **Parent referral program** (in code) | ✓ unique | ₹100-₹300 | 4-8 weeks | Family plan + parent-pays motion; unusual for category |
| 9 | **Influencer / micro-influencer partnerships** | ⚠️ test budget | ₹500-₹2000 | 4-6 weeks | Risky CAC at this stage |
| 10 | **Paid Meta/Google ads** | ✗ no | ₹500-₹3000 | n/a | Don't compete with PW/Vedantu spend |
| 11 | **YouTube content marketing** | ⚠️ requires founder time | ₹0 marginal | 12-24 weeks | Long ramp, valuable if sustained |
| 12 | **Press / YourStory / Inc42 features** | ✓ once metrics ready | ₹0 | 1 week | Wait until ₹5L MRR for credibility |

### Top 3 channels to commit to (next 90 days)
1. **Campus ambassador program** — 10 IIT/BITS/IIIT ambassadors, 1 month free Pro, generate testimonials + content
2. **WhatsApp group seeding via admins** — 50 university WhatsApp group admins each get free lifetime Pro for pinning a referral message
3. **Reels/Shorts demo content** — Voice tutor walking-to-class demo, repeated 3x/week from a single creator

---

## 7.3 Activation (current funnel + biggest lever)

### Current funnel (assumed shape, needs Phase 9 instrumentation to confirm)
```
Visitor (organic + ads) ─ 100%
  ↓
  Lands on /
  ↓
  Click "Get Started" ─ ~30%
  ↓
  /signup → email or Google ─ ~50% (15% of visitors)
  ↓
  /onboarding (4 steps: exam type → date → PDF → demo Q)
  ↓
  /dashboard
  ↓
  Empty state for new user (BROKEN per audit UX-1) ─ silent activation failure
  ↓
  First Q&A ever ─ probably <50% of new users  (the magical moment)
```

### The single biggest activation lever
**Fix the empty state.** A new user who completes onboarding and sees a blank dashboard is the audit's UX-1 finding. With 30 new features shipped since the audit, the empty state has gotten *worse* (more dashboard cards with zero state). 

Specific actions:
1. **Default "starter PDF"** offered during onboarding ("Try a sample JEE Physics chapter") — eliminates the upload-required friction for first AI interaction.
2. **Inline first-question prompt** on the dashboard: "Ask anything — try 'Explain Newton's third law' or upload your own PDF."
3. **Sample Brain Map mockup** on the dashboard before they have a real one (per `marketing_roadmap.md` "Aha Empty State" recommendation).
4. **Onboarding completion → "Upload PDF" screen directly** (not the empty dashboard).

### Activation targets
| Step | Today (est.) | Target (next 90 days) |
|------|--------------|------------------------|
| Visitor → signup | 15% | 22% (better landing copy + demo video) |
| Signup → onboarding complete | 60% | 75% (shorter wizard, save state) |
| Onboarding complete → first Q&A within 5 min | 35% | 65% (empty-state fix) |
| First Q&A → 3+ Q&A in session | 50% | 65% (follow-up suggestions already exist) |
| Day 1 retention (login next day) | 25% | 45% (push notification at trial-D1) |

---

## 7.4 Retention — habit formation infrastructure

### What's already in place (strong)
- Daily streaks + streak freezes (sticky)
- Daily Briefing audio (proactive engagement)
- FSRS due-card reminders (cron-driven push at 12:30 PM IST)
- Trial D3/D5 segmentation + warmup
- Web push notifications + WhatsApp webhooks (received)
- Cohort + leaderboard (peer pressure)
- Realtime updates (active sessions feel alive)

### What's missing
- **Email digest** — low priority for Indian audience but high signal for international
- **Inactive user re-engagement after 7+ days** — `/welcome-back` page exists but the trigger flow needs verification
- **Exam-week emergency push** — automatic detection of "exam in 3 days" should escalate engagement
- **Streak-protection insurance** (microtransaction, Phase 6 #20) — gamifies non-cancellation

### The single biggest retention lever
**Tie the Daily Briefing to a fixed time of day** (e.g., 6 AM IST). The mechanism is similar to Wordle: users open the app at a specific time because something fresh is waiting. Currently briefings are generated at 2 AM IST (cron `generate-briefings`), so by 6 AM they exist — but is the user *told* to come at 6 AM? Verify the push timing.

### Retention targets
| Metric | Today (est.) | Target (next 90 days) |
|--------|--------------|-----------------------|
| Day 7 retention | 30% | 50% |
| Day 30 retention | 15% | 30% |
| Day 90 retention | 8% | 18% |
| Weekly active per active month | 3 days | 5 days |
| Briefing listen rate (of generated) | <40% | 65% |

---

## 7.5 Conversion (trial → paid)

### What's already in place
- 7-day Pro trial auto-activated
- `decompression/detector.js` (cognitive-load aware trial UX)
- `cron/trial-d3-segment` + `trial-d5-warmup`
- `/trial/{decision,lapsed,success}` pages
- Razorpay UPI integration (lowest friction in India)
- `payment_orders` idempotency

### What's missing or weak
- **Trial activation flow** — does signup → trial-start happen automatically, or is there a click needed? Verify.
- **Day-7 trial-end-of-period push** — must hit user 24-48h before trial ends with clear conversion ask. Verify cron timing.
- **Urgency framing in checkout** ("Your trial ends in 18 hours. Continue with 33% off the annual plan?") — `marketing_roadmap.md` recommends this.
- **Family plan as conversion option** — currently a separate flow; offer it at trial-end as "Cover yourself + 3 study partners for ₹4,499/year" (₹94/mo per student).
- **Parent-as-buyer flow** — if onboarding captures whether the student is minor, route the payment ask to a parent via WhatsApp.

### The single biggest conversion lever
**Annual-first defaults** at trial-end. India's recurring credit card mandates fail ~80% per `market_research_report.md`. UPI mandates work but are weak for monthly debit. Annual upfront (₹2,999) is the most stable revenue path. Show annual as the primary CTA, monthly as secondary.

### Conversion targets
| Metric | Today (est.) | Target |
|--------|--------------|--------|
| Trial activation rate | 80% (assumed) | 95% (auto-activate; verify) |
| Trial → Paid (any tier) | 5% | 12% |
| % of conversions choosing Annual | 20% | 45% |
| % of conversions choosing Family | 0% | 8% |

---

## 7.6 Expansion (upsell / cross-sell to existing users)

Often the most-leveraged growth — increase ARPU on existing customers.

### Specific moves
| Move | Audience | Mechanism | Est. ARPU lift |
|------|----------|-----------|----------------|
| Student → Pro upsell | Student users hitting PDF limit | "Upload your 11th PDF for ₹200 more/mo" | +25% on upsellers |
| Monthly → Annual upgrade | Pro monthly users >3 months in | "Lock in your current rate" | +30% LTV |
| Family conversion | Pro users with siblings/study partners | "₹2,500 more covers 4 students" | Expansion revenue |
| PYQ pack add-ons | Pre-exam users | One-time purchase | ₹49-₹199 each |
| Premium voice tutor (longer calls) | Power voice users | Sub-tier upgrade | +₹200/mo on top 10% |
| Streak protection | 30+ day streak users | Microtransaction | ₹49 occasionally |
| Mock test full simulator pack | Pre-exam Pro users | One-time purchase | ₹99-₹299 |

### The single biggest expansion lever
**Monthly → Annual upgrade prompts at month 3, 6, 9 of a monthly subscription.** Users who pay monthly for 3+ months have demonstrated retention; offering them annual at a discount captures stable revenue and reduces churn risk for the next 12 months. This is one of the cheapest LTV-extension moves available.

---

## 7.7 Referrals & virality

### What's already in place
- Parent referral API (`/api/parent-referral`)
- Family plan (4 users for ₹4,499/year — explicit viral container)
- Brain Map share page (`/brain-map/share`)
- Cohort + leaderboard (social context)
- UTM tracking + visit attribution (`utmCapture.js`)

### Virality coefficient (k = invites × conversion rate per invitee)
For k > 1, the product grows without paid acquisition. Realistic targets:
- Cred-style "Refer a friend, both get ₹100" → k = 0.2-0.4 typical
- Spotify Family-style cost-split → k = 0.6-0.9 (because the referee pays $0)
- Brain Map share virality (shareable content) → k = 0.1-0.3
- WhatsApp group seeding via admin → k = 0.3-0.5

### The single biggest viral lever
**Frame the Family Plan as "buy once, give 3 friends Pro access"** rather than "₹4,499/yr family discount." Same SKU, completely different psychology. Marketed correctly, the same student pays ₹4,499 because three friends get free Pro — and now four students are locked into the platform with combined switching cost.

---

## 7.8 The activation/retention/conversion priority stack (next 90 days)

If forced to pick **one** intervention per category for the next 90 days:

1. **Activation:** Fix the empty state with a starter PDF + first-question prompt + Brain Map mockup. **Effort: 1 week. Expected impact: +30% activation.**
2. **Retention:** Standardize Daily Briefing push at 6 AM IST. **Effort: 2 days. Expected impact: +15% Day-7 retention.**
3. **Conversion:** Annual-first defaults at trial-end + UPI mandate UPI auto-debit setup. **Effort: 1 week. Expected impact: +50% on conversion rate (today's monthly users would have churned anyway).**
4. **Expansion:** Monthly → Annual prompt at month 3 + 6. **Effort: 3 days. Expected impact: +25% LTV.**
5. **Acquisition:** WhatsApp admin program — 50 admins × free Pro = 50 viral pinned posts. **Effort: 2-3 weeks (outreach). Expected impact: 500-2,000 net new signups in cycle.**

If executed all five within the 90 days, the funnel compounds: 30% × 15% × 50% × 25% improvements in different stages. A user who would have churned at activation now converts, retains, expands, and refers.
