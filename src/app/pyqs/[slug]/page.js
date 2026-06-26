import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/serverAuth";
import TryYourselfClient from "./TryYourselfClient";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { data } = await supabaseAdmin
    .from("pyqs")
    .select("question_text,subject,chapter,exam_type,exam_year")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return { title: "Question Not Found" };
  const examLabel = data.exam_type?.replace(/_/g, " ").toUpperCase();
  const title = `${examLabel} ${data.exam_year} – ${data.subject} ${data.chapter ? `| ${data.chapter}` : ""} | Ask My Notes`;
  const description = data.question_text?.slice(0, 155);
  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
    alternates: { canonical: `/pyqs/${slug}` },
  };
}

async function getQuestion(slug) {
  const { data, error } = await supabaseAdmin.from("pyqs").select("*").eq("slug", slug).maybeSingle();
  return { data, error };
}

async function getSimilar(q) {
  if (!q?.subject) return [];
  const { data } = await supabaseAdmin
    .from("pyqs")
    .select("id,slug,exam_type,exam_year,question_text,difficulty")
    .eq("subject", q.subject)
    .eq("exam_type", q.exam_type)
    .neq("id", q.id)
    .order("exam_year", { ascending: false })
    .limit(5);
  return data ?? [];
}

function Chip({ label, color }) {
  return (
    <span style={{ fontSize: 11, color, background: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`, borderRadius: 12, padding: "3px 10px" }}>
      {label}
    </span>
  );
}

function SolutionBlock({ solution, answer }) {
  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-hairline)", borderRadius: 12, padding: "20px 24px" }}>
      {answer !== undefined && answer !== null && (
        <div style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Answer: </span>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--success)" }}>{answer}</span>
        </div>
      )}
      <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Solution</div>
      <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{solution}</p>
    </div>
  );
}

function QuestionUnavailable() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-hairline)", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, background: "var(--bg-base)", zIndex: 10 }}>
        <Link href="/pyqs" style={{ color: "var(--text-tertiary)", textDecoration: "none", fontSize: 20 }}>←</Link>
      </div>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 20px 80px" }}>
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-hairline)", borderRadius: 12, padding: "32px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Question unavailable</div>
          <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>Couldn’t load this question — try again.</p>
          <Link href="/pyqs" style={{ display: "inline-block", background: "var(--accent-grad)", color: "var(--bg-base)", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            Back to Questions
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function PYQSlugPage({ params }) {
  const { slug } = await params;
  const { data: q, error } = await getQuestion(slug);
  if (error) return <QuestionUnavailable />;
  if (!q) notFound();

  const similar = await getSimilar(q);
  const examLabel = q.exam_type?.replace(/_/g, " ").toUpperCase();
  const diffColor = q.difficulty === "hard" ? "var(--error)" : q.difficulty === "medium" ? "var(--warning)" : "var(--success)";

  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": "Question",
    "name": q.question_text?.slice(0, 110),
    "text": q.question_text,
    "educationalLevel": q.difficulty,
    "about": { "@type": "Thing", "name": q.chapter ?? q.subject },
    "dateCreated": `${q.exam_year}-01-01`,
    "inLanguage": "en",
    ...(q.solution_text ? { "acceptedAnswer": { "@type": "Answer", "text": q.solution_text } } : {}),
  };

  const hasOptions = Array.isArray(q.options) && q.options.length > 0;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
      />
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-hairline)", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, background: "var(--bg-base)", zIndex: 10 }}>
          <Link href="/pyqs" style={{ color: "var(--text-tertiary)", textDecoration: "none", fontSize: 20 }}>←</Link>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--info)" }}>{examLabel} {q.exam_year}</div>
            {q.chapter && <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{q.chapter}</div>}
          </div>
        </div>

        <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 20px 80px" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {q.subject && <Chip label={q.subject} color="var(--info)" />}
            {q.difficulty && <Chip label={q.difficulty} color={diffColor} />}
            {q.mark_weight && <Chip label={`${q.mark_weight} marks`} color="var(--text-tertiary)" />}
            {(q.concepts ?? []).slice(0, 3).map(c => <Chip key={c} label={c} color="var(--text-tertiary)" />)}
          </div>

          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-hairline)", borderRadius: 12, padding: "20px 24px", marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>Question</div>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, color: "var(--text-primary)" }}>{q.question_text}</p>
          </div>

          {hasOptions ? (
            <TryYourselfClient options={q.options} correctAnswer={q.correct_answer} solution={q.solution_text} />
          ) : (
            q.solution_text && <SolutionBlock solution={q.solution_text} answer={q.correct_answer} />
          )}

          {similar.length > 0 && (
            <div style={{ marginTop: 40 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em" }}>Similar Questions</div>
              {similar.map(s => (
                <Link key={s.id} href={`/pyqs/${s.slug}`} style={{ textDecoration: "none" }}>
                  <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-hairline)", borderRadius: 10, padding: "12px 16px", marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>{s.exam_type?.replace(/_/g, " ").toUpperCase()} {s.exam_year}</div>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                      {s.question_text?.slice(0, 120)}{(s.question_text?.length ?? 0) > 120 ? "…" : ""}
                    </p>
                  </div>
                </Link>
              ))}
              <div style={{ marginTop: 20, background: "var(--bg-surface)", border: "1px solid var(--accent-dim)", borderRadius: 12, padding: "20px 24px", textAlign: "center" }}>
                <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--text-secondary)" }}>
                  Practice more <strong>{q.subject}</strong> from {examLabel}
                </p>
                <Link
                  href={`/pyqs?exam=${q.exam_type}&subject=${encodeURIComponent(q.subject ?? "")}`}
                  style={{ display: "inline-block", background: "var(--accent-grad)", color: "var(--bg-base)", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
                >
                  Browse Questions →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}