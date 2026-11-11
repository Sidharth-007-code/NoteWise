# NoteWise redesign: operating prompt for Codex

**How to use:** start every Codex run with this one line:

`Follow docs/redesign-prompt.md. RUN PHASE: N`   (N = 0 to 8)

Do exactly that one phase, then stop and report. Never start the next phase on your own.

You are redesigning the UI of NoteWise, an existing working app (React + TypeScript frontend, FastAPI backend, ChromaDB, SQLite, Groq). This is a REDESIGN, not a rewrite.

---

## Ground rules

- Work on branch `redesign` (create from main if missing). Never commit to main, never push, never force anything. One commit per phase: `redesign(phase N): <summary>`. Do not touch untracked backup files, .env, *.sqlite3, chroma_db/, node_modules, .venv.
- Verify the stack yourself. package.json and README indicate Create React App (react-scripts) with TypeScript, NOT Vite. Do not add Vite or restructure the build. If react-router-dom is not already a dependency, use a small state-based workspace switcher synced to the URL hash (#/library, #/tutor ...) instead of adding a router.
- Dependencies: approved are @fontsource packages (playfair-display, dm-sans, source-serif-4, jetbrains-mono; import only the needed weights, no CDN) and pdfjs-dist (phase 3, exact pinned version). Use what is installed otherwise (lucide-react; hand-rolled SVG for charts). Do not add Tailwind. List any dependency change in your report.
- You have no browser. Never claim anything looks right or works on screen. Report only what tests, build and scripts verified, and append what I must check by eye to `docs/redesign-qa.md` (a section per phase: numbered steps with expected results).
- No fake data anywhere: every number, list and chart comes from real backend data or real local UI state; otherwise show an honest empty state. Audit for existing hardcoded numbers (for example a "ChromaDB Storage 0.0 MB / 10 GB" meter or a "SOURCES SYNCED" counter) and replace with real data or remove.
- Do not reintroduce subject tags or categories (removed on purpose).
- API contracts: additive changes only, backward compatible, each justified in the report.

## Must not break (regression-check every phase)

- PDF upload / ingest / OCR, the document list, selecting a document scope, "Clear Scope", document deletion with confirmation and state reset.
- Tutor chat: Markdown, GFM, KaTeX, `<br>` normalisation, the truncated-answer note, greetings answered locally.
- Right-panel maximise/restore (Esc), the overlay offset below the header via `--nw-header-h`, the centered column, the pinned input, no horizontal overflow.
- All tab panes stay MOUNTED so chat, flashcard and quiz state survive tab switches and maximise.
- Flashcards (3D flip) and Concept Quiz (variable question count, balanced answer shuffle, per-option explanations, results with "Areas to Improve", retake). Version badge "1.0 test".
- All existing Jest tests (13) and backend tests (22) pass. jsdom 16 drops `var()` for `top` and normalises `flex: 1 1 0`, so assert such values through exported style helpers or constants.

---

## Design system

- Base: editorial flat UI. Soft skeuomorphism only as: paper surfaces (hairline border, two-layer soft shadow, faint CSS grain, no images), one raised treatment for the main flashcard and the selected segmented control. No neumorphic inputs. Glass only for overlays and popovers. No purple, neon, gradients or KPI tiles.
- Semantic CSS variables (light / dark) in `src/design/tokens.css`. Light values come from `docs/design/DESIGN.md`:
  `--nw-bg #F5F1E8`, `--nw-surface #FFFEFA`, `--nw-nav #293A34`, `--nw-text #292B29`, `--nw-text-muted #5E625C`, `--nw-border #D8CDBA`, `--nw-accent #7E5A44` (text, links, focus ring), `--nw-accent-fill #A5B69C` (fills and progress only, never text on light), `--nw-primary #293A34`.
  Dark values (sampled from the approved dark screens): bg `#171D1A`, surface `#202923`, topbar `#1C231F`, elevated `#2B352E`, nav `#293A34` (navigation stays Deep Forest in both themes), text `#F1F0E9`, muted `#B6B9AE`, accent `#A5B69C`, border `#3B473E`.
  Also define success, danger and warning tokens that pass the contrast script.
- ONE global theme (light / dark / system) via `data-theme` on `<html>`, persisted in localStorage, default system. Every workspace must work in both themes, even though the Stitch references show Tutor, Recall and Quiz only in dark.
- Fonts: headings Playfair Display, UI DM Sans, long reading Source Serif 4, code JetBrains Mono, all with fallback stacks.
- Add `frontend/scripts/check-contrast.mjs` and `npm run check:contrast`: it computes WCAG ratios for token pairs and fails below 4.5:1 for text and 3:1 for UI borders and large text. Run it every phase.

## Stitch reference (authoritative rules)

Files: `docs/design/DESIGN.md` is authoritative for typography, shape, elevation and the light palette. `docs/design/stitch/<screen>/<screen>.png` and `code.html` are VISUAL REFERENCE ONLY. Screens present: reader, library, reader-with-tutor, overview, ai-tutor, active-recall, concept-quiz. If progress and settings references are not present yet, design those two from DESIGN.md using the same system.

1. NEVER copy `code.html` into `src`. The mockups load Tailwind from a CDN, Google Fonts and Material Symbols. Use CSS variables, @fontsource and lucide-react. Do not add Tailwind.
2. DEFECTS TO FIX, NOT COPY: the wordmark contrast (about 1.5:1 on dark), the dim active nav label, the Reader top bar wrapping "Page 14 of 24", the Tutor input overlaying content (keep the existing pinned-input layout), and raw LaTeX (render all math through the existing KaTeX pipeline).
3. READER: render real PDF pages with pdfjs on a paper surface. The editorial typography applies to the UI chrome and to the extracted-text fallback view only. The docked Tutor reuses the real Tutor component, which stays mounted.
4. BUILD, using real data only:
   - Rail: only workspaces that exist. "New Note" becomes "Upload PDF". The footer shows the app version and "local" status. No user profile.
   - Top bar: breadcrumb "Workspace / document name". Search is a filename filter in Library; optionally a navigation command palette (workspaces and documents).
   - Library: catalogue rows with title, pages, upload date, status (Indexed / OCR applied / Uploading and indexing), Open in Reader, and delete with confirmation. The upload zone says PDF only, up to 20 MB. Upload progress is indeterminate: no percentage and no Cancel.
   - Overview: "Continue where you left off" = last opened document and page (localStorage), with "page x of y" and a percentage computed from it. Recent documents come from the real list. The suggested action is deterministic: flagged cards first, then no quiz taken yet, then reopen the last document.
   - Reader: page navigation, zoom, fit width, a table of contents ONLY when the PDF has an outline, a reading progress line, and "Ask about this page".
   - Tutor: scope header with Clear scope, source chips showing filename and page, copy answer, a real timestamp, and follow-up chips from FIXED generic prompts ("Explain more simply", "Give an example", "Quiz me on this"), never model-invented.
   - Recall: flip card, Review again / Remembered, "Card x of n", end of session, the flagged list and a revisit session. The deck summary (remembered / flagged / remaining) is derived from real session state. Keep the existing 3D flip.
   - Quiz: topic label, question progress, options A-D, per-option explanation, running "x / y correct so far", results with Areas to Improve, Retake. Keep the existing variable question count and balanced shuffle.
5. DO NOT BUILD: Cite, Annotate, New Note, share and bookmark buttons; BibTeX, DOI and citation keys; "Verified" badges; disciplines or courses (subject tags were removed on purpose) and the "Portfolios" section; spaced-repetition intervals, a Hard rating, mastery index, retention rate, confidence rating; "Flag for seminar", "Run Octave Verification"; synthesis notes and Evaluate; thumbs up/down; Rigour mode; Attach Excerpt; memory-allocation or corpus-synced meters; OCR percentage and Cancel for processing; "Previous Question" (unless the existing quiz state already supports it cheaply); page and equation references on quiz questions (the backend has none); user profiles.
6. If a screen conflicts with the contrast script or with existing behaviour, the constraints win. Note each deviation in the report.

---

## Phases

**Phase 0 (read-only).** Write `docs/redesign-plan.md`: verified stack facts; a component inventory with line counts; where selected-document, tab and maximise state live; every API the frontend calls; a table (workspace | existing UI | existing data | gaps and backend needs) for Overview, Library, Reader, Tutor, Recall, Quiz, Progress, Settings; how the current three-panel layout maps onto workspaces; the proposed structure (`src/design`, `src/components/ui`, `src/workspaces`); risks. Run baseline tsc, Jest, backend tests and `npm run build` and record the results. Change no code. STOP and wait for my approval of the plan.

**Phase 1 (design system and shell).** `tokens.css`, fonts, base typography, theme provider, the contrast script, UI primitives (Button, IconButton, Surface, Tag, SegmentedTabs, Modal, EmptyState, Skeleton) and an AppShell with a slim navigation rail. The rail lists only workspaces that already exist; later phases add their entries. Re-skin the existing screens through tokens without behaviour changes.

**Phase 2 (Cognitive Library).** Upload interaction, processing status, search by filename, per-document metadata (pages, upload date, OCR used), delete with confirmation, and empty / loading / error states, with real counts only. Add an additive nullable `created_at` column to `document_insights` (ALTER TABLE if missing, set on ingest; show "unknown" for older rows).

**Phase 3 (Document Workspace / reader).**
- Backend (additive): save the uploaded PDF to `backend/uploads/{document_id}.pdf` on ingest (add `uploads/` to .gitignore); `GET /api/documents/{id}/file` (404 if missing); `GET /api/documents/{id}/pages` (page texts from stored chunks); delete the file in the existing delete route.
- Frontend: pdfjs-dist canvas rendering (current page plus neighbours), a page input, zoom (fit width, 50-200%), keyboard navigation, a table of contents from the PDF outline only when present, reading progress (last page per document in localStorage), and a contextual "Ask about this page" action that opens the Tutor scoped to the document with a prefilled prompt. Documents uploaded before this change fall back to an extracted-text reading view. Mock pdfjs in Jest.
- Add backend tests for the new routes. Update the README privacy note (originals are now stored locally).

**Phase 4 (AI Tutor Studio).** Restyle the conversation, scope header, source chips, copy action, suggested follow-ups and the loading / error / empty states. Do not change retrieval or grounding behaviour.

**Phase 5 (study data layer: backend plus api.js, no UI).** SQLite tables `flashcard_review` (document_id, card key, status flagged|remembered, updated_at) and `study_events` (id, ts, type, document_id, payload_json). Endpoints: GET/PUT review state per document; POST `/api/study-events`; GET `/api/study/summary` (real aggregates only: active days, quiz attempts with score/total/missed topics, flashcards reviewed/flagged, per-document counts). Backend tests with temporary DBs; the delete route also clears that document's rows.

**Phase 6 (Active Recall and Concept Quiz).**
- Put the session logic in a pure, unit-tested module (`recallSession`): a session ends after the last card; "Review Again" flags persist through the API; after the end, show the flagged cards; "Start revisit session" runs only the flagged cards; "Remembered" unflags; state survives refresh. If the API fails, keep state in memory with a non-blocking notice.
- Keep the 3D flip (respect prefers-reduced-motion) and keyboard support (space to flip, arrows, 1/2).
- Quiz: restyle only and keep all existing behaviour. No gamification (no trophies or confetti). Post a study event on completion.

**Phase 7 (Overview, Learning Progress, Settings).**
- Overview: "continue studying" from the last opened document and workspace (localStorage), recent documents, the flagged-card count and last quiz result from the API, and a deterministic suggested action. No AI-written suggestions.
- Progress: hand-rolled SVG charts from `/api/study/summary`, honest empty states for new users, no fabricated metrics.
- Settings: theme, reading font size, and clear local data with confirmation.

**Phase 8 (responsive, accessibility, polish).** Check layouts at 1440, 1280, 1024, 768 and 390 (no horizontal overflow, no clipped controls); visible focus states; semantic landmarks, labels and roles; reduced motion; fix ESLint jsx-a11y warnings; remove only verified-unused CSS; update the README features and screenshot notes (keep "Version: 1.0 test") and list the screenshots to retake. Final full regression.

---

## Every phase

Run `npx tsc --noEmit`, the Jest suite (`$env:CI="true"`, cacheDirectory under %TEMP%), `npm run build`, `npm run check:contrast`, backend unittest discovery, and `py_compile` for changed Python files. If Jest hits EPERM in your sandbox, say so once and do not loop; I will run Jest locally. Check edited files for a UTF-8 BOM and run a secret scan on the diff before committing. Commit on `redesign`; do not push.

## Report format

Files changed; what was verified (commands and results); what was NOT verified; the steps added to `docs/redesign-qa.md`; deviations from the Stitch reference and why; dependencies changed; the commit hash. Then stop.
---

## Decisions after Phase 0 (authoritative)

1. Baseline: the owner ran Jest locally and all 13 tests pass. The Codex sandbox cannot run Jest (EPERM); the owner runs it after each phase.
2. Entry point: both `src/index.js` and `src/index.tsx` exist. Determine which one actually mounts the app (CRA's default module resolution may pick `index.js` over `index.tsx`). Put the ThemeProvider in the real entry and remove the unused one only if proven unused.
3. Tailwind is already present (dependency and directives in `index.css`). Do not remove it and do not extend it. New and re-skinned components use CSS files with token variables. In every file you touch, replace hardcoded colour utilities and hex values with tokens and report how many remain in the report.
4. Study state: keep RightPanel as one mounted component until Phase 4. Workspace switching hides it and never unmounts it. When Tutor, Recall and Quiz become separate workspaces (Phases 4 and 6), lift their state into a shared provider (context plus reducer) so chat, flashcard and quiz state survive workspace switches and the Reader's docked Tutor shares the Tutor's chat. Add tests for state surviving workspace switches. Library, Reader, Overview, Progress and Settings may mount on demand.
5. Phase 1 rail: list only "Study" (the current three-panel layout, unchanged behaviour). Add a temporary light / dark / system toggle in the rail footer so both themes are checkable now; it moves into Settings in Phase 7.
6. Phase 2 must add an additive `GET /api/documents` (from SQLite `document_insights`: document_id, filename, page_count, ocr_used, extracted_pages, created_at nullable, has_overview, has_flashcards) and hydrate the Library from it on startup, because uploads currently vanish from the UI on refresh. Retire the unused legacy helpers (`getDocuments` to `/documents`, `askQuestion` to `/ask`) once nothing imports them. Add backend tests.
7. The generated document overview (summary, key topics, important concepts, topic summaries with pages) is an existing feature and must be kept. Until Phase 3 it stays in the current centre pane. From Phase 3 it lives in the Reader's left rail as an "Overview" tab beside "Contents" (the PDF outline, shown only when the PDF has one); topic page chips jump to that page.
8. Remove the hardcoded storage meter ("ChromaDB Storage 0.0 MB / 10 GB" and similar). If something is shown instead, use real data only (for example the document count).
9. Dead code (`ActiveRecallStudio.js`, `ChatWidget.js`, template assets, `CommandPalette.js`): leave untouched in Phases 1 to 7. In Phase 8, delete a file only after grep and the test suite confirm nothing imports it. `CommandPalette` may be reused for navigation earlier if it fits.