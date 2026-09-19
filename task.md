# Task Tracking: Lecture Whisper UI Overhaul & Correctness Fixes

## Phase 0: Research & Audit [COMPLETED]
- [x] Discover environment skills in `.agents/skills/` and write `docs/ui-skills-map.md`
- [x] Conduct design research (Geist, Linear, Stripe, Apple HIG, Primer, Radix Colors, WCAG AA) and write `docs/design-research.md`
- [x] Run automated Playwright visual capture (48 screenshots in `docs/ui-screenshots/p0/`)
- [x] Perform detailed 8-screen defect audit and write `docs/ui-audit.md`
- [x] Draft `ui-redesign-plan.md` and `task.md`
- [x] Stop and request user approval before Phase 1 and Section A

---

## Section A: Correctness Fixes (Backend & Content Grounding) [COMPLETED]
- [x] **A1: Deterministic date resolution**
  - [x] Write failing test `server/tests/test_date_resolution.py`
  - [x] Implement deterministic date resolver in `server/src/lecturewhisper/pipeline/events.py`
  - [x] Verify test passes
- [x] **A2: Grounded Q&A**
  - [x] Write failing test `server/tests/test_grounded_qa.py` and UI enum lint test
  - [x] Implement transcript grounding ($\pm 60\text{s}$ window, speaker attribution, non-hallucinated fallback)
  - [x] Verify tests pass
- [x] **A3: Reconciled speaker stats**
  - [x] Write failing test `server/tests/test_speaker_stats.py`
  - [x] Implement speech vs silence reconciliation, 100% sum, and lecturer dominance threshold
  - [x] Verify test passes
- [x] **A4: Real transcript context for repeated phrases**
  - [x] Write failing test `server/tests/test_phrase_context.py`
  - [x] Implement transcript context extraction, timing metrics, and uniqueness validation
  - [x] Verify test passes
- [x] **A5: Adapter promotion gate**
  - [x] Write failing test `server/tests/test_adapter_promotion.py`
  - [x] Enforce $\ge 50$ human pairs and WER $<$ baseline threshold in `server/src/lecturewhisper/train/evaluate.py`
  - [x] Verify test passes
- [x] **A6: Truth-in-copy alignment**
  - [x] Audit UI and documentation for honest Android beta claims, resolve port 8000 vs 8420 discrepancy
- [x] **A7: Demo data seeding behind flag**
  - [x] Write failing test `server/tests/test_demo_seeding.py`
  - [x] Gate demo dataset behind `--demo` / `DEMO_MODE=1`
  - [x] Build informative empty states for all 8 views
  - [x] Verify test passes
- [x] **A8: Fix stuck tooltip bug**
  - [x] Fix focus retention and unmount lifecycle for shortcuts tooltip on Schedule view

---

## Phase 1: Design System Foundation, Tokens & App Shell [COMPLETED]
- [x] Define design system tokens in `ui/src/design/tokens.css` (hairlines, colors, tabular numbers)
- [x] Build responsive collapsible sidebar (240px $\to$ 56px desktop, bottom bar on mobile)
- [x] Build top bar with breadcrumbs, status pill, theme switcher, and `⌘K` command palette
- [x] Implement `/design` component testbed route in Vite

---

## Phase 2: Today (Home) & Dense Lectures Table [COMPLETED]
- [x] Build Today vertical timeline (schedule, upcoming deadlines, background job stepper)
- [x] Build dense TanStack Lectures table with sorting, filters, row selection, and batch actions
- [x] Implement non-intrusive drag-drop overlay

---

## Phase 3: Lecture Detail (Hero Experience) [COMPLETED]
- [x] Build 3-pane resizable layout using `react-resizable-panels`
- [x] Build virtualized transcript with `@tanstack/react-virtual`, synchronized audio scrubber, and word-level seeking
- [x] Build collapsible chapter notes deck with Markdown export
- [x] Dock audio player with waveform at the bottom of the lecture pane

---

## Phase 4: Deadlines & Insights [COMPLETED]
- [x] Build Deadlines agenda (This week / Next week / Later / Past) with date disambiguation picker
- [x] Add bulk `.ics` calendar export
- [x] Build grounded Q&A cards with transcript jumps and starring
- [x] Build Insights view with stacked talk-time bar, silence ratio, WPM pace, and phrase sparklines

---

## Phase 5: Schedule & Settings [COMPLETED]
- [x] Build 07:00–19:00 hourly time-axis timetable grid with non-truncating lecture cards
- [x] Build side-sheet schedule editor and timetable photo upload with local VLM parsing
- [x] Build Settings view with device pairing QR code, diagnostics, and gated LoRA Studio

---

## Phase 6: Polish, Accessibility & Verification [COMPLETED]
- [x] Run `@axe-core/playwright` accessibility audit (0 violations target)
- [x] Run Lighthouse performance and accessibility benchmarks (WCAG AA compliant)
- [x] Capture 48 final verification screenshots across 1440, 1024, and 390 px viewports
- [x] Clean atomic git commit
