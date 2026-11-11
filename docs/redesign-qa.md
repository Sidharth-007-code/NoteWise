# Redesign visual QA

## Phase 0 — baseline workspace audit

1. Start the backend and frontend and confirm the current three-panel workspace renders with the Cognitive Library on the left, document overview in the center, and study panel on the right.
2. Upload and select a PDF; confirm the overview and document scope appear, then switch among Tutor, Active Recall and Concept Quiz.
3. Maximize the right panel, switch tabs, and press Escape; confirm the panel restores and its session state remains intact.

Expected results: the current app remains usable in its existing dark style and the right panel restores to its original workspace. Note: Phase 0 is read-only with no UI changes. Visual browser verification begins in Phase 1.

## Phase 1 — design tokens, ThemeProvider, AppShell, UI primitives

### Automated checks (all passed — commit `224022e`)

| Check | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | ✅ 0 errors |
| Contrast | `npm run check:contrast` | ✅ 34/34 token pairs PASS (WCAG AA) |
| Jest | `CI=true npx react-scripts test --watchAll=false` | ✅ 3 suites, 13 tests passed |
| Production build | `npm run build` | ✅ Compiled — 185.25 kB JS, 16.27 kB CSS (gzip) |
| Backend unittests | `python -m unittest discover -p "test_*.py" -v` | ✅ 22 tests passed |

### Storage meter audit

Removed the fabricated "ChromaDB Storage" meter from `LeftPanel.js`. The meter displayed `formattedUsage / 10 GB` with a hardcoded 10 GB cap that did not reflect real ChromaDB on-disk usage. Per Decision 8: removed entirely. The `SOURCES SYNCED` counter (`uploadedFiles.length`) remains — it reflects real local UI state and is accurate.

### Manual visual QA checklist

For each width (1440, 1280, 1024, 768, 390) and each theme (Light, Dark):

1. **Layout**: AppShell renders with 56 px top bar and 64 px navigation rail; three-panel workspace (Cognitive Library, Document Overview, Study panel) fills remaining space without horizontal overflow (`scrollWidth <= innerWidth`).
2. **Navigation rail**: "Study" icon and label visible; version badge "1.0 test" and "local" indicator visible in footer; Light/Dark/System theme toggle present.
3. **Theme switching**: Toggle cycles correctly; `data-theme` attribute updates on `<html>`; tokens apply instantly with no flash.
4. **Document upload**: Upload button accessible; PDF upload triggers ingest; document appears in list; overview loads in center pane.
5. **Document scope / Clear Scope**: Selecting a document scopes the right panel; Clear Scope resets state.
6. **Tutor chat**: Send a question; Markdown, GFM, KaTeX, `<br>` normalisation present; truncation note appears when applicable.
7. **Tab switching**: Switch Tutor → Recall → Quiz → Tutor; chat and flashcard state survive.
8. **Maximize/Restore**: Click maximize icon on right panel; Escape restores it; `--nw-header-h` offset applies correctly.
9. **Flashcards**: 3D flip animation; front/back render.
10. **Concept Quiz**: Variable question count, balanced answer shuffle, per-option explanations, results with "Areas to Improve", Retake.
11. **Focus ring**: Tab through interactive elements; visible focus ring present on all controls.
12. **No clipped controls**: No overlapping or clipped elements at any width.

### Visual screenshots

**Not captured in automated form.** The browser agent was not reliably available for multi-width capture during this session. No placeholder screenshots were created. The dev servers were confirmed healthy (HTTP 200 on both `localhost:3000` and `localhost:8000`) but automated screenshot capture at all required widths and both themes did not complete. This must be verified manually before Phase 2 is approved.

