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

## Decisions after Phase 0 (authoritative)

1. Baseline: Jest runs in the terminal on the owner's machine and the 13 existing tests pass; run it every phase.
2. Entry point: both `src/index.js` and `src/index.tsx` exist. Determine which one actually mounts the app (CRA's default module resolution may pick `index.js` over `index.tsx`). Put the ThemeProvider in the real entry and remove the unused one only if proven unused.
3. Tailwind is already present (dependency and directives in `index.css`). Do not remove it and do not extend it. New and re-skinned components use CSS files with token variables. In every file you touch, replace hardcoded colour utilities and hex values with tokens and report how many remain in the report.
4. Study state: keep RightPanel as one mounted component until Phase 4. Workspace switching hides it and never unmounts it. When Tutor, Recall and Quiz become separate workspaces (Phases 4 and 6), lift their state into a shared provider (context plus reducer) so chat, flashcard and quiz state survive workspace switches and the Reader's docked Tutor shares the Tutor's chat. Add tests for state surviving workspace switches. Library, Reader, Overview, Progress and Settings may mount on demand.
5. Phase 1 rail: list only "Study" (the current three-panel layout, unchanged behaviour). Add a temporary light / dark / system toggle in the rail footer so both themes are checkable now; it moves into Settings in Phase 7.
6. Phase 2 must add an additive `GET /api/documents` (from SQLite `document_insights`: document_id, filename, page_count, ocr_used, extracted_pages, created_at nullable, has_overview, has_flashcards) and hydrate the Library from it on startup, because uploads currently vanish from the UI on refresh. Retire the unused legacy helpers (`getDocuments` to `/documents`, `askQuestion` to `/ask`) once nothing imports them. Add backend tests.
7. The generated document overview (summary, key topics, important concepts, topic summaries with pages) is an existing feature and must be kept. Until Phase 3 it stays in the current centre pane. From Phase 3 it lives in the Reader's left rail as an "Overview" tab beside "Contents" (the PDF outline, shown only when the PDF has one); topic page chips jump to that page.
8. Remove the hardcoded storage meter ("ChromaDB Storage 0.0 MB / 10 GB" and similar). If something is shown instead, use real data only (for example the document count).
9. Dead code (`ActiveRecallStudio.js`, `ChatWidget.js`, template assets, `CommandPalette.js`): leave untouched in Phases 1 to 7. In Phase 8, delete a file only after grep and the test suite confirm nothing imports it. `CommandPalette` may be reused for navigation earlier if it fits.
