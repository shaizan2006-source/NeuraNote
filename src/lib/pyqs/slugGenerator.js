export function generatePyqSlug({ exam_type, exam_year, exam_session, subject, chapter, id }) {
  const parts = [
    exam_type,
    exam_year,
    exam_session,
    subject,
    chapter,
    id?.slice(0, 8),
  ]
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return parts;
}
