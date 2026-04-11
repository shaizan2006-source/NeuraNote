import { NextResponse } from "next/server";
import MarkdownIt from "markdown-it";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import { createClient } from "@supabase/supabase-js";

// ── Parser ────────────────────────────────────────────────────────────
const md = new MarkdownIt({ html: false, breaks: false, linkify: false });

// ── Supabase ──────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Deduplication ─────────────────────────────────────────────────────
function cleanContent(raw) {
  const lines = raw.split("\n");
  const out = [];
  let prev = "";
  let blankRun = 0;
  for (const line of lines) {
    const t = line.trim();
    if (t === "") {
      blankRun++;
      if (blankRun <= 1) out.push("");
    } else {
      blankRun = 0;
      if (t !== prev) { out.push(line); prev = t; }
    }
  }
  return out.join("\n").trim();
}

// ── Design tokens ─────────────────────────────────────────────────────
const ACCENT  = "#7c3aed";
const BORDER  = "#e2e8f0";
const TEXT    = "#1a202c";
const MUTED   = "#718096";
const SURFACE = "#f7fafc";

// ── Styles ────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 72,
    paddingHorizontal: 60,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: TEXT,
    backgroundColor: "#ffffff",
  },
  // ── Document header
  header: {
    marginBottom: 32,
    paddingBottom: 18,
    borderBottomWidth: 2,
    borderBottomColor: ACCENT,
    borderStyle: "solid",
  },
  headerLabel: {
    fontSize: 8,
    color: ACCENT,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: TEXT,
    lineHeight: 1.3,
    marginBottom: 6,
  },
  headerMeta: {
    fontSize: 9,
    color: MUTED,
  },
  // ── Headings
  h1: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: TEXT,
    marginTop: 30,
    marginBottom: 10,
    paddingBottom: 7,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    borderStyle: "solid",
    lineHeight: 1.35,
  },
  h2: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: TEXT,
    marginTop: 24,
    marginBottom: 8,
    lineHeight: 1.4,
  },
  h3: {
    fontSize: 11.5,
    fontFamily: "Helvetica-Bold",
    color: "#2d3748",
    marginTop: 18,
    marginBottom: 6,
    lineHeight: 1.4,
  },
  // ── Body
  p: {
    fontSize: 11,
    lineHeight: 1.75,
    color: TEXT,
    marginBottom: 10,
  },
  // ── Lists
  listBlock: {
    marginTop: 4,
    marginBottom: 14,
  },
  listRow: {
    flexDirection: "row",
    marginBottom: 7,
    paddingLeft: 4,
  },
  bullet: {
    width: 14,
    fontSize: 10,
    color: ACCENT,
    lineHeight: 1.75,
  },
  orderedBullet: {
    width: 20,
    fontSize: 10,
    color: MUTED,
    lineHeight: 1.75,
    fontFamily: "Helvetica-Bold",
  },
  listText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 1.7,
    color: TEXT,
  },
  // ── Code
  codeBlock: {
    backgroundColor: SURFACE,
    borderLeftWidth: 3,
    borderLeftColor: ACCENT,
    borderStyle: "solid",
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 3,
  },
  codeText: {
    fontFamily: "Courier",
    fontSize: 9.5,
    color: "#2d3748",
    lineHeight: 1.55,
  },
  // ── Inline
  bold:       { fontFamily: "Helvetica-Bold" },
  italic:     { fontFamily: "Helvetica-Oblique" },
  inlineCode: { fontFamily: "Courier", fontSize: 10, color: ACCENT },
  // ── Blockquote
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: BORDER,
    borderStyle: "solid",
    paddingLeft: 12,
    paddingVertical: 6,
    marginVertical: 8,
    backgroundColor: SURFACE,
    borderRadius: 2,
  },
  blockquoteText: {
    fontSize: 11,
    lineHeight: 1.65,
    color: MUTED,
    fontFamily: "Helvetica-Oblique",
  },
  // ── Divider
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    borderStyle: "solid",
    marginVertical: 16,
  },
  // ── Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 60,
    right: 60,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerLeft:  { fontSize: 8, color: MUTED },
  footerRight: { fontSize: 8, color: ACCENT, fontFamily: "Helvetica-Bold" },
});

// ── Inline renderer ───────────────────────────────────────────────────
function renderInline(tok) {
  if (!tok?.children?.length) {
    return tok?.content ? [<Text key="raw">{tok.content}</Text>] : [];
  }
  const out = [];
  const ch = tok.children;
  for (let i = 0; i < ch.length; i++) {
    const t = ch[i];
    if (t.type === "text") {
      out.push(<Text key={i}>{t.content}</Text>);
    } else if (t.type === "softbreak" || t.type === "hardbreak") {
      out.push(<Text key={i}>{"\n"}</Text>);
    } else if (t.type === "strong_open") {
      let txt = "";
      i++;
      while (i < ch.length && ch[i].type !== "strong_close") { txt += ch[i].content || ""; i++; }
      if (txt) out.push(<Text key={i} style={S.bold}>{txt}</Text>);
    } else if (t.type === "em_open") {
      let txt = "";
      i++;
      while (i < ch.length && ch[i].type !== "em_close") { txt += ch[i].content || ""; i++; }
      if (txt) out.push(<Text key={i} style={S.italic}>{txt}</Text>);
    } else if (t.type === "code_inline") {
      out.push(<Text key={i} style={S.inlineCode}>{t.content}</Text>);
    }
  }
  return out.length ? out : [<Text key="fb">{tok.content}</Text>];
}

// ── Token → PDF elements ──────────────────────────────────────────────
function buildElements(tokens, docTitle) {
  const elements = [];
  let listItems   = [];
  let isOrdered   = false;
  let ordNum      = 0;

  function flushList(key) {
    if (!listItems.length) return;
    elements.push(<View key={`list-${key}`} style={S.listBlock}>{listItems}</View>);
    listItems = [];
    ordNum = 0;
  }

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];

    // List open/close
    if (tok.type === "bullet_list_open")  { isOrdered = false; continue; }
    if (tok.type === "ordered_list_open") { isOrdered = true; ordNum = 0; continue; }
    if (tok.type === "bullet_list_close" || tok.type === "ordered_list_close") {
      flushList(i); continue;
    }

    // Heading
    if (tok.type === "heading_open") {
      flushList(i);
      const inline = tokens[i + 1];
      i += 2; // skip inline + heading_close
      if (!inline) continue;
      // Skip H1 if it duplicates the doc header title
      if (tok.tag === "h1" && inline.content === docTitle) continue;
      const el = renderInline(inline);
      if      (tok.tag === "h1") elements.push(<Text key={i} style={S.h1}>{el}</Text>);
      else if (tok.tag === "h2") elements.push(<Text key={i} style={S.h2}>{el}</Text>);
      else if (tok.tag === "h3") elements.push(<Text key={i} style={S.h3}>{el}</Text>);
      continue;
    }

    // Paragraph
    if (tok.type === "paragraph_open") {
      flushList(i);
      const inline = tokens[i + 1];
      i += 2;
      if (!inline) continue;
      elements.push(<Text key={i} style={S.p}>{renderInline(inline)}</Text>);
      continue;
    }

    // List item
    if (tok.type === "list_item_open") {
      ordNum++;
      let inline = null;
      for (let j = i + 1; j < tokens.length; j++) {
        if (tokens[j].type === "list_item_close") break;
        if (tokens[j].type === "inline") { inline = tokens[j]; break; }
      }
      if (inline) {
        const bulletText  = isOrdered ? `${ordNum}.` : "•";
        const bulletStyle = isOrdered ? S.orderedBullet : S.bullet;
        listItems.push(
          <View key={`li-${i}`} style={S.listRow}>
            <Text style={bulletStyle}>{bulletText}</Text>
            <Text style={S.listText}>{renderInline(inline)}</Text>
          </View>
        );
      }
      continue;
    }

    // Fenced / indented code block
    if (tok.type === "fence" || tok.type === "code_block") {
      flushList(i);
      elements.push(
        <View key={i} style={S.codeBlock}>
          <Text style={S.codeText}>{tok.content.trim()}</Text>
        </View>
      );
      continue;
    }

    // Blockquote
    if (tok.type === "blockquote_open") {
      flushList(i);
      for (let j = i + 1; j < tokens.length; j++) {
        if (tokens[j].type === "blockquote_close") { i = j; break; }
        if (tokens[j].type === "inline") {
          elements.push(
            <View key={i} style={S.blockquote}>
              <Text style={S.blockquoteText}>{renderInline(tokens[j])}</Text>
            </View>
          );
        }
      }
      continue;
    }

    // Horizontal rule
    if (tok.type === "hr") {
      flushList(i);
      elements.push(<View key={i} style={S.divider} />);
      continue;
    }
  }

  flushList("end");
  return elements;
}

// ── PDF Document ──────────────────────────────────────────────────────
function StudyDoc({ title, date, bodyElements }) {
  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* Document header */}
        <View style={S.header}>
          <Text style={S.headerLabel}>ASK MY NOTES</Text>
          <Text style={S.headerTitle}>{title}</Text>
          <Text style={S.headerMeta}>{date}</Text>
        </View>

        {/* Body */}
        <View>{bodyElements}</View>

        {/* Page footer */}
        <View style={S.footer} fixed>
          <Text style={S.footerLeft}>Generated by Ask My Notes</Text>
          <Text
            style={S.footerRight}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>

      </Page>
    </Document>
  );
}

// ── Route handler ─────────────────────────────────────────────────────
export async function POST(req) {
  try {
    const { content, type, filename } = await req.json();
    if (!content || type !== "pdf") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Clean and deduplicate markdown
    const cleaned = cleanContent(content);

    // Parse
    const tokens = md.parse(cleaned, {});

    // Extract document title from first H1 (fallback: filename or default)
    let docTitle = "Study Notes";
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type === "heading_open" && tokens[i].tag === "h1" && tokens[i + 1]) {
        docTitle = tokens[i + 1].content;
        break;
      }
    }
    if (filename && docTitle === "Study Notes") docTitle = filename;

    const date = new Date().toLocaleDateString("en-GB", {
      day: "numeric", month: "long", year: "numeric",
    });

    const bodyElements = buildElements(tokens, docTitle);
    const doc = <StudyDoc title={docTitle} date={date} bodyElements={bodyElements} />;
    const pdfBuffer = await pdf(doc).toBuffer();

    // Upload to Supabase Storage
    const safeName = `${Date.now()}-notes`;
    const filePath = `exports/${safeName}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, pdfBuffer, { contentType: "application/pdf", upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("documents").getPublicUrl(filePath);
    return NextResponse.json({ downloadUrl: data.publicUrl });

  } catch (error) {
    console.error("PDF GENERATION ERROR:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
