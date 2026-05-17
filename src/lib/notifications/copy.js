// Notification copy per type and context

export const NOTIFICATION_COPY = {
  briefing: {
    title: "Your Morning Briefing is ready",
    body: (userName) => `Good morning${userName ? `, ${userName}` : ""}. 90 seconds to set your day up right.`,
    url: "/dashboard",
    type: "briefing",
  },
  midday: {
    title: "Quick check-in",
    body: () => "How's the prep going? One question, one concept — keep the momentum.",
    url: "/ask-ai",
    type: "midday",
  },
  focus_anchor: {
    title: "Evening study window",
    body: () => "Peak focus window. Your desk is waiting.",
    url: "/focus",
    type: "focus_anchor",
  },
  night_closure: {
    title: "Wrap up for today",
    body: () => "What did you lock in today? 2 minutes for a quick review.",
    url: "/progress",
    type: "night_closure",
  },
  friday_quiz: {
    title: "Friday — 20 questions",
    body: () => "Test what stuck this week. 15 minutes.",
    url: "/quiz/friday",
    type: "friday_quiz",
  },
};

export function buildPayload(type, userName) {
  const template = NOTIFICATION_COPY[type];
  if (!template) return null;
  return {
    title: template.title,
    body: typeof template.body === "function" ? template.body(userName) : template.body,
    url: template.url,
    type: template.type,
  };
}
