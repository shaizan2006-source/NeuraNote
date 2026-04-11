# Graph Report - .  (2026-04-11)

## Corpus Check
- 147 files · ~151,647 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 404 nodes · 480 edges · 54 communities detected
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `POST()` - 16 edges
2. `DesignSystemGenerator` - 11 edges
3. `_search_csv()` - 9 edges
4. `BM25` - 8 edges
5. `normaliseBlock()` - 7 edges
6. `derive_row()` - 7 edges
7. `generate_design_system()` - 7 edges
8. `classifyQuery()` - 6 edges
9. `installFromZip()` - 6 edges
10. `ErrorBoundary` - 5 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `detectConfusion()`  [EXTRACTED]
  app\api\weak-topics\route.js → app\api\ask-ai\route.js
- `POST()` --calls--> `detectExportIntent()`  [EXTRACTED]
  app\api\weak-topics\route.js → app\api\ask-ai\route.js
- `POST()` --calls--> `buildCacheKey()`  [EXTRACTED]
  app\api\weak-topics\route.js → app\api\ask\route.js
- `POST()` --calls--> `getCachedAnswer()`  [EXTRACTED]
  app\api\weak-topics\route.js → app\api\ask\route.js
- `POST()` --calls--> `cleanContent()`  [EXTRACTED]
  app\api\weak-topics\route.js → app\api\generate-document\route.js

## Hyperedges (group relationships)
- **Design System Generation Pipeline** — readme_multi_domain_search, readme_reasoning_engine, readme_design_system_generator [EXTRACTED 1.00]
- **Three-Location Sync Pattern** — claude_md_source_of_truth, docs_symlink_pattern, claude_md_sync_rule [EXTRACTED 1.00]
- **Template Content Duplication** — src_quick_ref_rule_categories, quick_ref_cli_rule_categories, src_skill_content_workflow [INFERRED 0.88]

## Communities

### Community 0 - "Dashboard UI & State"
Cohesion: 0.05
Nodes (5): CardVisual(), scoreColor(), scoreLabel(), isSunday(), WeeklyRecapCard()

### Community 1 - "AI Chat & Query Pipeline"
Cohesion: 0.08
Nodes (18): buildCacheKey(), buildElements(), buildSystemPrompt(), cleanContent(), detectConfusion(), detectExportIntent(), detectWeakIntent(), extractTopicsWithAI() (+10 more)

### Community 2 - "UI Component Library"
Cohesion: 0.05
Nodes (5): ErrorBoundary, checkMilestones(), persist(), CallTutorPage(), fmtTime()

### Community 3 - "Design System Generator"
Cohesion: 0.09
Nodes (25): DesignSystemGenerator, _detect_page_type(), format_ascii_box(), format_markdown(), format_master_md(), format_page_override_md(), generate_design_system(), _generate_intelligent_overrides() (+17 more)

### Community 4 - "BM25 Search Core"
Cohesion: 0.08
Nodes (26): BM25, detect_domain(), _load_csv(), Build BM25 index from documents, BM25 ranking algorithm for text search, Lowercase, split, remove punctuation, filter short words, Score all documents against query, Build BM25 index from documents (+18 more)

### Community 5 - "UX Pro Max CLI Docs"
Cohesion: 0.08
Nodes (28): cli/ (npm uipro-cli Installer), search.py CLI Entry Point, src/ui-ux-pro-max/ (Source of Truth), Sync Rule: src to cli/assets, Bundled Assets (~564KB), Offline Mode (--offline flag), uipro-cli Package (CLI README), Symlink Pattern (.claude to src) (+20 more)

### Community 6 - "Answer Display Components"
Cohesion: 0.09
Nodes (2): AnswerSection(), hexToRgba()

### Community 7 - "Data Sync Scripts"
Cohesion: 0.29
Nodes (13): blend(), derive_row(), derive_ui_reasoning(), h2r(), is_dark(), lum(), on_color(), r2h() (+5 more)

### Community 8 - "Plan Limits & Quotas"
Cohesion: 0.24
Nodes (7): canAskQuestion(), canUploadPDF(), countTodayQA(), countUserPDFs(), getUserPlan(), canStartCall(), countTodayCalls()

### Community 9 - "Template Generation"
Cohesion: 0.33
Nodes (9): copyDataAndScripts(), exists(), generateAllPlatformFiles(), generatePlatformFiles(), loadAllPlatformConfigs(), loadPlatformConfig(), loadTemplate(), renderFrontmatter() (+1 more)

### Community 10 - "GitHub Release Integration"
Cohesion: 0.27
Nodes (6): checkRateLimit(), downloadRelease(), fetchReleases(), getLatestRelease(), GitHubDownloadError, GitHubRateLimitError

### Community 11 - "Answer Templates & Badges"
Cohesion: 0.25
Nodes (2): buildTooltip(), ConfidenceBadge()

### Community 12 - "Auth Rate Limiting"
Cohesion: 0.25
Nodes (0): 

### Community 13 - "Markdown Processing"
Cohesion: 0.5
Nodes (7): buildSeparator(), isSeparatorRow(), joinRow(), looksLikeNumberingHeader(), normaliseBlock(), normalizeMarkdownTables(), splitRow()

### Community 14 - "Extract Utilities"
Cohesion: 0.46
Nodes (7): cleanup(), copyFolders(), createTempDir(), exists(), extractZip(), findExtractedRoot(), installFromZip()

### Community 15 - "Query Classifier"
Cohesion: 0.52
Nodes (6): classifyQuery(), detectLanguage(), detectMarks(), detectQuestionType(), inferDifficulty(), scoreDomains()

### Community 16 - "Brain & Mastery Section"
Cohesion: 0.47
Nodes (3): LEVEL(), TopicCard(), TopicRow()

### Community 17 - "CLI Init Command"
Cohesion: 0.83
Nodes (3): initCommand(), templateInstall(), tryGitHubInstall()

### Community 18 - "Layout Components"
Cohesion: 0.67
Nodes (0): 

### Community 19 - "Answer Rating"
Cohesion: 1.0
Nodes (2): AnswerRating(), ratingBtnStyle()

### Community 20 - "Dynamic Follow-Ups"
Cohesion: 1.0
Nodes (2): buildChips(), DynamicFollowUps()

### Community 21 - "Session Callout"
Cohesion: 0.67
Nodes (0): 

### Community 22 - "Ask With Download"
Cohesion: 1.0
Nodes (2): askQuestion(), extractFilename()

### Community 23 - "CLI Uninstall"
Cohesion: 1.0
Nodes (2): removeSkillDir(), uninstallCommand()

### Community 24 - "AI Type Detection"
Cohesion: 0.67
Nodes (0): 

### Community 25 - "Dev Proxy"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "AI Suggestion Card"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Ask Input"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Brain Card"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "App Layout"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Right Panel"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Sidebar"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Text Chunking"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Export Intent Detection"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Topic Detection"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Domain Prompt Index"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "CLI Update Command"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "CLI Versions Command"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Supabase Client"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Supabase Server"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Base Prompt"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Biology Domain"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Business Domain"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Chemistry Domain"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "CS Domain"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Electrical Domain"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Finance Domain"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "General Domain"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Law Domain"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Mechanical Domain"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Medical Domain"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "Physics Domain"
Cohesion: 1.0
Nodes (0): 

### Community 52 - "CLI Logger"
Cohesion: 1.0
Nodes (0): 

### Community 53 - "CLAUDE.md Config"
Cohesion: 1.0
Nodes (1): Antigravity Kit (CLAUDE.md Project Overview)

## Knowledge Gaps
- **49 isolated node(s):** `Generate full 16-token color row from 4 base colors.`, `Generate ui-reasoning row from products.csv row.`, `BM25 ranking algorithm for text search`, `Lowercase, split, remove punctuation, filter short words`, `Build BM25 index from documents` (+44 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Dev Proxy`** (2 nodes): `proxy.js`, `proxy()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `AI Suggestion Card`** (2 nodes): `AISuggestionCard.jsx`, `AISuggestionCard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Ask Input`** (2 nodes): `AskInput.jsx`, `AskInput()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Brain Card`** (2 nodes): `BrainCard.jsx`, `BrainCard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `App Layout`** (2 nodes): `AppLayout.jsx`, `AppLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Right Panel`** (2 nodes): `RightPanel.jsx`, `RightPanel()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Sidebar`** (2 nodes): `Sidebar.jsx`, `Sidebar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Text Chunking`** (2 nodes): `chunkText.js`, `chunkText()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Export Intent Detection`** (2 nodes): `detectExportIntent.js`, `detectExportIntent()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Topic Detection`** (2 nodes): `detectTopic.js`, `detectTopic()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Domain Prompt Index`** (2 nodes): `index.ts`, `getDomainPrompt()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `CLI Update Command`** (2 nodes): `update.ts`, `updateCommand()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `CLI Versions Command`** (2 nodes): `versions.ts`, `versionsCommand()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Supabase Client`** (1 nodes): `supabase.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Supabase Server`** (1 nodes): `supabaseServer.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Base Prompt`** (1 nodes): `base.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Biology Domain`** (1 nodes): `biology.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Business Domain`** (1 nodes): `business.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Chemistry Domain`** (1 nodes): `chemistry.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `CS Domain`** (1 nodes): `cs.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Electrical Domain`** (1 nodes): `electrical.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Finance Domain`** (1 nodes): `finance.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `General Domain`** (1 nodes): `general.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Law Domain`** (1 nodes): `law.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Mechanical Domain`** (1 nodes): `mechanical.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Medical Domain`** (1 nodes): `medical.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Physics Domain`** (1 nodes): `physics.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `CLI Logger`** (1 nodes): `logger.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `CLAUDE.md Config`** (1 nodes): `Antigravity Kit (CLAUDE.md Project Overview)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `Generate full 16-token color row from 4 base colors.`, `Generate ui-reasoning row from products.csv row.`, `BM25 ranking algorithm for text search` to the rest of the system?**
  _49 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Dashboard UI & State` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `AI Chat & Query Pipeline` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `UI Component Library` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Design System Generator` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `BM25 Search Core` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `UX Pro Max CLI Docs` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._