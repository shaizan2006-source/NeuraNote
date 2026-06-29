/**
 * Canonical PYQ option/answer normalization (pure — safe on client AND server).
 *
 * The PYQ dataset is produced externally, so its exact shape isn't guaranteed. This
 * normalizer accepts the realistic shapes and returns ONE canonical form so every
 * consumer (PYQ practice, PYQ detail, Mock Test render + scoring) renders and scores
 * identically:
 *
 *   options      -> [{ key: "A", text: "..." }, ...]   (key = A/B/C/D…, text = bare option)
 *   correctKey   -> "A"                                  (the canonical correct letter)
 *
 * Accepted raw `options` shapes:
 *   - ["A) Force", "B) Mass", ...]            (letter-prefixed strings)
 *   - ["Force", "Mass", ...]                  (bare strings — index → A/B/C/D)
 *   - [{ key:"A", text:"Force" }, ...]         (already structured; key|label|value/text)
 *   - { a:"Force", b:"Mass", ... } / {A:..,B:..}(object map)
 *
 * Accepted raw `correct_answer`:
 *   - "A"  |  "a"  |  "A) Force"  |  "2" (1-based) | "Force" (full option text)
 *
 * RECOMMENDED ingest format (for the dataset author): options as ["A) ...","B) ..."]
 * (or [{key,text}]) and correct_answer as the bare letter "A". The normalizer is
 * forgiving, but matching this avoids any ambiguity.
 */

const LETTERS = "ABCDEFGHIJ";

function stripPrefix(s) {
  // "A) Force" / "A. Force" / "A - Force" / "(A) Force" -> { key:"A", text:"Force" }
  const m = String(s).match(/^\s*\(?\s*([A-Ja-j])\s*[).:\-\]]\s*(.*)$/s);
  if (m) return { key: m[1].toUpperCase(), text: m[2].trim() };
  return null;
}

export function normalizeOptions(rawOptions) {
  if (!rawOptions) return [];

  if (Array.isArray(rawOptions)) {
    return rawOptions
      .filter((o) => o != null)
      .map((opt, i) => {
        const fallbackKey = LETTERS[i] || String(i + 1);
        if (typeof opt === "object") {
          const key = String(opt.key ?? opt.label ?? fallbackKey).trim().toUpperCase().slice(0, 1) || fallbackKey;
          return { key, text: String(opt.text ?? opt.value ?? opt.label ?? "").trim() };
        }
        const pref = stripPrefix(opt);
        if (pref) return pref;
        return { key: fallbackKey, text: String(opt).trim() };
      });
  }

  if (typeof rawOptions === "object") {
    return Object.entries(rawOptions)
      .map(([k, v]) => ({ key: String(k).trim().toUpperCase().slice(0, 1), text: String(v ?? "").trim() }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }

  return [];
}

export function normalizeCorrectKey(rawAnswer, options) {
  if (rawAnswer == null) return null;
  const a = String(rawAnswer).trim();
  if (!a) return null;

  // Bare letter
  if (/^[A-Ja-j]$/.test(a)) return a.toUpperCase();

  // Letter-prefixed ("A) ...")
  const pref = stripPrefix(a);
  if (pref) return pref.key;

  // Numeric index (assume 1-based if it lands in range, else 0-based)
  if (/^\d+$/.test(a)) {
    const n = parseInt(a, 10);
    const idx = n >= 1 && n <= options.length ? n - 1 : n;
    return options[idx]?.key ?? null;
  }

  // Full option text → match to a key
  const byText = options.find((o) => o.text.toLowerCase() === a.toLowerCase());
  if (byText) return byText.key;

  // Last resort: first character upper-cased
  return a.toUpperCase().slice(0, 1);
}

export function normalizeQuestion(q) {
  if (!q) return q;
  const options = normalizeOptions(q.options);
  return { ...q, options, correctKey: normalizeCorrectKey(q.correct_answer, options) };
}
