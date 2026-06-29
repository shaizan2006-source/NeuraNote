/**
 * Selects the best hero stat to show on the Day 7 decision page.
 * First match wins — order encodes priority.
 *
 * @param {object} user   { first_name, streak_days, is_repeat_aspirant }
 * @param {object} signals  From trial_segments.signals + fsrs_cards_due_next_week
 * @returns {{ variant, hero_number, hero_text } | { variant: "low_activity", redirect_to }}
 */
export function selectHeroVariant(user, signals = {}) {
  const firstName = user?.first_name || "You";
  const isRepeat  = user?.is_repeat_aspirant === true;

  const streak       = signals.streak_days         ?? 0;
  const questions    = signals.questions_asked      ?? 0;
  const briefings    = signals.briefings_opened     ?? 0;
  const cardsDue     = signals.fsrs_cards_due_next_week ?? 0;

  // Repeat-aspirant copy variants — same priority order, different language
  if (streak >= 3) {
    return {
      variant: "streak",
      hero_number: streak,
      hero_text: isRepeat
        ? `${firstName}, you've shown up ${streak} days straight. Different from last year.`
        : `${firstName}, you've studied ${streak} days straight. Keep it going.`,
    };
  }

  if (questions >= 10) {
    return {
      variant: "questions",
      hero_number: questions,
      hero_text: isRepeat
        ? `You've asked ${questions} sharper questions this week.`
        : `You asked ${questions} questions this week. Your queue knows what you need next.`,
    };
  }

  if (briefings >= 4) {
    return {
      variant: "briefings",
      hero_number: briefings,
      hero_text: isRepeat
        ? `${briefings} of 7 briefings opened. You're building a new habit this time.`
        : `You opened ${briefings} of 7 briefings. Tomorrow's is already prepared.`,
    };
  }

  if (cardsDue >= 5) {
    return {
      variant: "fsrs_cards",
      hero_number: cardsDue,
      hero_text: isRepeat
        ? `You're using the queue properly this time. ${cardsDue} cards scheduled this week.`
        : `${cardsDue} cards are scheduled for you this week.`,
    };
  }

  // Low-activity user — show different minimal screen
  return {
    variant: "low_activity",
    redirect_to: "/trial/lapsed",
  };
}
