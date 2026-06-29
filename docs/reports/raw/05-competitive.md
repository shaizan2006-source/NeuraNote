# Phase 5 — Competitive Analysis

*Generated 2026-05-27. Synthesized from `market_research_report.md` + public knowledge of the Indian EdTech / global student-productivity landscape. Pricing and user counts are public-domain estimates that should be re-validated quarterly.*

> **Caveat:** competitor pricing and user-base figures move quickly. Treat all numbers in this section as ranges with ±20% uncertainty. The structure and ranking are more durable than the absolute values.

---

## 5.1 Competitors evaluated (10)

| # | Competitor | Country | Primary value prop | Estimated users | Estimated ARR |
|---|-----------|---------|--------------------|-----------------|---------------|
| 1 | **NotebookLM** (Google) | Global | "AI research assistant grounded in your sources" | ~10M+ users (Sept-2024 launch growth) | Free (loss-leader for Gemini/Workspace) |
| 2 | **Physics Wallah (PW)** | India | "Most affordable JEE/NEET coaching" — live classes + content + AI | 27M+ app users, ~1.5M paying | $200M+ ARR |
| 3 | **Doubtnut** | India | "Photo your doubt, get the answer" — content + video solutions | 30M+ MAU | Acquired by Allen 2024; ~$30M ARR |
| 4 | **Vedantu** | India | Live tutoring + recorded content | 35M+ users | ~$50M ARR (down from peak) |
| 5 | **Aakash iTutor** | India | Coaching giant's digital arm | 5M+ users | Bundled in Aakash subscriptions |
| 6 | **Brilliant** | Global | Interactive learning paths (math/CS/data) | 10M+ users | ~$80M ARR (~$15/mo) |
| 7 | **Knowt** | US-focused | AI flashcards + study aids | 5M+ users | ~$20M ARR (freemium, $9/mo Pro) |
| 8 | **Anki** | Global | Manual SRS, open-source desktop | 5M+ active | Free / one-time iOS app |
| 9 | **Unacademy** | India | Live classes + content marketplace | 60M+ users (mostly free) | ~$80M ARR |
| 10 | **Allen Digital** | India | Coaching giant's app + AI features | ~5M+ | Bundled in Allen offline subs |

---

## 5.2 Feature comparison matrix

Legend: ✓ has it · ✗ lacks · ◐ partial · ? unclear

| Capability | **Ask-My-Notes** | NotebookLM | PW | Doubtnut | Vedantu | Aakash | Brilliant | Knowt | Anki | Unacademy |
|------------|:----------------:|:----------:|:--:|:--------:|:-------:|:------:|:---------:|:-----:|:----:|:---------:|
| Upload your own PDFs | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ◐ | ✓ | ✗ |
| Q&A with citations | ✓ | ✓ | ◐ | ◐ | ◐ | ◐ | ✗ | ◐ | ✗ | ◐ |
| Domain-specific prompts (11 domains) | ✓ | ✗ | ◐ | ◐ | ◐ | ◐ | ◐ | ✗ | ✗ | ✗ |
| **Brain Map / concept graph** | ✓ | ◐ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Daily Briefing (audio)** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Photo Doubt Cam** | ✓ | ✗ | ✓ | ✓✓ (their core) | ◐ | ✓ | ✗ | ✗ | ✗ | ◐ |
| AI quiz generation from your PDFs | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ◐ | ✗ |
| Mock test simulator | ✓ | ✗ | ✓ | ◐ | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ |
| PYQ marketplace | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✗ | ◐ | ✗ | ✓ |
| Spaced repetition (FSRS / SM-2) | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓✓ (their core) | ✗ |
| Streak system + freezes | ✓ | ✗ | ◐ | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ |
| Voice AI tutor (Whisper + TTS) | ✓ | ✗ | ✗ | ✗ | ◐ (human) | ✗ | ✗ | ✗ | ✗ | ✗ |
| Focus mode (Pomodoro + AI tasks) | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Live tutoring (human) | ✗ | ✗ | ✓ | ✓ | ✓✓ (their core) | ✓ | ✗ | ✗ | ✗ | ✓ |
| Live classes / lectures | ✗ | ✗ | ✓✓ (their core) | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✓✓ (their core) |
| Curated content library | ◐ (their PDFs) | ✗ | ✓✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ✗ | ✓ |
| Cohort / leaderboard | ✓ | ✗ | ◐ | ✗ | ✗ | ✗ | ◐ | ✗ | ✗ | ◐ |
| Family / group plans | ✓ | ✗ | ✓ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ |
| Multi-language (Hindi/regional) | ◐ | ◐ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ |
| WhatsApp re-engagement | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ |
| Web push notifications | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| Realtime live progress | ✓ | ✗ | ◐ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Citations from user's own notes | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Trial conversion experience | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |

---

## 5.3 Where Ask-My-Notes wins (5+ areas)

1. **"Bring your own PDFs" + RAG-grounded answers.** NotebookLM is the only direct competitor here. PW, Doubtnut, Vedantu, Aakash, Unacademy are all *content-out* (push their content to you). Ask-My-Notes is *content-in* (works with the user's own notes). For self-studiers and tier-2/3 students using a mix of their college's notes and their own books, this is genuinely unique in the Indian market. **Defensibility: Medium-high.** NotebookLM doesn't have curriculum/exam awareness; the Indian incumbents don't have RAG over user docs.
2. **The Brain Map (concept graph extracted from user's PDFs).** Nothing in the comparison set does this. It's the most concrete "user data graph" moat in the product (`market_research_report.md` correctly identifies this as *the* defensibility wedge). **Defensibility: High.** Difficult to copy without committing to concept-extraction infrastructure for every uploaded doc.
3. **Daily audio briefings + voice tutor as habit-forming engagement loops.** Most competitors notify users but don't *talk to them*. Voice is a clear differentiator for tier-2/3 India where reading complex English PDFs is hard. **Defensibility: Medium.** Easy to copy *the idea*; expensive to operate at scale (TTS + Whisper costs).
4. **FSRS-backed spaced repetition tied directly to user's uploaded content.** Anki has SRS but no integration with study materials. Knowt has AI flashcards but no FSRS. Ask-My-Notes is alone in tying SRS scheduling to *the user's actual syllabus*. **Defensibility: Medium.**
5. **Realtime live progress dashboard with debounced aggregation.** Nobody else in this category broadcasts study events to a live UI. It's the kind of polish detail that makes the product *feel* premium during demos and onboarding. **Defensibility: Low** (anyone can build this) **but high signaling value** to investors.
6. **Trial conversion experience based on cognitive load detection (`/api/decompression`).** Most freemium-to-paid funnels are time-based ("free for 7 days"). This one watches for cognitive-load patterns and adjusts the trial UX accordingly. Unusual sophistication. **Defensibility: Medium.**
7. **Cohort + anonymous leaderboard with auto-assigned handles.** Brilliant has weak social; PW/Unacademy have it but not anonymous. Indian students often hide grades from family — anonymity removes a social friction point. **Defensibility: Low.**
8. **Focus mode with parallax ambient background + AI-generated task breakdowns.** No competitor has this. It's the kind of feature that gets shared on Reddit and Twitter. **Defensibility: Low.**

---

## 5.4 Where Ask-My-Notes loses (5+ areas)

1. **No live human tutoring.** PW, Vedantu, Aakash, Unacademy all have 1-on-1 (or small-group) human teachers. For parents paying for tier-1 prep, a human is still preferred over AI for major doubts.
   *Gap to close:* Hybrid AI + human escalation. Not "build a tutoring marketplace" — instead, partner with existing tutors and route hard doubts to them as a paid upgrade. **Priority: medium** (don't compete with PW directly; just don't lose them on this dimension).
2. **No curated content library / structured course paths.** A student paying ₹399/mo to Ask-My-Notes brings *their own* content; a student paying ₹999/mo to PW gets PW's expert-curated JEE content. The "I have to upload PDFs first" friction is real.
   *Gap to close:* Offer a starter library (CC-licensed NCERT, expired-copyright textbooks) so a free user can demo the product before uploading anything. **Priority: high** for activation.
3. **No mass-market brand recognition.** PW alone is worth a billion+. Ask-My-Notes is a no-name app.
   *Gap to close:* Influencer + campus-ambassador strategy from `marketing_strategy_debate.md`. **Priority: high** but in the marketing/growth column.
4. **Limited regional language coverage.** Voice supports EN/HI/FR; tier-2/3 India needs Tamil, Telugu, Bengali, Marathi. PW supports many of these.
   *Gap to close:* Multilingual TTS via ElevenLabs (best regional voices) + Whisper supports many languages natively. **Priority: medium** until India tier-2/3 becomes the focus.
5. **No mobile-native app.** Web-only. The vast majority of Indian students are mobile-first; opening a browser is friction. App-store presence is also a credibility signal.
   *Gap to close:* PWA-first (already implemented?), then a thin native wrapper (Capacitor/Tauri) for app stores. **Priority: medium-high** for activation in India.
6. **No human community/forum.** PW has discussion boards; Doubtnut had Q&A communities. Students learn from each other.
   *Gap to close:* The Cohort feature is a start; could grow to peer-to-peer Q&A. **Priority: low** for v1.
7. **No social proof on the landing page.** Audit noted no testimonials, no demo video. PW/Vedantu hammer testimonials.
   *Gap to close:* `LAUNCH_COPY_AND_ASSETS.md` apparently has this content; needs landing-page integration. **Priority: medium**.
8. **No offline coaching presence.** PW, Aakash, Allen all bundle digital with physical centers. For parents who only trust offline brands, online-only is a barrier.
   *Gap to close:* Not Ask-My-Notes's fight to pick. **Priority: do not engage.**

---

## 5.5 Pricing comparison (per month, INR equivalents)

| Plan | Ask-My-Notes | NotebookLM | PW | Doubtnut | Vedantu | Aakash | Brilliant | Knowt | Anki | Unacademy |
|------|--------------|------------|----|----------|---------|--------|-----------|-------|------|-----------|
| Free tier | ✓ (1 PDF, 20 Q/day) | ✓ (full) | ✓ (limited) | ✓ (limited) | ✓ (limited) | ✓ | ✓ (limited) | ✓ (limited) | ✓ (full) | ✓ (limited) |
| Student-equivalent monthly | **₹199** | n/a (free) | ~₹999-₹2,499 | ₹299-₹599 | ₹999-₹2,999 | ~₹2,499 | ~₹1,250 ($15) | ~₹750 ($9) | n/a (free) | ₹999-₹3,999 |
| Pro-equivalent monthly | **₹399** | n/a | ~₹2,999+ | ~₹999+ | ~₹4,999+ | ~₹4,999+ | — | — | n/a | ~₹4,999+ |
| Annual (Pro) | **₹2,999** | n/a | ~₹15,000-₹40,000 | ₹4,999-₹9,999 | ~₹25,000+ | ~₹30,000+ | ~₹10,000 ($120) | ~₹8,000 ($96) | n/a | ~₹50,000+ |
| Family plan | **₹4,499/yr** | n/a | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ | n/a | ✓ |

**Ask-My-Notes is positioned at ~5-10x cheaper than PW/Vedantu/Unacademy Pro tiers, and on par with Knowt internationally.** This is the conscious "B2C wedge with low CAC" play described in `marketing_strategy_debate.md`. The trade-off: hard to fund a sales team or paid acquisition at ₹199 ARPU without exceptional viral coefficient.

---

## 5.6 UX/UI quality comparison (subjective)

| Product | Polish (1-10) | Onboarding | Mobile | Speed | Notes |
|---------|---------------|------------|--------|-------|-------|
| Ask-My-Notes | **8.5** | 7 (good wizard, weak empty state) | 6 (web responsive, no native app) | 8 (streaming, realtime) | Dark theme + Framer Motion + parallax — well above category norm |
| NotebookLM | 9 | 8 | 8 (web + mobile decent) | 8 | Google design polish |
| PW | 7 | 6 (forces signup early) | 9 (native app) | 7 | Functional, not delightful |
| Doubtnut | 6 | 7 | 9 (mobile-first) | 6 | Optimized for low-end Android |
| Vedantu | 7 | 7 | 8 | 6 | Live-class-centric design |
| Brilliant | 9 | 9 (best in class) | 8 | 8 | Premium feel; influences EdTech category |
| Knowt | 7 | 7 | 7 | 7 | Younger / TikTok-y aesthetic |
| Anki | 4 | 3 | 5 | 9 | Powerful but ugly |

**Strategic insight:** Ask-My-Notes wins on polish vs Indian incumbents (PW/Doubtnut/Vedantu) and is roughly on par with US/global tools (Brilliant, NotebookLM). This is a real moat for a *premium* positioning that the marketing copy hasn't yet fully claimed.

---

## 5.7 Distribution & growth comparison

| Channel | Ask-My-Notes today | Best-in-category |
|---------|--------------------|-------------------|
| Paid ads (Meta/Google) | Likely minimal | PW, Vedantu spend ₹crores/mo. Don't compete. |
| Influencer marketing | None confirmed | Doubtnut + Unacademy dominate YouTube education |
| Campus ambassadors | Planned per `marketing_roadmap.md` | PW has thousands |
| SEO (long-tail) | Probably weak | NotebookLM (Google domain advantage), PW (huge content library) |
| Content marketing (PYQs, study guides) | **Building** (PYQ marketplace) | PW, Doubtnut |
| WhatsApp groups infiltration | Planned (admin pin + 20% off) | Unmonopolized — viable channel |
| Discord / Reddit | Potential but unclaimed | Knowt has US discord presence |
| App store ASO | n/a (web only) | PW dominates Google Play in India |
| Referral / viral loops | Building (parent-referral, family plan) | Cred-style + Spotify-family-plan combinations are underused in EdTech |

**Biggest growth gap:** no proven low-CAC acquisition channel. Until this is solved, scale beyond a few thousand paid users is hard. The `marketing_strategy_debate.md` plan (Tier-1 campus capture → influencer push → WhatsApp infiltration) is sound but unexecuted.

---

## 5.8 The 3 unique moats (recap)

1. **Brain Map (user's personal concept graph)** — the deepest data moat in the product. The longer a user studies on Ask-My-Notes, the higher their switching cost. **Lifetime: 12-24 months** before any competitor can plausibly replicate it (concept extraction infra requires sustained investment).
2. **11-domain prompt library tuned on Indian curricula** — easier to copy than to think to copy. **Lifetime: 6-12 months** before PW or a serious challenger does this.
3. **Realtime + ambient UX polish** — not a data moat but a brand/positioning moat. **Lifetime: indefinite** if the team continues to ship at this quality cadence.

The market_research_report's claim that the Brain Map *is* the moat is correct. Everything else is a wedge.
