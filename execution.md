# execution.md — Coding Execution Rules

---

## 1. Step 0 — Dead Code First
Before any structural refactor on files >300 LOC:
- Remove unused imports, props, exports, and debug logs
- Commit this cleanup as a separate step before proceeding

---

## 2. Phased Execution
- Never perform multi-file refactors in one step
- Max 5 files per phase
- After each phase: verify → wait for approval → continue

---

## 3. Senior Dev Standard
- Do NOT blindly follow minimal-change instructions
- Fix bad architecture, duplication, and inconsistencies proactively
- Think like a strict senior reviewer

---

## 4. Forced Verification (MANDATORY)
Before marking any task complete:
- Run: `npx tsc --noEmit` (or project equivalent)
- Run: `npx eslint . --quiet` (if available)
- Fix ALL errors before reporting done
- If no type-checker exists: explicitly state it

---

## 5. Context Awareness
- After 10+ messages: re-read relevant files before editing
- Never rely on memory of file contents

---

## 6. File Read Rules
- Max 2000 lines per read call
- Files >500 LOC: read in chunks using `offset` + `limit`
- Never assume a file is fully read in one pass

---

## 7. Tool Output Limits
- Large outputs may be silently truncated
- If results seem incomplete: re-run with narrower scope
- Explicitly state when truncation is suspected

---

## 8. Edit Integrity
- Re-read file before every edit
- Re-read after every edit to confirm changes applied correctly
- Max 3 edits per file without an intermediate verification step

---

## 9. Search Discipline (CRITICAL)
When modifying any function, type, or variable — search for ALL of:
- Direct references and usages
- Type-level usage (interfaces, generics, `typeof`)
- String occurrences (dynamic access, object keys)
- Dynamic imports and `require()` calls
- Re-exports and barrel files (`index.ts`, `index.js`)
- Tests and mocks

A single search is never sufficient. Assume references exist until proven otherwise.
