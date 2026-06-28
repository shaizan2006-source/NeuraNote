import { createEmptyCard, fsrs, generatorParameters, State } from "ts-fsrs";
import { supabaseAdmin } from "@/lib/serverAuth";

const f = fsrs(generatorParameters({ enable_fuzz: true }));

// Rating map: 1=Again, 2=Hard, 3=Good, 4=Easy
export const RATING_LABELS = { 1: "Again", 2: "Hard", 3: "Good", 4: "Easy" };

// `topic` is the unique key on spaced_repetition_cards per user.
export async function getOrCreateCard(userId, topic, cardType = "note_chunk") {
  const { data: existing } = await supabaseAdmin
    .from("spaced_repetition_cards")
    .select("*")
    .eq("user_id", userId)
    .eq("topic", topic)
    .maybeSingle();

  if (existing) return existing;

  const empty = createEmptyCard();
  const { data, error } = await supabaseAdmin
    .from("spaced_repetition_cards")
    .insert({
      user_id: userId,
      topic,
      card_type: cardType,
      fsrs_state: "new",
      fsrs_stability: empty.stability,
      fsrs_difficulty: empty.difficulty,
      fsrs_due: empty.due,
      fsrs_lapses: empty.lapses,
      fsrs_learning_steps: empty.learning_steps ?? 0,   // F-015: init step cursor
      interval_days: 0,
      repetition: 0,
      next_due_at: empty.due,
    })
    .select()
    .single();

  // 23505 = unique_violation: two concurrent requests both passed the select
  // check (TOCTOU). Re-fetch the row the other request already inserted.
  if (error?.code === "23505") {
    const { data: race } = await supabaseAdmin
      .from("spaced_repetition_cards")
      .select("*")
      .eq("user_id", userId)
      .eq("topic", topic)
      .maybeSingle();
    if (race) return race;
    // Re-fetch also failed — re-throw the original error so the caller knows
    throw new Error(`getOrCreateCard: unique conflict but row missing: ${error.message}`);
  }

  if (error) throw new Error(error.message);
  return data;
}

export async function scheduleReview(userId, topic, ratingValue) {
  const card = await getOrCreateCard(userId, topic);

  const fsrsCard = {
    due: card.fsrs_due ? new Date(card.fsrs_due) : new Date(),
    stability: card.fsrs_stability ?? 0,
    difficulty: card.fsrs_difficulty ?? 0,
    elapsed_days: card.fsrs_elapsed_days ?? 0,
    scheduled_days: card.interval_days ?? 0,
    reps: card.repetition ?? 0,
    lapses: card.fsrs_lapses ?? 0,
    // F-015: reconstruct the ts-fsrs learning-step cursor. Without it, ts-fsrs resets
    // the step to 0 every review, so learning/relearning cards never graduate to
    // 'review' and the interval stays frozen at the first learning step.
    learning_steps: card.fsrs_learning_steps ?? 0,
    state: mapState(card.fsrs_state),
    last_review: card.fsrs_last_review ? new Date(card.fsrs_last_review) : undefined,
  };

  const rating = Number(ratingValue);
  const result = f.next(fsrsCard, new Date(), rating);
  const next = result.card;

  const { error } = await supabaseAdmin
    .from("spaced_repetition_cards")
    .update({
      fsrs_state: stateLabel(next.state),
      fsrs_stability: next.stability,
      fsrs_difficulty: next.difficulty,
      fsrs_due: next.due,
      fsrs_last_review: new Date(),
      fsrs_lapses: next.lapses,
      fsrs_elapsed_days: next.elapsed_days,
      fsrs_learning_steps: next.learning_steps,   // F-015: persist the step cursor
      interval_days: next.scheduled_days,
      repetition: next.reps,
      ease_factor: next.difficulty,
      next_due_at: next.due,
    })
    .eq("user_id", userId)
    .eq("topic", topic);

  if (error) throw new Error(error.message);

  return {
    due: next.due,
    interval_days: next.scheduled_days,
    stability: next.stability,
    difficulty: next.difficulty,
    state: stateLabel(next.state),
    rating: RATING_LABELS[rating],
  };
}

export async function getDueCards(userId, limit = 20) {
  const { data, error } = await supabaseAdmin
    .from("spaced_repetition_cards")
    .select("*")
    .eq("user_id", userId)
    .lte("next_due_at", new Date().toISOString())
    .order("next_due_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function migrateSM2Card(card) {
  const reps = card.repetition ?? 0;
  const interval = card.interval_days ?? 1;
  const ease = card.ease_factor ?? 2.5;

  const stability = Math.max(0.1, interval / 0.105);
  const difficulty = Math.max(1, Math.min(10, 10 - (ease - 1.3) * 4));
  const due = card.next_due_at ? new Date(card.next_due_at) : new Date();
  const state = reps === 0 ? "new" : interval > 20 ? "review" : "learning";

  const { error } = await supabaseAdmin
    .from("spaced_repetition_cards")
    .update({
      fsrs_stability: stability,
      fsrs_difficulty: difficulty,
      fsrs_due: due,
      fsrs_state: state,
      fsrs_lapses: 0,
      fsrs_last_review: card.last_review_at ?? card.last_reviewed_at ?? null,
    })
    .eq("id", card.id);

  if (error) throw new Error(error.message);
}

function mapState(label) {
  switch (label) {
    case "new": return State.New;
    case "learning": return State.Learning;
    case "relearning": return State.Relearning;
    case "review": return State.Review;
    default: return State.New;
  }
}

function stateLabel(state) {
  switch (state) {
    case State.New: return "new";
    case State.Learning: return "learning";
    case State.Relearning: return "relearning";
    case State.Review: return "review";
    default: return "new";
  }
}
