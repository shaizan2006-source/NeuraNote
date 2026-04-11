// ──────────────────────────────────────────────────────────────
// normalizeMarkdownTables
// Defensive repair pass for AI-generated Markdown tables.
//
// Fixes:
//   - Missing separator row (|---|---|...|) after the header
//   - Ragged rows (column count != header) → pad with "—"
//   - Empty cells → replace with "—"
//   - Missing S.No. column → auto-prepend "S.No." with sequential numbers
//
// Idempotent: running the function on already-normalised input
// returns it unchanged. Safe on streaming input — incomplete trailing
// table blocks (no terminating blank line) are left untouched.
// ──────────────────────────────────────────────────────────────

const NUMBERING_HEADERS = new Set([
  's.no', 's.no.', 'sno', 'sr.', 'sr', 'sr.no', 'sr.no.', 'sl.', 'sl', 'sl.no',
  'no.', 'no', '#', 'id', 'serial', 'serial no', 'serial no.', 'rank',
]);

function isSeparatorRow(line) {
  // |---|---|  or  | :---: | ---: |  etc.
  if (!line.includes('|')) return false;
  const cells = splitRow(line);
  if (cells.length === 0) return false;
  return cells.every((c) => /^:?-{2,}:?$/.test(c.trim()));
}

function splitRow(line) {
  // Strip leading/trailing pipe and split. Preserves intentional empty cells.
  let l = line.trim();
  if (l.startsWith('|')) l = l.slice(1);
  if (l.endsWith('|'))   l = l.slice(0, -1);
  return l.split('|').map((c) => c.trim());
}

function joinRow(cells) {
  return '| ' + cells.join(' | ') + ' |';
}

function buildSeparator(colCount) {
  return '|' + Array(colCount).fill('---').join('|') + '|';
}

function looksLikeNumberingHeader(headerCell) {
  return NUMBERING_HEADERS.has(headerCell.toLowerCase().replace(/\s+/g, ''));
}

/**
 * Normalise a single table block (array of consecutive `|`-prefixed lines).
 * Returns the repaired array of lines.
 */
function normaliseBlock(blockLines) {
  if (blockLines.length < 2) return blockLines; // Not really a table

  const headerCells = splitRow(blockLines[0]);
  if (headerCells.length < 2) return blockLines; // single-column "table" — skip

  // Detect or insert separator row
  let separatorIdx = isSeparatorRow(blockLines[1]) ? 1 : -1;
  let dataStart = separatorIdx === 1 ? 2 : 1;

  // Parse data rows
  const dataRows = blockLines.slice(dataStart).map(splitRow);

  // ── Pad ragged rows to header column count ───────────────────
  const colCount = headerCells.length;
  const paddedDataRows = dataRows.map((row) => {
    const padded = [...row];
    while (padded.length < colCount) padded.push('—');
    if (padded.length > colCount) padded.length = colCount;
    return padded.map((c) => (c.length === 0 ? '—' : c));
  });

  // ── Auto-prepend S.No. if missing ───────────────────────────
  // Trigger when:
  //   - first column header is NOT already a numbering term
  //   - there are ≥ 2 data rows (a real table, not a 1-row legend)
  const firstHeader = headerCells[0] || '';
  const shouldPrependSNo =
    !looksLikeNumberingHeader(firstHeader) &&
    paddedDataRows.length >= 2;

  let finalHeader = headerCells;
  let finalDataRows = paddedDataRows;

  if (shouldPrependSNo) {
    finalHeader = ['S.No.', ...headerCells];
    finalDataRows = paddedDataRows.map((row, i) => [String(i + 1), ...row]);
  } else if (looksLikeNumberingHeader(firstHeader)) {
    // Renumber existing numbering column to ensure 1..N sequential
    finalDataRows = paddedDataRows.map((row, i) => {
      const next = [...row];
      next[0] = String(i + 1);
      return next;
    });
  }

  const finalColCount = finalHeader.length;

  // ── Reassemble ───────────────────────────────────────────────
  const out = [];
  out.push(joinRow(finalHeader));
  out.push(buildSeparator(finalColCount));
  for (const row of finalDataRows) {
    out.push(joinRow(row));
  }
  return out;
}

/**
 * Walk the markdown line-by-line. Group contiguous lines beginning with `|`
 * into table blocks, normalise each, and stitch the document back together.
 *
 * Streaming safety: if the very last line of input is a `|` line and the
 * markdown does not end with a newline, the trailing block is treated as
 * "still streaming" and left untouched until the next chunk arrives.
 */
export function normalizeMarkdownTables(markdown) {
  if (!markdown || typeof markdown !== 'string') return markdown;
  if (!markdown.includes('|')) return markdown; // fast path

  const endsWithNewline = markdown.endsWith('\n');
  const lines = markdown.split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const isTableLine = /^\s*\|/.test(line);

    if (!isTableLine) {
      out.push(line);
      i++;
      continue;
    }

    // Collect contiguous table block
    const block = [];
    let j = i;
    while (j < lines.length && /^\s*\|/.test(lines[j])) {
      block.push(lines[j]);
      j++;
    }

    const isLastBlock = j === lines.length;
    const stillStreaming = isLastBlock && !endsWithNewline;

    if (stillStreaming || block.length < 2) {
      // Leave untouched: incomplete during stream, or not enough rows
      out.push(...block);
    } else {
      out.push(...normaliseBlock(block));
    }

    i = j;
  }

  return out.join('\n');
}
