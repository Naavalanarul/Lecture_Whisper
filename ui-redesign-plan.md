# Lecture Whisper Web Dashboard Redesign Plan

## Executive Summary
Rebuild the Lecture Whisper web interface (`ui/`) into a world-class, high-density, keyboard-first desktop and mobile experience adhering to the design and engineering standards of **Linear**, **Vercel**, **Stripe**, **Notion**, and **Apple**.

Before implementing visual components, **Section A Correctness Fixes (Backend & Content Grounding)** will be resolved under strict Test-Driven Development (failing test written first, code fixed, test verified passing).

---

## Architecture & Phased Roadmap

```
Phase 0 (Research & Audit)  ──► COMPLETED (ui-skills-map, design-research, ui-audit, 48 screenshots)
        │
        ▼
Section A (Correctness Fixes) ─► A1: Deterministic Date Resolution (TDD)
                               ─► A2: Grounded Q&A with Transcripts & Enums (TDD)
                               ─► A3: Reconciled Speaker Stats & Silence (TDD)
                               ─► A4: Real Phrase Contexts & Timing (TDD)
                               ─► A5: LoRA Adapter Evaluation & Promotion Gate (TDD)
                               ─► A6: Truth-in-Copy Android Constraints
                               ─► A7: Demo Data Behind Flag (--demo / DEMO_MODE=1)
                               ─► A8: Fix Stuck Tooltip Bug
        │
        ▼
Phase 1 (Design Tokens & Shell) ─► Hairline Tokens, Theme Provider, App Shell, ⌘K Palette, /design
Phase 2 (Today & Lectures Table)─► Vertical Timeline, TanStack Table, Drag-Drop Overlay
Phase 3 (Lecture Detail Hero)   ─► 3-Pane Resizable Layout, Virtualized Transcript, Waveform Player
Phase 4 (Deadlines & Insights)  ─► Temporal Agenda, Disambiguation Picker, Speaker & Phrase Insights
Phase 5 (Schedule & Settings)   ─► 07:00-19:00 Time-Axis Grid, Pairing Diagnostics, LoRA Studio Gate
Phase 6 (Polish & Verification) ─► Axe WCAG 2.2 AA, Lighthouse ≥ 95, 48 Post-Verification Screenshots
```

---

## Detailed Phase Breakdown

### Phase 0: Research & Audit [COMPLETED]
- [x] **Skills Discovery:** Mapped environment skills to all redesign phases (`docs/ui-skills-map.md`).
- [x] **Design System Research:** Synthesized color tokens, hairlines, tabular typography, and accessibility from Geist, Linear, Stripe, Apple HIG, Primer, and Radix Colors (`docs/design-research.md`).
- [x] **Current UI Visual Audit:** Captured 48 screenshots across 8 views, 3 breakpoints (1440, 1024, 390px), and 2 themes in `docs/ui-screenshots/p0/`. Detailed defects cataloged in `docs/ui-audit.md`.

---

### Section A: Correctness Fixes (Backend & Content Grounding)
*All Section A tasks follow strict TDD: write failing unit test in `server/tests/`, verify failure, implement fix, verify pass.*

#### A1. Deterministic Date Resolution
- **Failing Test:** `server/tests/test_date_resolution.py` testing:
  - Relative dates (`tomorrow`, `next Monday`, `in two weeks`) resolve against recording `started_at` in UTC, never host local clock.
  - "Next <weekday>" ambiguity (e.g., lecture on Monday and speaker says "next Monday"): returns candidates for +0/+7 days with `needs_review: true`.
  - Date-only events do not invent fake times (e.g. `2026-11-12T00:00:00Z`, not random spoken hours).
- **Implementation:** Refactor `EventExtractor.resolve_date` in `server/src/lecturewhisper/pipeline/events.py` with deterministic calendar math and candidate generation.

#### A2. Grounded Q&A with Transcript Snippets & UI Enum Lint
- **Failing Test:** `server/tests/test_grounded_qa.py` and `ui/tests/enum_lint.test.ts` testing:
  - Q&A pairs include exact transcript start/end timestamps and text snippets.
  - Question and answer must be within $\pm 60\text{s}$ window in transcript.
  - Questions without answers in lecture must return `"No answer given in this lecture"`.
  - Questions categorized with `lecturer_self_answered: bool` or `student_asked: bool`.
  - No duplicate card texts.
  - UI enum lint test ensuring TypeScript `ImportantQuestion` enum matches backend Pydantic schema.
- **Implementation:** Update `QuestionExtractor` in `server/src/lecturewhisper/pipeline/events.py`, `server/src/lecturewhisper/api/schemas.py`, and `ui/src/types.ts`.

#### A3. Reconciled Speaker Statistics & Silence Accounting
- **Failing Test:** `server/tests/test_speaker_stats.py` testing:
  - Speaker talk times sum to total speech time.
  - Percentages sum to 100.0% of speech time.
  - Silence time = `total_duration - total_speech_time`.
  - If `speech_time + silence != total_duration`, log warning and report both.
  - Label speaker as Primary Lecturer if speech share $> 70\%$.
- **Implementation:** Refactor `SpeakerAnalyzer` in `server/src/lecturewhisper/pipeline/speakers.py`.

#### A4. Real Transcript Context for Repeated Phrases
- **Failing Test:** `server/tests/test_phrase_context.py` testing:
  - Every habit and emphasis phrase extracts real context sentences from transcript occurrences.
  - No two phrases share identical descriptions.
  - Report first occurrence timestamp, last occurrence timestamp, and mean inter-arrival time (seconds).
- **Implementation:** Refactor `PhraseAnalyzer` in `server/src/lecturewhisper/pipeline/phrases.py`.

#### A5. Adapter Promotion Gate
- **Failing Test:** `server/tests/test_adapter_promotion.py` testing:
  - Promotion rejected if evaluated human pairs $N < 50$ (default threshold).
  - Promotion rejected if adapter WER $\ge$ baseline WER.
  - UI disables "Promote to Production" button with explicit requirement banner.
- **Implementation:** Update `AdapterEvaluator.decide_promotion` in `server/src/lecturewhisper/train/evaluate.py` and enforce in `CorrectionsView.tsx`.

#### A6. Truth-in-Copy (Android Findings Parity)
- **Implementation:** Audit and replace all marketing claims across UI, docs, and README:
  - Label Android background recording as `Beta`.
  - Note `SCHEDULE_EXACT_ALARM` user permission and foreground notification requirements.
  - Remove "100% bulletproof", "production-ready", or hardware specs brags.

#### A7. Demo Data Seeding Behind Flag
- **Failing Test:** `server/tests/test_demo_seeding.py` testing:
  - Database starts completely empty by default.
  - Demo data only seeds when `--demo` or `DEMO_MODE=1` is provided.
  - Frontend `App.tsx` initializes empty state without fallback mock data.
- **Implementation:** Refactor `server/src/lecturewhisper/store/database.py`, CLI flags, and frontend state initializers. Provide rich empty states for all 8 views.

#### A8. Fix Stuck Tooltip Bug on Schedule View
- **Implementation:** Identify root cause in `Header.tsx` and `TimetableView.tsx`. Replace native browser `title` attributes with an accessible Radix / custom tooltip that clears focus and unmounts cleanly on modal open/Esc.

---

### Phase 1: Design System Foundation, Tokens & App Shell
1. **Design Tokens (`ui/src/design/tokens.css`):**
   - Hairline borders (`1px solid var(--border)`).
   - Strict palette: Canvas (`#FAFAF9` / `#0A0A0A`), Surface (`#FFFFFF` / `#141414`), Border (`#E7E7E4` / `#262626`), Text (`#171717` / `#EDEDED`), Muted (`#737373` / `#A3A3A3`), Accent (`#4F46E5` / `#818CF8`), Alert (`#DC2626` / `#F87171`).
   - Tabular typography (`font-variant-numeric: tabular-nums`).
2. **Collapsible Navigation Shell (`ui/src/components/Sidebar.tsx`):**
   - Desktop: 240px wide sidebar collapsible to 56px icon rail.
   - Mobile (<768px): Bottom navigation bar with 5 primary destinations (Today, Lectures, Deadlines, Questions, Insights) + sheet menu for Settings.
   - Replaces crowded 8-tab header and clumsy horizontal tablet scrollbar.
3. **Top Bar & Command Menu (`ui/src/components/TopBar.tsx`, `ui/src/components/CommandMenu.tsx`):**
   - Breadcrumb trail, connection status pill, `⌘K` global search modal (powered by `cmdk`), and theme toggle.
4. **Design Testbed (`/design` route):**
   - Interactive preview of all tokens, typography, buttons, badges, tables, and dialogs.

---

### Phase 2: Today (Home) & Dense Lectures Table
1. **Today View (`ui/src/views/TodayView.tsx`):**
   - Vertical timeline showing today's classes from Timetable, upcoming deadlines due in next 48h, and active background processing jobs with SSE progress bars.
2. **Lectures Table (`ui/src/views/LecturesTableView.tsx`):**
   - High-density TanStack Table (`@tanstack/react-table`): Course code, Title, Date/Time, Duration, Speaker name, Status, and Actions.
   - Multi-column sort, filter by course/status, row selection, and batch actions.
   - Non-intrusive drag-drop overlay that appears only when dragging files over window.

---

### Phase 3: Lecture Detail (Hero Experience)
1. **3-Pane Resizable Layout (`ui/src/views/LectureDetailView.tsx`):**
   - Powered by `react-resizable-panels`.
   - Left Pane: Chapter index and search filters.
   - Center Pane: Virtualized transcript (`@tanstack/react-virtual`) with synchronized audio scrubber, active segment auto-scroll, and word-level click-to-seek.
   - Right Pane: Markdown chapter notes, key points, definitions, and one-click markdown export.
2. **Integrated Waveform Player (`ui/src/components/DockedAudioPlayer.tsx`):**
   - Docked directly at the bottom of the Lecture Detail pane (not floating over content).
   - Audio waveform display (`wavesurfer.js` or SVG canvas) with chapter markers, speed control (`0.75x`, `1x`, `1.25x`, `1.5x`, `2x`), and skip controls (`j`/`l`).

---

### Phase 4: Deadlines & Insights
1. **Deadlines View (`ui/src/views/DeadlinesView.tsx`):**
   - Agenda layout grouped by: *This week*, *Next week*, *Later this term*, and *Past*.
   - Disambiguation card for items requiring review with dual candidate buttons.
   - One-click "Export all to Calendar (.ics)" button.
2. **Questions View (`ui/src/views/QuestionsView.tsx`):**
   - Cards showing question, transcript timestamp, questioner role (Lecturer vs Student), and grounded lecture answer.
   - Persistent starring saved to localStorage or server.
3. **Insights View (`ui/src/views/InsightsView.tsx`):**
   - Consolidates Speakers and Habits.
   - Stacked talk-time bar with silence accounting, WPM pace metrics, voiceprint enrollment, and phrase occurrence sparklines.

---

### Phase 5: Schedule & Settings
1. **Academic Schedule Grid (`ui/src/views/ScheduleView.tsx`):**
   - 5-day week calendar grid with hourly vertical time axis (07:00 to 19:00).
   - Non-truncating event blocks displaying full course name, room, and lecturer.
   - Side-sheet editor for adding/editing slots and uploading timetable photos for VLM extraction.
2. **Settings & LoRA Studio (`ui/src/views/SettingsView.tsx`):**
   - Device pairing management with clean QR code and diagnostic connectivity pings.
   - LoRA Fine-Tuning Studio enforcing Section A5 promotion gate ($\ge 50$ human pairs + WER threshold).

---

### Phase 6: Polish, Accessibility & Verification
1. **Axe WCAG 2.2 AA Audit:** Automated headless Playwright test (`@axe-core/playwright`) verifying 0 violations across all views.
2. **Lighthouse Audit:** Verified scores $\ge 95$ for Performance, Accessibility, and Best Practices.
3. **Final Visual Capture:** 48 screenshots across all views, 3 viewports (1440, 1024, 390px), light and dark mode, stored in `docs/ui-screenshots/final/`.
4. **Git Hygiene:** Clean, atomic commit following project standards.

---

## Verification Criteria
- **Section A:** All new tests in `server/tests/` pass (`pytest server/tests/`).
- **Build:** `npm run build` in `ui/` succeeds with zero TypeScript errors or warnings.
- **Lint:** ESLint, Prettier, and Ruff all pass cleanly.
- **Visuals:** All 8 screens render flawlessly without horizontal scroll or content clipping at 1440, 1024, and 390 px widths.
