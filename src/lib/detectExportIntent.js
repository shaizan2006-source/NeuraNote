export function detectExportIntent(question) {
  if (!question) return { export: false, type: null };

  const q = question.toLowerCase();

  if (
    q.includes("pdf") ||
    q.includes("export") ||
    q.includes("download") ||
    q.includes("report")
  ) {
    return { export: true, type: "pdf" };
  }

  if (
    q.includes("word") ||
    q.includes("docx") ||
    q.includes("doc ")
  ) {
    return { export: true, type: "docx" };
  }

  return { export: false, type: null };
}