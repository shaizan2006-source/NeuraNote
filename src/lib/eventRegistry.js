// =====================================================================
// eventRegistry.js — canonical list of trackable event types.
//
// To add a new event:
//   1. Add a key here with its expected metadata shape (for docs only).
//   2. Call track('your_event', { ...metadata }) from the feature.
//   3. (Optional) Add a pure compute fn in progressUtils.js if it should
//      surface on the dashboard.
//
// Never:
//   - rename an existing key (breaks historical data)
//   - write events client-side without going through track()
//   - create a parallel tracking table
// =====================================================================

export const EVENT_TYPES = Object.freeze({
  // Question / conversation
  QUESTION_ASKED:           "question_asked",
  ANSWER_RECEIVED:          "answer_received",
  FOLLOWUP_ASKED:           "followup_asked",

  // Mode behaviour
  MODE_SWITCHED:            "mode_switched",            // ask-ai answer<->coach
  DASHBOARD_MODE_TOGGLED:   "dashboard_mode_toggled",   // study<->progress

  // Coach mode signals
  COACH_STEP_REQUESTED:     "coach_step_requested",
  CONCEPT_CLARIFIED:        "concept_clarified",
  STUDY_PLAN_GENERATED:     "study_plan_generated",
  STUDY_PLAN_TASK_DONE:     "study_plan_task_done",

  // Practice
  QUIZ_STARTED:             "quiz_started",
  QUIZ_QUESTION_ATTEMPTED:  "quiz_question_attempted",
  QUIZ_COMPLETED:           "quiz_completed",
  CARD_REVIEWED:            "card_reviewed",            // SM-2 (Phase 3)

  // PDFs / RAG
  PDF_UPLOADED:             "pdf_uploaded",
  PDF_QUERIED:              "pdf_queried",

  // Sessions / focus
  SESSION_STARTED:          "session_started",
  SESSION_ENDED:            "session_ended",
  FOCUS_STARTED:            "focus_started",
  FOCUS_ENDED:              "focus_ended",

  // Voice tutor
  VOICE_TURN_STARTED:       "voice_turn_started",
  VOICE_TURN_ENDED:         "voice_turn_ended",

  // Generic UI signals worth keeping cheap
  PAGE_VIEWED:              "page_viewed",
});

export const VALID_EVENT_TYPES = new Set(Object.values(EVENT_TYPES));

export const VALID_SURFACES = new Set([
  "dashboard", "ask_ai", "focus_mode", "quiz", "coach", "voice", "pdf", "progress",
]);

// Metadata contracts (documented for humans; not enforced at runtime).
//
// QUESTION_ASKED         { mode:'answer'|'coach', threadId, depth, charCount, topic? }
// FOLLOWUP_ASKED         { threadId, depth, parentId? }
// MODE_SWITCHED          { from:'answer'|'coach', to:'answer'|'coach' }
// DASHBOARD_MODE_TOGGLED { from:'study'|'progress', to:'study'|'progress' }
// COACH_STEP_REQUESTED   { stepIndex, topic, threadId }
// CONCEPT_CLARIFIED      { topic, followUpOf? }
// STUDY_PLAN_GENERATED   { planType, days, subjects:[...] }
// QUIZ_QUESTION_ATTEMPTED{ topic, correct:boolean, difficulty:'easy'|'med'|'hard' }
// CARD_REVIEWED          { cardId, grade:0|1|2|3|4|5 }
// PDF_QUERIED            { pdfId, query, hitCount }
// SESSION_STARTED/ENDED  { } (duration_ms top-level on END)
// FOCUS_STARTED/ENDED    { task?, difficulty? } (duration_ms on END)
// VOICE_TURN_*           { turnIndex, transcriptLen? }
// PAGE_VIEWED            { path }
