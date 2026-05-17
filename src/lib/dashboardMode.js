export function determineDashboardMode({ inSession, studiedToday }) {
  const hour = new Date().getHours();
  if (inSession) return "active";
  if (hour >= 22 || hour < 5) return "night";
  if (hour >= 14 && hour < 17 && !studiedToday) return "slump";
  if (hour >= 5 && hour < 11 && !studiedToday) return "morning";
  return "standard";
}
