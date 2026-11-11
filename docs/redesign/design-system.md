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
