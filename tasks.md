# tasks.md — Task Management

---

## Active Tasks

### Task: Dashboard Tab Layout Restructure
- Status: completed
- Priority: high
- Description: Replace single-scroll 11-section dashboard with 3-tab layout (Study / Practice / Analyze)
- Scope: `src/app/dashboard/page.js`, `src/components/dashboard/DashboardSidebar.jsx`
- Notes: Already fully implemented — 3 tabs, AnimatePresence mode="wait", sidebar setActiveTab wired

### Task: Landing Page Redesign
- Status: completed
- Priority: high
- Description: Rebuild `page.js` from 17-line placeholder to full conversion page (Hero, Features, How It Works, Pricing, Footer)
- Scope: `src/app/page.js`
- Notes: Completed — Nav, Hero, Social Proof, Features (4 cards), How It Works (3 steps), Testimonials (3 quotes), CTA Banner, Footer. Framer Motion useInView scroll animations throughout.

### Task: FocusModeSection Premium Upgrade
- Status: completed
- Priority: medium
- Description: Replace CSS timer with SVG ring, add session type tabs with sliding indicator, ambient pulse while running
- Scope: `src/components/dashboard/FocusModeSection.jsx`
- Notes: Completed — session type tabs with layoutId pill, celebration burst on focus interval complete, startFocus accepts duration+breakMode

### Task: StudyPlanSection Checkable Items
- Status: completed
- Priority: medium
- Description: Add animated checkmarks to topic items, progress header ("X of Y topics today"), today's focus card
- Scope: `src/components/dashboard/StudyPlanSection.jsx`
- Notes: Completed — checkmarks/progress were already done; added Today's Focus card (first unchecked task, brand gradient border)

### Task: Design Token Rollout
- Status: completed
- Priority: low
- Description: Replace all tokenizable hardcoded hex values across dashboard components
- Scope: AICoachSection, ExamSection, VoiceCallSection, AnalyticsSection, UploadSection
- Notes: StudyPlanSection/FocusModeSection already clean. Remaining hex values in all files are intentional card-specific custom colors with no token equivalent.

---

## Task Rules
- One task "in-progress" at a time
- Complete current task before starting another
- Break large tasks into smaller actionable steps
- Descriptions stay concise and specific

---

## Execution Flow
1. Read task details
2. Create short plan
3. Execute per `execution.md` rules
4. Verify: type-check + lint + logic
5. Update task status here

---

## Completed Tasks

### PDF Export Fix
- Completed: 2026-03-31
- Summary: Bypassed AI entirely; `handleExportPdf` calls `/api/generate-document` directly with answer content
- Impact: Export now generates a real PDF file instead of AI-generated instructions

### PDF Generation Quality Upgrade
- Completed: 2026-03-31
- Summary: Full rewrite of `/api/generate-document` — structured layout, typography hierarchy, deduplication, header/footer with page numbers
- Impact: PDFs are now clean, readable, and print-ready

### Cancel Upload Button
- Completed: 2026-03-31
- Summary: Added `AbortController` + `cancelUpload()` to context; cancel button shown during upload/processing
- Impact: Users can abort in-flight uploads without refresh

### Add New PDF Button
- Completed: 2026-03-31
- Summary: Added reset button in upload done-state to clear file and return to idle
- Impact: Users can upload multiple PDFs without navigating away

### Upgrade Plan Button in Sidebar
- Completed: 2026-03-31
- Summary: Added motion button at sidebar bottom; redirects to `/pricing`; works in both expanded and collapsed modes
- Impact: Upgrade CTA always visible in-product

### Remove Study Session + Revision Mode
- Completed: 2026-03-31
- Summary: Removed 11 state vars, 9 functions, 3 API routes (`/api/study-session`, `/api/revision-mode`, `/api/revision`), and all UI panels
- Impact: Cleaner context, reduced bundle size, no dead routes

---

## Backlog
- ~~Milestone toast system (`src/components/ui/MilestoneToast.jsx`)~~ — completed (already existed)
- ~~Streak freeze nudge in sidebar~~ — completed
- ~~Weekly recap card (Sunday auto-summary)~~ — completed
- ~~Exam readiness shareable card~~ — completed
- ~~Onboarding step transition animations~~ — completed
- ~~Mobile polish pass (375px breakpoints)~~ — completed
- ~~Animation audit (remove double-fire on re-renders)~~ — completed

---

## Constraints
- No duplicate execution rules here
- No long descriptions
- No multiple active tasks
- Keep everything actionable

---

**Clarity > Quantity. Execution > Planning.**
