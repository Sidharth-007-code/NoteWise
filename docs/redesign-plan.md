# NoteWise redesign plan

## Verified stack and baseline

- The frontend is Create React App using `react-scripts` 5.0.1, React 18.3.1 and TypeScript 4.9.5. `npm start`, `npm test`, and `npm run build` are CRA scripts; there is no Vite or `react-router-dom` dependency. The existing `tailwindcss` dependency is present, but the redesign will not add Tailwind usage or another router.
- The backend is FastAPI in `backend/main.py`; it uses ChromaDB for indexed chunks, SQLite for cached document insights, and Groq for model-backed answers and study content.
- Active branch: `redesign` (already exists). No application or dependency files were changed in Phase 0.
- Baseline `npx tsc --noEmit`: passed with 0 errors.
- Baseline Jest suite: passed (3 test suites passed, 13 tests passed, 0 failed; verified in terminal on owner's machine).
- Baseline `npm run build`: passed; CRA compiled successfully. Reported gzip sizes: JS 183.86 kB and CSS 11.79 kB.
- Baseline development compilation: successful.
- Baseline backend `..\\.venv\\Scripts\\python.exe -m unittest discover -p "test_*.py" -v`: passed, 22 tests in 0.72s.
- Baseline `npm run check:contrast`: unavailable because the script does not yet exist (`Missing script: check:contrast`). Phase 1 will add the script and its implementation.

## Frontend component inventory

Line counts are source line counts at the Phase 0 baseline; generated build output and the explicitly protected `*.before-rate-limit-fix` backup files are excluded.

| File | Lines | Current responsibility |
|---|---:|---|
| `src/App.tsx` | 459 | Top header/navigation, selected document and overview, three-panel workspace, routing between tutor/recall tabs |
| `src/App.css` | 278 | App and workspace styling |
| `src/index.css` | 117 | Global styles and Tailwind directives |
| `src/api.js` | 76 | HTTP helpers for upload, document resources, query, delete, and legacy routes |
| `src/index.js` | 11 | CRA JavaScript entry (legacy/minimal entry) |
| `src/index.tsx` | 17 | TypeScript React mount entry |
| `src/setupTests.js` | 28 | Jest/jsdom setup and browser API stubs |
| `src/components/LeftPanel.js` | 201 | PDF upload, uploaded-document list, selection, delete confirmation, storage display |
| `src/components/LeftPanel.test.jsx` | 52 | Upload and document-removal behavior tests |
| `src/components/RightPanel.js` | 651 | Tutor, recall, quiz panes; chat/flashcard state; maximise/restore overlay |
| `src/components/RightPanel.test.jsx` | 220 | Tutor, recall, quiz, maximise, and component-state tests |
| `src/components/RightPanelTypography.css` | 79 | Right-panel normal/maximized type sizing and responsive rules |
| `src/components/InteractiveQuiz.jsx` | 177 | Quiz loading, question/answer state, scoring, and results |
| `src/components/ActiveRecallStudio.js` | 175 | Older standalone recall implementation; currently not imported by `App.tsx` |
| `src/components/ChatWidget.js` | 194 | Older standalone chat using the legacy `askQuestion` helper; not imported by `App.tsx` |
| `src/components/CommandPalette.js` | 75 | Command palette component; not currently imported by `App.tsx` |
| `src/components/CustomCursor.jsx` | 54 | Custom cursor decoration |
| `src/components/Logo.js` | 56 | Logo component |
| `src/components/MarkdownAnswer.jsx` | 99 | Markdown/GFM/KaTeX tutor-answer rendering |
| `src/components/MarkdownAnswer.css` | 94 | Answer typography, tables, and math styles |
| `src/components/MarkdownAnswer.test.jsx` | 44 | Markdown/math rendering tests |
| `src/components/MathText.tsx` | 48 | Math text rendering helper |
| `src/components/MathText.css` | 60 | Math text styling |

Static assets: `assets/hero.png` (98 lines in the text inventory), `assets/react.svg` (1), and `assets/vite.svg` (1). The React/Vite template assets appear unused by the current shell and will be checked before any later removal.

### Entry point resolution audit (Decision 2)

Both `src/index.js` (11 lines) and `src/index.tsx` (17 lines) exist in the repository root of the frontend.
An audit of Create React App's module resolution configuration (`node_modules/react-scripts/config/paths.js`) confirms:
- Module extensions order: `moduleFileExtensions = ['web.mjs', 'mjs', 'web.js', 'js', 'web.ts', 'ts', 'web.tsx', 'tsx', 'json', 'web.jsx', 'jsx']`.
- Entry resolver: `appIndexJs: resolveModule(resolveApp, 'src/index')`.

Because `'js'` precedes `'tsx'` in CRA's resolution array, Webpack unconditionally mounts `src/index.js` as the application entry point. `src/index.tsx` is completely ignored during `npm start` and `npm run build`. Furthermore, `src/index.js` imports `'katex/dist/katex.min.css'` (essential for tutor math rendering), whereas `src/index.tsx` does not.
In Phase 1, the `ThemeProvider` must be mounted in `src/index.js` (or `index.js` cleanly migrated to TypeScript with identical imports), and `src/index.tsx` removed only after confirming it is completely unused.

## State ownership and current layout

- `App.tsx` owns `activeTab` (`tutor` or `recall`), initial tutor prompt, uploaded document array, selected document, selected document overview/loading/error, and excerpt visibility. The selected document and upload list therefore already live above the side panels.
- `RightPanel.js` owns chat messages and draft input, typing state, flashcards and their position/reveal/review state, session completion/loading/errors, and maximized state. Tutor, recall, and quiz panes are kept mounted; inactive panes are hidden. Maximize is a local React state overlay with the `--nw-header-h` top offset and Escape restoration.
- Current app layout is one header followed by a horizontal three-panel workspace: `LeftPanel` (Cognitive Library), a flexible document overview/context pane, and `RightPanel` (AI Tutor Studio, Active Recall, Concept Quiz). The header currently exposes AI Tutor and Active Recall; Concept Quiz is reached within the right panel.
- Planned mapping: Library becomes a full workspace for upload/catalogue/search; Overview becomes a home workspace; Reader becomes the document-reading workspace; Tutor, Recall, and Quiz become focused workspaces that reuse current stateful components/data; Progress and Settings become honest-data and preference workspaces. A shell-level workspace key will select these screens and synchronize with `#/library`, `#/tutor`, etc. because a router dependency is not installed. Per Decision 4, `RightPanel` remains one mounted component until Phase 4 (workspace switching hides it and never unmounts it). When Tutor, Recall, and Quiz become separate workspaces in Phases 4 and 6, their state will be lifted into a shared provider (context plus reducer) so chat, flashcard, and quiz state survive workspace switches and Reader's docked Tutor shares Tutor's chat. Library, Reader, Overview, Progress, and Settings may mount on demand. Selected document and study session ownership must remain above workspace switches so switching workspaces does not discard state.

## Frontend API calls and backend routes

| Frontend call | HTTP route | Use / status |
|---|---|---|
| `uploadPDF` (`src/api.js`) | `POST /api/ingest` | Used by `LeftPanel` for PDF upload |
| `getDocumentOverview` | `GET /api/documents/{id}/overview` | Used by `App.tsx` on selection and retry |
| `getDocumentFlashcards` | `GET /api/documents/{id}/flashcards` | Used by `RightPanel` |
| `askDocumentQuestion` | `POST /api/query` | Used by `RightPanel`; passes question and optional document ID |
| `deleteDocument` | `DELETE /api/documents/{id}` | Used by `LeftPanel` with confirmation |
| `InteractiveQuiz` direct fetch | `POST /api/generate-quiz` | Used by the mounted quiz pane |
| `getDocuments` | `GET /documents` | Exported legacy helper; current app does not use it and backend has no matching route |
| `askQuestion` (`ChatWidget`) | `POST /ask` | Legacy helper used by the currently unmounted `ChatWidget`; backend has no matching route |

Current backend routes in `main.py`: `GET /`, `GET /api/health`, `POST /api/ingest`, `DELETE /api/documents/{document_id}`, `GET /api/documents/{document_id}/overview`, `GET /api/documents/{document_id}/flashcards`, `POST /api/generate-quiz`, and `POST /api/query`. There is no current backend document-list, PDF-file, page-text, review-state, study-events, summary, progress, or settings API. Any later backend additions must be additive and backward compatible.

## Workspace audit

| Workspace | Existing UI | Existing data | Gaps and backend needs |
|---|---|---|---|
| Overview | No dedicated overview workspace. The central pane shows a selected document overview and extraction status. | Uploaded and selected document state is in memory; summary/topics/concepts/extraction details come from the overview endpoint. | Add a real document catalogue-derived recent/continue view. Persist last-opened document/page locally. Flagged count and last quiz require study-event/review APIs; do not fabricate metrics. |
| Library | `LeftPanel` has PDF upload, document rows, selection, deletion confirmation, and a storage meter. | Uploaded entries are in React state and are populated by uploads; overview and flashcard caches are server-side. No list endpoint currently hydrates prior uploads on startup. | Dedicated search/catalogue, real page/upload-date/OCR metadata, loading/empty/error states, and persistence of document metadata. Remove the hardcoded storage capacity/meter unless a real backend measurement is added. Add nullable `created_at` with safe migration for upload dates. |
| Reader | No PDF reader. The center pane renders generated overview/extracted context, not PDF pages. | Backend currently stores chunk text and page metadata in ChromaDB; original PDF bytes are not retained. | Save PDF locally on ingest; add file and page-text endpoints; render with pinned `pdfjs-dist`; reader page, zoom, outline, progress and contextual tutor action. Older uploads need extracted-text fallback. |
| Tutor | `RightPanel` tutor tab, scoped query, Markdown/GFM/KaTeX, source context, greeting behavior, loading/truncation handling, pinned input and maximized mode. | Chat lives in component state; answers are generated from retrieved Chroma chunks; document selection scopes queries. | Re-skin and add source chips/copy/timestamps/fixed follow-up prompts without changing retrieval or grounding. Preserve component state across shell navigation and maximize. |
| Recall | `RightPanel` Active Recall tab with 3D flip, reveal/next/review-again/remembered and session state. An older standalone `ActiveRecallStudio` exists but is not wired into the app. | Flashcards are generated/cached in SQLite and loaded from API; position/reveal/known/review queue live only in React state. | Persist per-card review status, add flagged list/revisit session and refresh persistence. Add an additive review endpoint and robust in-memory fallback on API failure. |
| Quiz | `InteractiveQuiz` appears as a mounted `RightPanel` pane. It supports variable question count, answer shuffling/feedback, scoring, missed topics, and retake. | Questions generated from selected document chunks; current question, answers and score live in quiz component state. | Restyle without behavior changes; record quiz completion to study events for progress. Existing API provides no persistence/history. |
| Progress | No progress workspace. | No study event or aggregate data API. | Add SQLite review/event storage and aggregate endpoint in Phase 5; then render only derived real measures with honest empty states in Phase 7. |
| Settings | No settings workspace or theme provider. | No saved theme or reading preference. | Add global light/dark/system theme and reading-size preference, persist in localStorage; clear local app data with confirmation. No backend required for these local preferences. |

## Proposed source structure

- `src/design/`: semantic design tokens (`tokens.css`), theme provider/context, global typography and theme application.
- `src/components/ui/`: reusable Button, IconButton, Surface, Tag, SegmentedTabs, Modal, EmptyState and Skeleton primitives.
- `src/workspaces/`: Overview, Library, Reader, Tutor, Recall, Quiz, Progress and Settings screens. Existing Tutor/Recall/Quiz logic should be extracted or adapted without unmounting state on navigation.
- Keep `App.tsx` as the shell/composition layer and retain CRA entry/build configuration. Introduce a small hash-synced workspace switcher (`#/library`, `#/tutor`, etc.) rather than a router package.
- Per Decision 5, Phase 1 navigation rail lists only "Study" (the current three-panel layout, unchanged behaviour) with a temporary light / dark / system toggle in the rail footer so both themes are checkable; it moves into Settings in Phase 7.

## Risks and sequencing notes

1. RightPanel owns important transient state today. Moving it into workspace children naively would reset chat, flashcards, or quiz progress on navigation. Lift the relevant session state or keep the stateful workspaces mounted and hide inactive ones (Decision 4).
2. The current document array is not loaded from a backend list at startup. A catalogue and recent-document view cannot imply persistence the API does not provide; Phase 2 must add an additive `GET /api/documents` from SQLite `document_insights` and hydrate the Library on startup (Decision 6).
3. PDF bytes are not stored currently. The reader feature requires a backward-compatible ingest extension and a fallback for old indexed documents.
4. Study metrics do not exist. Overview/progress must wait for real review/event persistence (`flashcard_review`, `study_events` tables in Phase 5); never substitute fixed example counts or charts.
5. Current UI has a hardcoded storage usage/capacity meter ("ChromaDB Storage 0.0 MB / 10 GB"), and the standalone recall component includes hardcoded sample document/card content. These must be replaced with real data or removed (Decision 8).
6. Baseline Jest execution was verified locally on the owner's machine with all 3 test suites and 13 tests passing. (If Jest encounters EPERM cache locks in specific sandboxed environments, the fallback procedure in AGENTS.md applies). The contrast script is absent at baseline and will be implemented in Phase 1.
7. Existing style is mostly dark Tailwind utility classes, while the required system introduces both themes and editorial tokens. Apply semantic tokens gradually and verify interaction contrast, especially focus, destructive actions, and text on pale sage fills. Tailwind remains present (dependency and directives in `index.css`), but will not be extended (Decision 3).
8. `pdfjs-dist` must be pinned exactly in Phase 3. Font packages (@fontsource) should be added only when used and only at required weights. No dependency changes are proposed for Phase 0.
9. The app is local and unauthenticated. Retaining local PDFs in Phase 3 increases the amount of sensitive source material on disk; privacy documentation and deletion cleanup must remain accurate.
10. The `samples/` directory does not currently exist in the repository; PDF upload visual checks in subsequent phases will be skipped until sample test PDFs are placed in `samples/` by the owner. Dead code (`ActiveRecallStudio.js`, `ChatWidget.js`, template assets, `CommandPalette.js`) will remain untouched until Phase 8 (Decision 9).

## Phase 0 visual QA for the owner

1. Start the current app with the backend and open a fresh session. Expected: the existing dark three-panel layout appears, with upload/library at left, document overview in the center, and Tutor/Recall/Quiz at right.
2. Upload a selectable-text PDF, select it, and switch between Tutor, Recall and Quiz. Expected: overview and study panes are populated from the uploaded document, and panel interactions remain available.
3. Maximize the right panel, switch tabs, then press Escape. Expected: the focused panel stays usable across tabs and Escape restores the prior three-panel workspace.

No browser is available to this run, so these checks are for owner review rather than claims of visual verification.

## Phase 2 implementation plan (approved preflight)

1. Migrate `document_insights` additively by checking `PRAGMA table_info` and adding nullable `created_at` only when absent. Set an ISO UTC timestamp on first ingest and preserve it during later insight-cache writes.
2. Add `GET /api/documents` backed only by SQLite, returning `{ "documents": [...] }` with the documented columns and cache-presence flags, ordered by timestamp descending with null timestamps last.
3. Change `getDocuments()` to use the additive endpoint. Hydrate the app's document state on startup with loading, retryable error, and honest empty states; merge server metadata into existing local entries by ID and clear a selection if hydration confirms it no longer exists.
4. Extend the Cognitive Library with filename-only case-insensitive search, persisted page/date/OCR metadata, and indeterminate in-flight ingest status. Preserve existing upload, selected scope, overview and confirmed-delete behavior.
5. Add temporary-database backend coverage, frontend behavior tests, and a Phase 2 manual QA checklist. Run required automated validation, inspect the full diff, check for BOMs and scan the diff for secrets. No dependency changes or Phase 3 work.

Expected files: `backend/main.py`, `backend/test_document_insights.py`, `frontend/src/api.js`, `frontend/src/App.tsx`, `frontend/src/App.test.jsx`, `frontend/src/components/LeftPanel.js`, `frontend/src/components/LeftPanel.test.jsx`, and `docs/redesign-qa.md`.
