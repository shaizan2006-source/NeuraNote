# Student Psychology Execution
*Concrete UX patterns by emotional state — the "care pillar" made operational*
*For: Ask-My-Notes — every screen, every notification, every copy decision*
*Date: May 2026*

---

## 0. How to use this document

This is not theory. This document is a UX patterns book. Open it before writing any user-facing string. Reference it when designing any new screen. Send it to any contractor or designer working on the product.

The framework: every UX surface serves the student in a specific emotional state. The wrong language at the right moment is worse than no language. The right language at the right moment is the entire moat.

The structure of each pattern below:
- **Trigger** — when the student is in this state
- **What they're feeling** — internal monologue (in their head)
- **What they need from the product** — emotional need
- **The wrong response** — what most competitors do
- **The right response** — what Ask-My-Notes does
- **Copy patterns** — exact phrases that work
- **Anti-copy** — exact phrases that fail

---

## 1. The five emotional states (from prior research)

Recap, with specific time anchors:

| State | Time of day | Trigger | Primary need |
|---|---|---|---|
| 1. Morning Resolve | 5-7am | Wake-up, intention | Clear plan, calibrated optimism |
| 2. Mid-day Grind | 10am-2pm | Heads-down studying | Micro-wins, progress evidence |
| 3. Afternoon Slump | 2-5pm | Energy crash | Low-friction re-entry, no guilt |
| 4. Evening Focus | 6-10pm | Deep work block | Flow state, depth, immersion |
| 5. Night Doubt | 10pm-1am | Bed, comparison, hopelessness | Reassurance, closure, perspective |

Plus three life-cycle states:

| Cycle state | Trigger | Primary need |
|---|---|---|
| 6. Pre-Exam Panic | T-30 to T-1 days | Reassurance, focused review, "you're ready" |
| 7. Exam Day | T-0 | Silence, presence, calm |
| 8. Post-Exam | T+1 onward | Acknowledgment, transition, "what's next" |

Plus identity states (always present):

| Identity state | Manifestation | Need |
|---|---|---|
| 9. Serious Aspirant | "I want depth, no nonsense" | Tools, data, sophistication |
| 10. Exhausted Comfort | "I need warmth" | Gentleness, recognition, low expectations |

Most students cycle through 5 emotional + 2 identity states in a single day. The product must speak appropriately at each.

---

## 2. State 1 — Morning Resolve

### Trigger
User opens the app between 5am-7am (detected by `Date.now()` + user timezone) or in response to the Morning Briefing push notification.

### What they're feeling
*"Okay. Today I'll cover three chapters. I'll do mock test prep. I'll actually finish what I planned yesterday. Today is different."*

This intention is fragile. By 9am, with one missed task or one bad question, the intention can collapse into the day's failure cascade.

### What they need from the product
A *clear, achievable plan* that respects yesterday's reality. Not aspirational. Not maximal. Specifically: 3 things to do, ranked, with time estimates. The plan must feel like a friend's suggestion, not a teacher's assignment.

### The wrong response
- "Welcome back! Don't forget your streak!" (irrelevant)
- "You have 47 cards due!" (overwhelming)
- "Your weak areas: Mechanics, Thermodynamics, Organic Chemistry, Coordination Compounds, Modern Physics..." (paralyzing)
- "Let's set today's goals: ___ hours of study, ___ chapters, ___ mocks." (you're not their boss)

### The right response
A Morning Briefing audio/visual with this structure:

> Good morning, [first name].
>
> Yesterday you put in 47 minutes — strong work.
>
> Three things for today:
> 1. **Review** — 12 Newton's Laws cards (8 minutes)
> 2. **Learn** — Today's planned chapter: Thermodynamics part 2 (45 minutes)
> 3. **Practice** — One PYQ set on Mechanics (15 minutes)
>
> You don't have to do all three. The first one matters most.
>
> Your cohort is studying — 312 members of JEE 2027 Bangalore are active right now.
>
> Let's start.

**Why this works:**
- Acknowledges yesterday (not erases it)
- Three items, ranked, with time estimates
- Explicit permission to do less
- Cohort presence without comparison pressure
- Conversational, not transactional

### Copy patterns that work
- "You don't have to do all three. The first one matters most."
- "Start with the easy one. Momentum is everything."
- "Yesterday was [a strong day / a rest day / a recovery day]. Today is fresh."
- "If you only have 15 minutes, do this: ___"
- "Your cohort is here with you."

### Anti-copy
- "Don't break your streak!"
- "X students are ahead of you this week."
- "Time to grind."
- "You've fallen behind on your plan."
- "Wake up — your exam is in X days."

---

## 3. State 2 — Mid-day Grind

### Trigger
User is mid-session. App is open. Has been studying 20+ minutes. Hasn't taken a break.

### What they're feeling
*"Am I making any progress at all? I've been at this for hours. Other people are scoring higher than me. Maybe I'm not cut out for this. But I have to keep going."*

The doubt thoughts intrude even during productive work. The product can interrupt these thoughts with micro-validation.

### What they need from the product
Evidence of micro-progress. Tiny visible wins. Not big celebrations — small persistent reassurance that the work is *working*.

### The wrong response
- Confetti animations on every correct answer (childish, students see through it)
- "You're doing great!" with no specifics (sounds like a chatbot)
- Pop-up showing "you're 47% through your goal!" mid-session (interrupts flow)
- Notifications during deep work (kill them entirely)

### The right response
Ambient, non-intrusive progress signals:
- A subtle pulse on the concept node when it's just been mastered
- The Brain Map darkening one previously-dim node, observable in peripheral vision
- "Mastery +1" in tiny text, no animation, no sound, just a quiet number going up
- After a session: "47 minutes. 12 concepts touched. 3 strengthened. See you tomorrow."

### Copy patterns
After a correct answer (one in 5, not every one):
- "That's the second time you've gotten this right in a row."
- "You knew this 3 weeks ago too. Memory holds."
- "This concept just moved from 'shaky' to 'solid' in your Brain Map."

After session end (always shown):
- "47 minutes. 12 concepts touched. 3 strengthened."
- "You've spent 14 hours on Mechanics this month. It shows."
- "This was your most focused session this week."

### Anti-copy
- "Awesome job! 🎉🎉🎉"
- "You're a star!"
- Excessive emoji
- Empty praise ("great work!" with nothing concrete)
- Comparisons mid-session ("you're ahead of 73% of your cohort!" — wait until end of week)

---

## 4. State 3 — Afternoon Slump

### Trigger
User hasn't opened the app between 2pm-5pm despite usually being active. Or: user opens app, doesn't start a session, scrolls and closes.

### What they're feeling
*"I should be studying but I can't. I'm tired. I'll start in 20 minutes. I'll start after this Instagram session. I'm so behind. Why am I like this."*

The shame spiral. Every minute scrolling Instagram while a study app sits on the home screen amplifies guilt. The product either makes this worse or makes this better. **This is the most retention-critical moment of the day.**

### What they need from the product
**Permission to fail today.** Re-entry that costs zero emotional energy. The opposite of guilt.

### The wrong response
- Push notification: "Time to study! 📚" (triggers guilt, doesn't restart action)
- Push notification: "You haven't studied today!" (active shaming)
- "Your streak is at risk!" (the streak-guilt anti-pattern that haunts EdTech)
- Re-engagement push at 3:47pm

### The right response
**No notification during 2-5pm slump window for users who haven't opened today.** Yes, no notification. Silence is the kindness.

If the user opens the app during the slump:
- The dashboard greets with a single-line warmth, not a task list
- "Tired? Take 5 minutes. Or just look around — no pressure."
- A 2-minute "easy win" option: 5 flashcards, no judgment, marked complete regardless of accuracy
- A "rest mode" toggle: "Today is a rest day. I'll log this and we resume tomorrow."

### Copy patterns
The dashboard greeting (replaces normal greeting if 2-5pm and no session today):
- "Tired? Take 5 minutes. Or just look around — no pressure."
- "Today doesn't have to be perfect. Pick one tiny thing or skip."
- "Some days are study days. Some days are rest days. Both count."

The "easy win" CTA:
- "Just 5 cards. Nothing else. Then close."
- "Two minutes. Just see what you remember."

The "rest day" option:
- "Take today off. I'll be here tomorrow."
- "Rest is part of the work. Logged."

### Anti-copy
- ANYTHING with a streak threat
- "You can do it!" (pressure)
- "Just one chapter!" (still asks for too much)
- Any negative framing of inactivity

### Operational rule
**Slump window (2-5pm) notification logic:**
```
if (current_time in 2pm-5pm) AND (no_session_today) {
  do_not_send_push();
  if (user_opens_app) {
    show("Tired? Take 5 minutes. Or just look around — no pressure.");
    set_dashboard_to_rest_mode();
  }
}
```

This is the single most important UX rule in the product. Most EdTech products do the opposite. Doing the opposite of most EdTech products is itself the moat.

---

## 5. State 4 — Evening Focus

### Trigger
User opens Focus Mode session, or opens app in their declared "study window" (typically 6-10pm).

### What they're feeling
*"Okay. Time to actually do this. Let's go."*

Adrenaline returns. Energy is back. This is the productive state. The product's job is to *get out of the way* and let the work happen.

### What they need from the product
Immersion. Depth. Minimal interruption. Focus Mode at its best is invisible — the student is in flow, the product invisibly supports.

### The wrong response
- Notifications during Focus session (kill them — global policy)
- Pop-up upsells mid-session ("Upgrade to Pro for unlimited!")
- Suggestion to "switch to a different topic" mid-flow
- Any social comparison during session ("you're behind your cohort")

### The right response
- Focus Mode ambient backgrounds (already built, beautifully)
- Quiet, audio-driven progress markers (no visual interruption)
- Smart pause detection: if user idles 90s, *gently* check in — "Still with us? No rush."
- After 90 minutes, soft prompt: "You've been deep for 90 minutes. Push through, or take 5?" — *suggest*, never *force*

### Copy patterns
Mid-session (rare):
- "Still with us?" (single phrase, no urgency)
- "90 minutes. Push through, or pause?" (option, not directive)

End of session:
- "47 minutes. 23 cards. 2 concepts strengthened. Strong session."
- "Brain Map +3. Your cohort would be proud."
- "Best session this week."

### Anti-copy
- "Don't lose focus!" (the irony — telling someone to focus breaks focus)
- "You're so close to your daily goal!"
- ANY upsell during Focus Mode
- Any notification not from the user-set Focus session reminder

---

## 6. State 5 — Night Doubt

### Trigger
User opens app after 10pm. Or: user is in app at 11pm+ scrolling, not studying.

### What they're feeling
*"I'm watching topper interviews on YouTube. They got AIR 12. I'll probably get AIR 60,000. My parents will be disappointed. I should have studied harder today. Why can't I sleep? I'll just check one more thing on my phone."*

This is the most emotionally raw moment of the day. The student is comparing themselves to the best-case-scenario internet content while operating on partial sleep. **The product can either amplify this or interrupt it.**

### What they need from the product
Closure. Reassurance. Permission to rest. A perspective shift from "I'm not enough" to "this work compounds, and you put in today's piece."

### The wrong response
- "Time for a quick review before bed?" (encourages bad sleep hygiene)
- Push notification at 11pm ("Don't break your streak!")
- "47 days until JEE Main!" (anxiety bomb)
- Any content that triggers comparison

### The right response
If user opens app after 10pm:
- Dashboard switches to a "Night Mode" — calmer colors, fewer numbers, no metrics flash
- A single message: "Late night. Try to wrap up — sleep is study too."
- No new content. No new push to do anything.
- A "Reflect" option: 30-second audio summary of today, then "Sleep well."

If user is doom-scrolling within the app (detected: 5+ pageviews, no session started, late hour):
- Gentle interrupt: "I notice you've been scrolling for 8 minutes. Want to sleep, or do you need to actually study?"
- Option A: "Sleep" → app closes itself with goodnight message
- Option B: "Quick win" → 5 flashcards, then close
- Option C: "Just chilling" → no-op, stop interrupting

### Copy patterns
Late-night greeting:
- "Late night. Try to wrap up — sleep is study too."
- "Tomorrow morning will reward you more than tonight's grind will."
- "You did today. That's enough for today."

Reflection close:
- "Today: 47 minutes. 3 concepts strengthened. The work compounds. Sleep well."
- "You showed up today. That's the only number that matters in the long run."

Doom-scroll interrupt:
- "Scrolling for 8 minutes. Sleep, or one quick win, or just chilling?"

### Anti-copy
- Anything with future-anxiety framing
- "X days until exam" after 10pm
- Mock test reminders
- "Top scorers studied at this time too" (toxic comparison)
- Comparison to cohort late at night

### Operational rule
**Night Mode triggers (after 10pm):**
```
if (current_time > 10pm) {
  switch_ui_to_night_mode();  // calmer colors, no metric flashing
  disable_metric_pulses();
  disable_streak_displays();
  disable_exam_countdown_displays();
  surface_reflect_option();
  if (no_session_started_AND_scrolling > 8min) {
    show_gentle_interrupt();
  }
}
```

This is the second-most-important UX rule. Most EdTech does the opposite (push hard at night because students are active and lonely). Don't.

---

## 7. State 6 — Pre-Exam Panic (T-30 to T-1 days)

### Trigger
Calculated from exam date set at onboarding. Sliding scale:
- T-30 to T-15: heightened tension
- T-15 to T-7: focused review
- T-7 to T-1: lockdown mode
- T-1: silence

### What they're feeling
*"What if I'm not ready. What if I forget everything. What about the topics I never quite mastered. What if I get a question I've never seen. What if I freeze. What if I let everyone down. I can't breathe."*

The catastrophizing is normal and unhelpful. The product cannot solve the anxiety but must not amplify it.

### What they need from the product
Re-grounding in evidence of preparation. Not in feelings. Concrete proof of work done. Plus permission to be human.

### The right response

**T-30:**
- Cycle marker: "30 days. The hardest 30. We're with you."
- Focused review plan: AI-generated, 30-day intensive, prioritizing 60-79% mastery zone (the marginal-gain zone)
- Daily Briefing tone shifts to slightly more directive, less playful
- Decompression nudges increase frequency

**T-7:**
- "7 days. You've prepared 47 weeks for this. Now we review."
- Lockdown lite: no new topics, only review of known material
- Brain Map review animations show "what you've built"
- Specific anxiety supports surface: "If you're freaking out, try this 5-minute exercise."

**T-1:**
- Lockdown full: no new content offered
- Calming UI: high-contrast off, animations muted, breathing pattern visualizer available
- Single screen: "Tomorrow. You're ready. Sleep early. We're here."
- All notifications muted except a single 9pm gentle close

**T-0 (exam day):**
- Silent. App shows: "We're with you today. Come back tomorrow." Single screen, single sentence.
- All push notifications disabled.
- All metrics hidden.
- No streaks lost on this day. Permanent grace.

### Copy patterns

T-30:
- "30 days. The hardest 30. We're with you."
- "From here on, every session matters more. You knew that."
- "You've been prepping for [X] months. The work is in your bones."

T-7:
- "Seven days. You've built a Brain Map of [N] concepts. That's not nothing."
- "We're not learning new things now. We're remembering what we know."
- "If you're scared, you're paying attention. That's good."

T-1:
- "Tomorrow. You're ready. Sleep early. We're here."
- "Everything you've done has led to tomorrow. Trust it."
- "Read one familiar page. Then sleep."

T-0:
- "We're with you today. Come back tomorrow."

### Anti-copy
- Any "are you ready?!" energy
- Any new feature introduction
- Any pricing reminder
- Any cohort comparison ("your cohort average is X")
- Any mock test offering at T-7 or later

---

## 8. State 7 — Exam Day (T-0)

### Trigger
Today is the user's declared exam date.

### What they're feeling
*"Today. Now. The day. Everything for this."*

The product cannot help in real-time. It must not pretend to.

### What they need from the product
Presence without intrusion. Acknowledgment without performance. Quiet support.

### The right response
- A single screen: "We're with you today. Come back tomorrow."
- No metrics visible.
- No notifications. None.
- All Pro features remain accessible if they're inside the exam already (some pre-exam users will use Brain Map for last-minute spot-check) — but no prompts to use them.

### Copy patterns
- "We're with you today. Come back tomorrow."

That's it. One sentence. Don't elaborate.

### Anti-copy
- "Good luck!" (cheap, performative)
- "You got this!" (pressure)
- "Final tips for your exam day!" (this is not the time for new content)
- "Track your performance!" (no)

---

## 9. State 8 — Post-Exam (T+1 onward)

### Trigger
Day after declared exam date, regardless of outcome.

### What they're feeling
Two possible states, often both simultaneously:

**Elation:** *"I think I did okay. Did I do okay? Some questions were brutal. Did I make silly mistakes? Let me check the answer key..."*

**Grief:** *"I screwed up. I should have studied harder. My parents are going to be devastated. All those months. Wasted."*

Most students are 70% one, 30% the other. The product cannot know which until the student tells us. So it doesn't assume.

### What they need from the product
Acknowledgment. Witness. A next step that doesn't presume the outcome.

### The right response
On the day after the exam, app opens to a special screen — not the regular dashboard.

> Yesterday was a big day.
>
> However it went, you did the thing.
>
> [Tell me how it went]
>
> - Did okay / better than expected
> - Did fine — wait and see
> - Did rough — needed to vent
> - Don't want to talk about it yet

Each option leads to a different conversational flow, calibrated to the response. The "don't want to talk" option is critical — it must exist and lead to a respectful "Take your time. I'll be here when you're ready."

For 7 days after the exam, the product is **quieter** — no aggressive feature pushes, no metric celebrations, no pricing reminders. Just a calm presence.

At T+7:
- Pivot conversation begins
- "Whatever happened, here's what could come next."
- Options based on inferred outcome: prep for next exam, prep for JEE Advanced (if Main was T-0), prep for next cycle (if didn't clear)

### Copy patterns

Day after exam:
- "Yesterday was a big day."
- "However it went, you did the thing."
- "Tell me how it went — or take your time."

Pivot week:
- "Whatever happened, we go again. What's next?"
- "You showed up for the exam. That's not nothing. That's a lot."
- "Next steps, when you're ready..."

### Anti-copy
- "Congrats!" before knowing outcome
- "Don't worry about results!" (dismissive)
- "Time to start prepping for the next thing!" (too soon)
- Any features push, ESPECIALLY Pro upgrades, in the first 7 days

---

## 10. Identity Mode A — Serious Aspirant

### When it surfaces
The same student is sometimes Mode A, sometimes Mode B, often both in the same day. Mode A surfaces during:
- Focus Mode sessions
- Mock test sessions
- Deep work blocks
- Goal-setting moments

### What Mode A wants
Sophistication. Data. Real metrics. No babying. No mascot. Treat them as the serious adult they're trying to be.

### Copy patterns for Mode A surfaces
- Use precise numbers: "Mastery: 73% (up from 67% last week)"
- Use professional language: "Your trajectory predicts JEE Main 192-218 within 95% confidence"
- Show your work: "This recommendation is based on 47 of your past sessions plus cohort outcomes"
- Skip emojis
- No exclamation marks

### Surfaces where Mode A dominates
- Brain Map (the master tool — show full graph, show all data)
- Mock Test analytics (show every breakdown — by topic, by difficulty, by time-per-question)
- Progress page (full detail)
- Pricing page (lead with capability, not emotion)

---

## 11. Identity Mode B — Exhausted Comfort

### When it surfaces
- Morning Resolve and Night Doubt states
- Afternoon Slump
- During Pre-Exam Panic
- After a bad mock score
- After missing 2+ days

### What Mode B wants
Warmth. Recognition that they're tired. Gentleness. Acknowledgment that effort itself is worthy.

### Copy patterns for Mode B surfaces
- Use second-person warmly: "You showed up today. That counts."
- Permission to be imperfect: "Today doesn't have to be perfect."
- Soft sentence rhythm — no command voice
- Occasional emoji but minimal (rare for warmth, not decoration)
- No metrics-first surfaces

### Surfaces where Mode B dominates
- Daily Briefing audio voice
- Empty state for new users
- Slump-time greetings
- Decompression nudges
- Late-night surfaces

---

## 12. The 10 universal copy principles

These apply everywhere, regardless of state.

1. **Specifics over abstractions.** "Mastery up 6% this week" > "You're improving!"
2. **Concrete time over vague time.** "8 minutes" > "a quick session"
3. **Permission to skip.** Always include the option to do nothing. "Or just look around."
4. **First-person plural sparingly.** "We" can be warm or patronizing. Use carefully.
5. **No exclamation marks** except in genuine celebration (after long mastery, not after 1 correct answer).
6. **Indian vocabulary.** "PYQ," "JEE Main," "Class 11," "AIR" — speak the language of the audience.
7. **No coaching-institute jargon.** Don't sound like a teacher. Sound like a friend who knows the material.
8. **Honesty over hype.** "Your trajectory is uncertain — let's tighten it" > "You're going to crush it!"
9. **Effort over outcome.** Celebrate work done, not outcomes guaranteed.
10. **Brevity always wins.** Shorter is more confident. Cut every line by 30% before shipping.

---

## 13. The forbidden vocabulary list

Words and phrases that should never appear in user-facing copy:

| Forbidden | Why | Replace with |
|---|---|---|
| "Crush it" | Crass, US-tech-bro | "Do well" / "Do the work" |
| "Hustle" | Toxic productivity | "Show up" / "Keep at it" |
| "Beast mode" | Performative | "Deep work" / "Focused" |
| "Don't break your streak" | The anti-pattern | Streak Freeze + "I'll be here tomorrow" |
| "You're falling behind" | Active shaming | "Today doesn't have to be perfect" |
| "Time to grind" | Hostile to tired student | "Ready when you are" |
| "Limited time offer" | Manipulative | "Available until [specific date]" |
| "Don't miss out" | FOMO manipulation | "Here if you'd like it" |
| "Last chance" | Pressure | "Final week" + neutral explanation |
| "Hurry!" | Pressure | Skip entirely |
| "Achievement unlocked!" | Childish gamification | "Mastered: [thing]" |
| "Level up" | Generic gamification | "Mastery up" |
| "Daily challenge" | Gimmicky | "Today's review" |
| "Score points" | Empty | "Move concepts to mastery" |

---

## 14. The notification grammar guide

Push notifications have ~40 characters of attention. The grammar matters more than the length.

### Structure that works
`[Specific context]. [Specific action available]. [Permission/option].`

Examples:
- `12 cards due. 2 minutes. Or come back later.`
- `Your Briefing is ready. 90 seconds.`
- `Today's chapter: Thermodynamics. Ready when you are.`

### Structure that fails
- `Don't forget to study!` (vague + guilt)
- `You have a new message` (generic)
- `🔥 7-day streak! Don't break it!` (anti-pattern + emoji decoration)

### Push notification rules
1. **Max 4 scheduled per day.** Hard cap.
2. **Zero pushes during 2pm-5pm slump window** for users who haven't opened today.
3. **Zero pushes between 10pm-7am.** Hard rule.
4. **Zero pushes on declared exam day (T-0).** Hard rule.
5. **Each push must include the option to do less.** Never "do this NOW" — always "here if you want."
6. **Specifics in subject line.** Not "Time to study" but "12 cards. 2 min."

---

## 15. The error message guide

Errors are emotional moments. The user is already frustrated. Don't compound.

### Error message rules
1. **Apologize once, fix once, move on.** Don't dwell on the error.
2. **Explain in plain English, not technical jargon.**
3. **Always offer a next action.**
4. **Use lowercase for error states.** Sentence-case for normal copy. Lowercase signals "this is incidental, don't fixate."

### Templates

**Network failure:**
> something's off — couldn't reach our server. tap to retry, or come back in a moment.

**AI failure:**
> we couldn't generate that just now. tap to try again, or rephrase.

**PDF processing failure:**
> we couldn't fully process that pdf. you can still ask questions about it, but answers might be incomplete. [retry processing]

**Quiz generation failure:**
> we couldn't make a quiz from this section. try a different chapter, or contact us if this keeps happening.

**Voice call failure:**
> couldn't connect the voice tutor right now. try again, or use text mode instead.

### Anti-patterns
- "An error occurred." (useless)
- "Something went wrong. Please try again later." (no path forward)
- "ERROR 500: INTERNAL SERVER ERROR" (no, never)
- Excessive apology that makes the user feel they did something wrong

---

## 16. The empty state guide

Empty states are make-or-break for new users. Every empty state must answer three questions:

1. What is this section for?
2. Why is it empty?
3. What should I do to fill it?

### The dashboard empty state (new user, 0 PDFs)
Currently the worst surface in the product. Must be rebuilt in Sprint 1.

New version:
```
┌──────────────────────────────────────────┐
│                                          │
│   Welcome, [Name]. Let's start.          │
│                                          │
│   Step 1: Upload your first PDF          │
│   Step 2: Watch your Brain Map appear    │
│   Step 3: Ask your first question        │
│                                          │
│   [Upload PDF]    [Try with sample]      │
│                                          │
│   Or — just look around for a minute.    │
│                                          │
└──────────────────────────────────────────┘
```

The "Try with sample" option is critical — a pre-loaded JEE Physics chapter that the user can play with before committing their own content.

### The progress page empty state
> Your analytics will live here after you've studied for a day. Come back tomorrow.

### The Brain Map empty state
> Upload a PDF, ask a question, take a quiz — concepts will start appearing here. By next week, this place will look like *you*.

### The cohort empty state (during signup before assignment)
> Finding your cohort... You'll be placed with JEE 2027 aspirants from your region.

---

## 17. The "stop using the product" copy

When users want to cancel, pause, or leave, the response must be trust-building. Mindgrasp lost so much goodwill on hostile cancellation that "Mindgrasp cancel" is now a common search query for them.

### Cancellation flow
1. Frictionless cancel button (not buried).
2. One question: "Want to tell us why?" — optional, skippable.
3. Offer to *pause* (not just cancel): "We can pause your subscription for 30/60/90 days. Your data stays. Come back when you're ready."
4. Confirm. Done. Receipt emailed.

### Copy for pause option
> Want to pause instead? Your Brain Map, your progress, your cohort — all wait for you. Resume when you're ready.

### Copy for true cancellation (after pause is declined)
> Cancelled. Sorry to see you go. Your data is yours — you can come back any time and pick up where you left off.

### Anti-patterns
- Dark patterns ("are you sure?" repeated 3 times)
- Hidden cancel link
- Survey required before cancel
- Auto-resubscribe at expiry
- Punishing tone in cancel confirmation

---

## 18. The personalization-without-creepiness line

The product knows a lot about the student. It must surface this knowledge in a way that feels warm, not surveilled.

### What feels warm
- "Last August you struggled with Newton's 3rd law. Want to check if it stuck?"
- "Your cohort is reviewing Mechanics this week. You're ahead of 60% of them on this chapter."
- "You usually study best between 7-9pm. Want to set this as your Focus window?"

### What feels creepy
- "We've noticed you study from your bedroom. Would you like to optimize your environment?"
- "You opened the app 14 times today without studying. Are you procrastinating?"
- "Your accuracy dropped 12% yesterday. What's wrong?"
- Anything about typing speed, mouse movement, biometric

### The rule
**Surface insights about the student's *work*, never about the student's *behavior*.**
- ✅ "Last week you mastered Thermodynamics" (work)
- ❌ "Last week you opened the app 47 times" (behavior)
- ✅ "You usually study best at night" (pattern that helps them)
- ❌ "You usually waste 23 minutes scrolling first" (judgment)

---

## 19. The closing thought

The care pillar is not a feature. It is hundreds of small UX decisions accumulating into a product that feels different.

A competitor who reads this document can copy any individual pattern. They cannot copy the *posture* — the commitment to treating the student as a human, not a metric.

That posture is the moat. Every copy decision, every notification, every empty state, every error message either embodies it or breaks it. There is no middle.

When in doubt, ask: *"Is this what a friend who genuinely cares about Priya/Arjun would say?"*

---

*Next: `ELITE_FEATURE_ARCHITECTURE.md` for the feature specifications. Then `RETENTION_ENGINE_BLUEPRINT.md` for the mechanics that hold these patterns together.*
