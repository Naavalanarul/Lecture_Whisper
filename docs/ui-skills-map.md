# UI Redesign Skills Map

This document maps each phase of the Lecture Whisper web dashboard overhaul and correctness bugfix suite to verified skills available in the environment (`/Users/naavalanarul/antigravity-skills/skills` and `~/.agents/skills/`).

---

## Available Skills Inventory

| Skill Name | Source Path | Primary Focus |
|---|---|---|
| `frontend-design` | `/Users/naavalanarul/antigravity-skills/skills/frontend-design` | Distinctive visual craft, typography scales, intentional layouts, avoiding generic AI templates, concise sentence-case copy. |
| `ui-ux-pro-max` | `/Users/naavalanarul/antigravity-skills/skills/ui-ux-pro-max` | Comprehensive UI/UX intelligence: 4.5:1 WCAG contrast, 44px touch targets, 4px grid spacing, responsive breakpoints, semantic token hierarchies. |
| `web-design-guidelines` | `/Users/naavalanarul/antigravity-skills/skills/web-design-guidelines` | Vercel Labs Web Interface Guidelines audit: keyboard focus rings, active states, layout shift prevention, accessibility rules. |
| `react-best-practices` | `/Users/naavalanarul/antigravity-skills/skills/react-best-practices` | Component architecture, state normalization, virtualization, render optimization, TanStack Query cache patterns. |
| `test-driven-development` | `/Users/naavalanarul/antigravity-skills/skills/test-driven-development` | Strict Red-Green-Refactor discipline: writing failing unit/integration tests first before fixing correctness bugs A1–A8. |
| `webapp-testing` | `/Users/naavalanarul/antigravity-skills/skills/webapp-testing` | End-to-end browser automation, Playwright test architecture, visual regression capture across 1440, 1024, and 390 px viewports. |
| `systematic-debugging` | `/Users/naavalanarul/antigravity-skills/skills/systematic-debugging` | Root-cause analysis, reproducible isolation of dateparser timezone bugs and LLM grounding anomalies. |
| `theme-factory` | `/Users/naavalanarul/antigravity-skills/skills/theme-factory` | Systematic CSS custom property theming, light/dark dual mode pairing, token isolation. |
| `writing-plans` | `/Users/naavalanarul/antigravity-skills/skills/writing-plans` | Structuring phase gated engineering plans with verification criteria. |
| `verification-before-completion` | `/Users/naavalanarul/antigravity-skills/skills/verification-before-completion` | Multi-viewport visual verification, automated test suites, axe accessibility validation. |
| `finishing-a-development-branch` | `/Users/naavalanarul/antigravity-skills/skills/finishing-a-development-branch` | Atomic commits, worktree hygiene, clean branch integration. |

---

## Phase-to-Skill Mapping

### Phase 0: Discovery, Research & Audit
- **Skills Applied:** `frontend-design`, `ui-ux-pro-max`, `web-design-guidelines`, `writing-plans`
- **Activities:**
  - Audit all 8 active dashboard screens against Linear/Vercel/Stripe/Apple standards (`docs/ui-audit.md`).
  - Synthesize principles from Geist, Primer, Carbon, Polaris, Atlassian, HIG, Radix Colors, and WCAG 2.2 (`docs/design-research.md`).
  - Draft comprehensive redesign plan (`ui-redesign-plan.md`) and task breakdown (`task.md`).

### Section A: Correctness Fixes (Backend & Content Grounding)
- **Skills Applied:** `test-driven-development`, `systematic-debugging`
- **Activities:**
  - A1: Deterministic date resolution (started_at aware, weekday mapping, "next <weekday>" disambiguation, date-only without fake times).
  - A2: Q&A grounding within ±60s transcript window with source timestamps and non-empty fallback. UI enum lint test.
  - A3: Speaker talk-time statistical reconciliation (sum of parts = total speech, percentages = 100%, silence tracking).
  - A4: Repeated phrase real transcript context snippets; uniqueness assertions.
  - A5: Adapter promotion gate enforcement (held-out metrics benchmark + human pair threshold).
  - A6: Truth-in-copy alignment with real Pixel 8a background audio recording constraints.
  - A7: Clean empty states for fresh installs; `--demo` fixture flag.
  - A8: Fix keyboard shortcut tooltip overlap bug.

### Phase 1: Design System Foundation, Tokens & App Shell
- **Skills Applied:** `theme-factory`, `frontend-design`, `ui-ux-pro-max`, `react-best-practices`
- **Activities:**
  - Establish `ui/src/design/` token hierarchy (CSS variables, hairlines, tabular numerals, 2 hues: accent & alert).
  - Build collapsible left sidebar navigation (5 destinations + settings).
  - Build top bar with breadcrumbs, device connectivity badge, ⌘K command palette (`cmdk`), and theme toggle.
  - Ship `/design` component testbed route in Vite.

### Phase 2: Today (Home) & Lectures Table
- **Skills Applied:** `ui-ux-pro-max`, `frontend-design`, `react-best-practices`, `webapp-testing`
- **Activities:**
  - Build Today vertical timeline (schedule, upcoming deadlines, processing queue with SSE stepper).
  - Build dense Lectures table (TanStack Table) with sorting, filtering, selection, and non-intrusive drag-drop overlay.

### Phase 3: Lecture Detail (Hero Experience)
- **Skills Applied:** `react-best-practices`, `ui-ux-pro-max`, `frontend-design`, `webapp-testing`
- **Activities:**
  - 3-pane resizable layout (`react-resizable-panels`).
  - Virtualized transcript (`@tanstack/react-virtual`) with synchronized audio scrubber and word-level active highlights.
  - Collapsible chapter notes deck with Markdown export.
  - Right rail for events, grounded questions, and emphasis.
  - Sticky bottom player docked inside pane with waveform (`wavesurfer.js`).

### Phase 4: Deadlines & Insights
- **Skills Applied:** `ui-ux-pro-max`, `frontend-design`, `react-best-practices`
- **Activities:**
  - Deadlines list grouped by This week / Later / Past with date disambiguation picker and `.ics` bulk export.
  - Important Questions view with grounded lecture snippets.
  - Insights view: single stacked talk-time bar, WPM pace, lecturer voiceprint management, and phrase occurrence sparklines.

### Phase 5: Schedule & Settings
- **Skills Applied:** `ui-ux-pro-max`, `frontend-design`, `react-best-practices`
- **Activities:**
  - Time-axis week schedule grid (07:00–19:00) with non-truncating blocks and side-sheet editor.
  - Settings views: device pairing (QR + diagnostics), models, and fine-tuning studio with diff previews and promotion comparisons.

### Phase 6: Polish, Accessibility, Performance & Verification
- **Skills Applied:** `web-design-guidelines`, `webapp-testing`, `verification-before-completion`, `finishing-a-development-branch`
- **Activities:**
  - WCAG 2.2 AA audit (`@axe-core/playwright` on all views).
  - Lighthouse performance & accessibility benchmarks (target ≥ 95).
  - Multi-viewport visual baselines (1440px, 1024px, 390px in light and dark) saved to `docs/ui-screenshots/`.
  - Final atomic git commit.
