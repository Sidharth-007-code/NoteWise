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

**Browser agent blocked — Chrome remote debugging unavailable.** No `DevToolsActivePort` file was present at the expected path, meaning Chrome was not running with `--remote-debugging-port=9222`. To unblock: launch `chrome.exe --remote-debugging-port=9222`, then re-run the browser QA agent.

Screenshots NOT captured: light-1440, dark-1440, light-1280, light-1024, light-768, light-390, dark-390, focus-ring, tutor-chat, maximized, no-storage-meter.

No placeholder screenshots were created.

### Known layout issue at mobile widths (not a Phase 1 regression)

The existing `LeftPanel.js` uses `w-80 lg:w-[340px]` (Tailwind fixed width). The AppShell nav rail adds another 64 px. At 768 px and especially 390 px, the combined fixed widths will produce horizontal overflow. **This is expected Phase 1 behaviour** — responsive breakpoints and panel collapsing are out of Phase 1 scope (see `docs/redesign-plan.md`). The overflow check at 768 px and 390 px is therefore expected to fail until a future phase addresses it. This must be explicitly re-tested and resolved in the phase that introduces responsive layout.



## Phase 2 — persistent Cognitive Library

### Automated checks

| Check | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | ✅ Passed, 0 errors |
| Contrast | `npm run check:contrast` | ✅ 34/34 token pairs passed |
| Jest | `$env:CI='true'; npx react-scripts test --watchAll=false --cacheDirectory $tempCache` | ⚠️ Could not run suites: Windows `EPERM` while renaming Jest transform cache files under `%TEMP%`; per instructions, not retried. |
| Production build | `npm run build` | ✅ Compiled successfully (185.89 kB JS, 16.33 kB CSS gzip) |
| Backend unittests | `..\\.venv\\Scripts\\python.exe -m unittest discover -p "test_*.py"` | ✅ 26 tests passed |
| Python compilation | `..\\.venv\\Scripts\\python.exe -m py_compile main.py test_document_insights.py` | ✅ Passed |

### Manual verification

For the Library in Light and Dark themes, at 1440, 1280, 1024, 768 and 390 px:

1. On startup, verify the library shows a loading state until `GET /api/documents` resolves; a successful empty result shows the honest empty state.
2. Simulate a list request failure; confirm the error is visible and Retry reloads the list. Confirm an error is not presented as an empty library.
3. Verify persisted documents show their filename, real page count, upload date or “Date unknown”, and OCR indication only when `ocr_used` is true.
4. Search with mixed-case filename text; confirm filtering is case-insensitive and only filenames are matched. Confirm a no-match state is shown.
5. Upload a PDF; confirm an indeterminate “Uploading and indexing…” state with no percentage or cancel control, then confirm the successful item is selected and appears in the list.
6. Select a document, confirm its overview and Tutor scope work, then delete another document with confirmation. Confirm the list updates. Delete the selected document and confirm selection/scope resets.
7. Reload after an upload and confirm documents hydrate from SQLite. Confirm legacy rows show “Date unknown”.
8. At each width/theme, verify `document.documentElement.scrollWidth <= window.innerWidth`, no clipped or overlapping controls, and visible keyboard focus rings.

Browser visual verification was not completed: the in-app browser timed out opening both `http://localhost:3000` and `http://127.0.0.1:3000`, although CRA reported successful startup. Therefore the five widths, both themes, overflow/clipping, keyboard focus, screenshot capture, and PDF upload visual check were not run. No screenshots were saved. Retry visual QA when the browser can access the local dev server. Check whether `samples/` exists before attempting PDF upload.

### Owner-reported local closure verification

On 2026-11-11, the owner reported that all automated tests pass and manually verified the application locally. The owner confirmed Library hydration after startup and refresh persistence; upload; page/date/OCR metadata; case-insensitive filename search; deletion; Light and Dark themes; and responsive behavior at 1440, 1280, 1024, 768 and 390 px. This is owner-reported verification; no browser screenshots were captured by this run.
