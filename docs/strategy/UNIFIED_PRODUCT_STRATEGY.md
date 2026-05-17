# Unified Product Strategy — Ask-My-Notes
*The operational translation of the master vision*
*For: solo founder execution — 90-day window*
*Date: May 2026*

---

## 0. How to read this

If `MASTER_VISION_AND_MOAT.md` is "why we're doing this," this document is "how the doing fits together." It's the operational philosophy that connects strategy to sprint files.

When you have a Tuesday morning question like "should I spend today on the Brain Map or on Sentry?" — this document gives you the framework to answer it.

---

## 1. The four strategic principles (apply in this order)

### Principle 1 — Foundation before feature, always
A product that loses user data, can't reproduce its schema, or has no error visibility cannot grow. Phase 0 work (security fixes, migrations, Sentry, CI, empty state, PDF processing feedback) must complete before any new feature work compounds.

**Operational rule:** If you are choosing between "fix a security vulnerability" and "build a new feature," fix the vulnerability. No exceptions. Every day a critical-1 issue is open is reputational risk that takes 6 months to recover from.

### Principle 2 — Surface what's hidden before building what's new
The product already has 8+ features that are *built but invisible*: concept graph (only at `/dev/graph`), peer percentile (computed, not displayed), semantic clusters (computed, no UI), domain-aware AI prompts (working, not branded). Surfacing these requires hours, not weeks.

**Operational rule:** Before adding a new feature, ask "is there a feature already built that I haven't surfaced?" If yes, surface it first. The ROI ratio is 10×.

### Principle 3 — Retention compounds, features fade
Every retention mechanism that survives Day 30 compounds for years. Every shiny feature that doesn't change retention is wasted engineering. **Day-30 retention is the only metric that matters for the next 6 months.**

**Operational rule:** Before shipping any feature, define how it moves Day-30 retention. If the answer is unclear or speculative, deprioritize it. Build features that retention math forces, not features that competitive comparison demands.

### Principle 4 — Distribution is product
A great product with no distribution is a hobby. Distribution must be designed *into* the product, not bolted on later. Every shareable moment, every Reel-able experience, every "tell a friend" trigger is part of the product, not marketing.

**Operational rule:** Every feature must answer one of: "Does this make someone want to share?" / "Does this make someone want to return?" / "Does this make someone want to pay?" If none — defer.

---

## 2. The strategic framework in one diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    THE OUTCOME (24 months)                       │
│   Category-leading AI cognitive layer for JEE/NEET aspirants    │
│           250K+ paying users, ₹40-100 crore ARR                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   THE 3 PILLARS       THE 6 MOATS       THE 2 PERSONAS
        │                  │                  │
   ┌────┴────┐       ┌─────┴─────┐      ┌────┴────┐
   │ Memory  │       │ Memory    │      │ Priya   │
   │ Specif  │       │ Cohort    │      │ Arjun   │
   │ Care    │       │ PYQ       │      └────┬────┘
   └────┬────┘       │ Care      │           │
        │            │ Cultural  │           │
        │            │ Founder   │           │
        │            └─────┬─────┘           │
        │                  │                 │
        └──────────────────┼─────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   90-DAY TRACKS      RETENTION ENGINE   DISTRIBUTION
        │                  │                  │
   1. Retention       Daily loop          Content+SEO
   2. PYQ+Content     Weekly loop         Creators
   3. Differentiate   Cycle loop          Cohort viral
        │             Notifications       Referral
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                  ┌────────┴────────┐
                  │   THE PRODUCT   │
                  │   YOU SHIP      │
                  │   IN 90 DAYS    │
                  └─────────────────┘
```

Every line in this diagram has a corresponding section in the execution documents.

---

## 3. The strategic posture by track

### Track 1 — Retention engine
**Posture:** Surface first, build second.

The retention engine consists of:
1. Things already built but hidden: Brain Map, peer percentile, mastery scores, weekly recap, focus mode polish.
2. Things partially built: streak system (needs Freeze + recovery), notification system (needs scheduling + content), cohort presence (needs UI + WhatsApp bridge).
3. Things to build new: Morning Audio Briefing pipeline, decompression detection, cycle loop scheduler.

The 80/20 split: **80% of retention impact in the next 90 days comes from surfacing the first category.** The other 20% comes from building the third category. Allocate engineering hours accordingly.

### Track 2 — PYQ + content engine
**Posture:** Content moat > feature moat in the long run.

PYQs are a content business, not an engineering business. The product wraps the PYQ corpus; the corpus itself is the asset. This means:
1. **Acquire/curate first, optimize later.** Get 500 PYQs indexed badly before you have 50 indexed beautifully.
2. **Each PYQ is a SEO page.** Schema-first thinking: every PYQ gets a public URL with rich metadata, solution, similar questions. Compound SEO play.
3. **AI-searchable from day 1.** "Show me JEE Advanced rotational dynamics problems from 2015-2024" is a query the system should handle through vector search over the PYQ corpus.

Solo founder constraint: this track requires content acquisition labor that engineering can't substitute. **Sprint 3 dedicates explicit hours to manual PYQ curation. It's not glamorous; it's the moat.**

### Track 3 — Differentiation features
**Posture:** Two of three is enough. Pick the highest-ROI two for Sprint 2-3.

Candidates: Photo Doubt Cam, Voice Tutor Call (Socratic), Smart Mock Test Simulator.

Recommended priority (will be reconsidered in Sprint 2 planning):
1. **Photo Doubt Cam** — highest demand, leverages existing RAG, GPT-4o Vision supports it.
2. **Smart Mock Test Simulator** — highest retention impact, builds on PYQ corpus.
3. **Voice Tutor Call upgrade** — best differentiator but largest build, most expensive operational cost (OpenAI Whisper + TTS).

The "two of three" rule prevents over-commitment. Ship two excellently; defer the third to month 4.

### Underlying tracks (always-on)
- **Phase 0 stabilization** — first 2 weeks of Sprint 1, must complete.
- **Pricing rebuild** — Sprint 2, includes 7-day Pro trial.
- **Vertical narrowing in copy + landing + onboarding** — Sprint 1.

---

## 4. The build philosophy (when in doubt)

### Ship small, ship soon, ship often
Solo founder velocity comes from shipping in vertical slices. A 50%-complete Brain Map shipped to 100% of users beats a 95%-complete Brain Map kept in dev.

**Concrete heuristic:** If a feature is 1 week away from "good enough to give to 10 users for feedback," ship it. The 10 users' feedback is worth more than another week of polish.

### Lean on existing architecture
The technical audit revealed a sophisticated foundation:
- Realtime CDC subscriptions on 7 tables
- pgvector embeddings already wired
- Concept graph with concepts + concept_edges tables
- Domain-aware classifier
- Voice tutor 5-phase pipeline
- Razorpay integration

**Heuristic:** Before architecting a new system, ask "what existing system already does 70% of this?" Almost always, the answer is yes.

### Avoid the engineer's trap
The engineering audit also revealed: 1467-line DashboardContext, no middleware, custom streaming protocol without versioning, no TypeScript. These are real debts but **fixing them is not the 90-day priority.** Refactoring without users is a vanity exercise.

**Heuristic:** Allow yourself one "code quality" task per sprint. Spend the rest on user-visible value. The refactor lives in Sprint 4+.

### Cost-aware AI from Day 1
Every OpenAI call costs money. At 10K WAU averaging 5 Q&A/day, the AI bill alone is $1500-3000/month. **Track per-user AI cost in the product analytics.** Cache aggressively (you already do — keep doing). Use gpt-4o-mini for everything except specific cases requiring gpt-4o.

**Heuristic:** If a feature requires gpt-4o, default it to Pro tier. Free + Student tier defaults to gpt-4o-mini. This is monetization through cost-discipline, not artificial restriction.

---

## 5. The decisions that have been made (so you don't re-litigate)

These are locked. Don't re-debate them mid-sprint unless evidence overwhelmingly demands it.

| Decision | Status | Where to find rationale |
|---|---|---|
| Vertical focus: JEE + NEET only for 90 days | LOCKED | Master Vision Section 4 |
| University features: deferred to month 4+ | LOCKED | Master Vision Section 7 |
| Mobile app: web-first, PWA polish only | LOCKED | Founder Q4 answer |
| Pricing rebuild: in scope for 90 days | LOCKED | Founder Q3 answer |
| New pricing: ₹199/₹399/Family/B2B | LOCKED | Retention & Growth Section 6 |
| 7-day Pro trial on every signup | LOCKED | Retention & Growth Section 6 |
| Free tier limits: 3 PDFs, 50 Q&A/day | LOCKED | Gap Analysis Section 5.1 |
| Free tier: Brain Map gated to Student tier | TENTATIVE | Will decide in Sprint 2 based on conversion data |
| Voice tutor: Pro tier only | TENTATIVE | Operational cost suggests yes, will decide Sprint 2 |
| Anki import: in scope | LOCKED | Reduces switching cost from serious-aspirant pool |
| FSRS scheduler: replaces SM-2 in Sprint 3 | LOCKED | Required to compete with Anki |
| Hindi/Hinglish voice tutor: out of scope for 90 days | LOCKED | Time + cost constraint |
| WhatsApp cohort groups: out of scope for 90 days, in scope for sprint 4 | LOCKED | Time + bot infrastructure |
| Coaching institute B2B: pilot outreach only in 90 days | LOCKED | Sales motion, not engineering, dominates |

If you find yourself re-debating a locked decision, the question to ask is "do I have new evidence, or just doubt?" If it's just doubt, return to the locked decision.

---

## 6. The decisions deferred to inside-the-sprint judgment

These will be decided mid-sprint with data. Don't pre-decide.

- Exact Brain Map UX (full-screen modal vs. dashboard widget vs. dedicated page)
- Audio Briefing voice (chosen at sprint 2 testing)
- Cohort segmentation granularity (will start coarse, refine)
- Decompression nudge frequency (start conservative, A/B)
- Pro trial duration (7 days locked, can extend to 14 if conversion < 15%)
- Whether to include UPSC/CA support flag in onboarding (will see if 5%+ users select "Other")

---

## 7. The cross-references (what depends on what)

Reading order for someone joining the project:

1. **Master Vision and Moat** (`MASTER_VISION_AND_MOAT.md`) — what we believe
2. **This document** (`UNIFIED_PRODUCT_STRATEGY.md`) — how the beliefs connect
3. **Student Psychology Execution** (`STUDENT_PSYCHOLOGY_EXECUTION.md`) — who we serve
4. **Elite Feature Architecture** (`ELITE_FEATURE_ARCHITECTURE.md`) — what we build
5. **Retention Engine Blueprint** (`RETENTION_ENGINE_BLUEPRINT.md`) — how we hold them
6. **UI/UX System** (`UI_UX_SYSTEM.md`) — how it feels
7. **Mobile and Gamification** (`MOBILE_AND_GAMIFICATION.md`) — phone + identity
8. **AI Systems Architecture** (`AI_SYSTEMS_ARCHITECTURE.md`) — AI pipelines
9. **Technical Architecture** (`TECHNICAL_ARCHITECTURE.md`) — engineering deep
10. **Claude Code Execution Master** (`CLAUDE_CODE_EXECUTION_MASTER.md`) — sprint router
11. **Sprint 01-03 Implementation** — actual paste-into-Claude-Code tickets
12. **MVP Critical Tasks and High-Leverage Features** — the priority filter

---

## 8. The week-by-week strategic checkpoints

End of week 1: **Foundation locked.**
- All security fixes in production.
- Sentry capturing errors.
- CI green on every merge.
- All 13 missing migrations created and committed.
- Empty state shipped.

End of week 2: **Visibility unlocked.**
- Brain Map in production, accessible from dashboard.
- Peer percentile visible.
- PDF processing feedback live.
- Onboarding rewritten for JEE+NEET focus.

End of week 4 (Sprint 1 done): **Retention foundation ready.**
- Push notification infrastructure deployed.
- Daily/weekly/cycle loop schedulers in place.
- Cohort assignment on signup.
- New pricing tiers live with 7-day Pro trial.

End of week 6: **Audio Briefing alive.**
- Audio generation pipeline running nightly.
- 100+ Briefings successfully delivered to test users.
- Adoption: 40%+ of daily actives listen at least once.

End of week 8 (Sprint 2 done): **First differentiator live.**
- Photo Doubt Cam shipped (most likely candidate).
- Anonymous cohort leaderboard shipped.
- Decompression detection running in shadow mode.

End of week 10: **PYQ engine seeded.**
- 500+ PYQs tagged and indexed.
- First 10 PYQ SEO pages live.
- AI Q&A can answer "show me JEE Advanced mechanics PYQs 2018-2020."

End of week 12 (Sprint 3 done): **Ship for users.**
- FSRS scheduler in production.
- Smart Mock Simulator OR Voice Tutor Call upgraded (whichever was chosen).
- All 20+ SEO articles live.
- First 3 creator partnerships running.
- Decompression mode user-facing.

If any checkpoint slips by more than a week, return to this document and recalibrate. Don't slip silently.

---

## 9. The strategic posture toward competitors

How to think about each major competitor when their moves intersect with your roadmap.

### NotebookLM (Google)
**Posture:** Operate on adjacent terrain. Never compete head-on.

If NotebookLM ships an Indian-language Audio Overview, accelerate Hinglish briefings. If they ship cross-notebook memory, double down on cohort + identity (which they cannot replicate). If they ship exam-specific features, treat as validation — they're chasing your niche.

**Defensive trigger:** If NotebookLM acquires or partners with Allen / Aakash / Physics Wallah — major strategic threat, plan response within 30 days.

### Physics Wallah
**Posture:** Partner if possible. Compete only on AI workflow layer.

PW owns video and brand. Ask-My-Notes owns AI cognitive layer. There's no necessary collision. Lecture capture feature (deferred from 90-day plan) explicitly wraps PW content, not competes with it.

**Strategic opportunity:** If PW Alakh AI is launched at higher prices than ₹999/yr, Ask-My-Notes' ₹199/₹399 tier becomes a clear value proposition for PW-fatigued students.

### Doubtnut (Allen-owned)
**Posture:** Coexist on photo doubt-solving. Win on integration.

Doubtnut answers any photo question with general AI. Ask-My-Notes answers photo questions with *your context*. Different value propositions. Photo Doubt Cam is meant to compete on integration depth, not on doubt-solving volume.

### Knowt
**Posture:** Steal the free-tier playbook. Ignore the rest.

Knowt won AP exams. Ask-My-Notes wants to win JEE/NEET. Different geographies, different exams, no direct collision. But Knowt's free-tier strategy is the textbook to follow. Their AP Hub is the template for our PYQ + cohort approach.

### StudyFetch, Mindgrasp, TurboLearn, Quizlet
**Posture:** Ignore directly. Watch for tactical lessons (don't repeat their mistakes).

Hostile free tiers (StudyFetch), dark-pattern subscriptions (Mindgrasp), viral-without-retention (TurboLearn), monetize-the-category-defining-feature (Quizlet). Four case studies in what not to do.

### Anki
**Posture:** Become the bridge, not the replacement.

Anki users are the highest-value possible converts to Ask-My-Notes. The play: Anki deck import + FSRS scheduler + AI-generated cards + concept graph. Don't replace Anki — offer "Anki for the AI age." Sprint 3 includes Anki import as a feature.

### ChatGPT / Claude / Gemini
**Posture:** Be the workflow that wraps them.

Students will keep using general AI for one-off questions. Ask-My-Notes is the *integrated* workflow — PDF library, daily ritual, cohort, mastery memory — that general AI can't provide. Position explicitly: "ChatGPT for your questions, Ask-My-Notes for your prep."

---

## 10. The non-negotiable rules of engagement

Five rules that survive every replan, every market shift, every competitor move:

**Rule 1 — Never punish a student.**
No streak guilt. No "you're behind" copy. No surprise charges. No hidden cancellation. Every interaction respects the student's emotional state.

**Rule 2 — Never lock the category-defining feature.**
Q&A over PDFs is what makes the product valuable. It will never sit behind a paywall higher than the lightest tier. Charge for advanced features, never for the core.

**Rule 3 — Never optimize for engagement over outcome.**
If a feature increases sessions per day but doesn't improve exam performance, it's a vanity feature. Cut it.

**Rule 4 — Never sell student data.**
Even at scale, even with anonymization, even if the price is high. The trust is the moat. Selling data once destroys the moat permanently.

**Rule 5 — Never lie to yourself about the metrics.**
Vanity metrics (signups, PDF uploads, AI calls) feel good. Truth metrics (Day-30 retention, paying conversion, post-exam continuation) are what build companies. Read the truth metrics weekly. Read vanity metrics never.

---

## 11. The personal note to the founder

You will hit a wall around week 6-8. This is normal — the honeymoon of starting wears off, the work compounds, and visible progress stalls just before the retention compounding kicks in.

When you hit it:
- Return to this document.
- Re-read the Priya/Arjun personas.
- Spend an hour on Reddit r/JEENEETards just listening.
- Talk to one paying user.
- Then go back and ship one small thing.

The wall passes. The compounding starts. The product becomes real.

This document exists because future-you will need it more than present-you.

---

*Next: `STUDENT_PSYCHOLOGY_EXECUTION.md` for the concrete UX language patterns by emotional state. Then `ELITE_FEATURE_ARCHITECTURE.md` for what to build.*
