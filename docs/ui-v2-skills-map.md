# UI v2 Design & Motion Skills Map

This document maps each phase of the Lecture Whisper Web UI Design v2 overhaul to verified skills available in `/Users/naavalanarul/antigravity-skills/skills` and `~/.agents/skills/`. No skill names are invented.

---

## 1. Verified Skills Inventory

| Skill Name | Source Path | Primary Focus & Domain |
|---|---|---|
| `frontend-design` | `/Users/naavalanarul/antigravity-skills/skills/frontend-design` | Distinctive visual craft, editorial typography, avoiding generic SaaS tropes, micro-interactions, copy voice. |
| `ui-ux-pro-max` | `/Users/naavalanarul/antigravity-skills/skills/ui-ux-pro-max` | 4.5:1 WCAG AA contrast, 44px touch targets, 4px/8px spacing grids, semantic tokens, focus rings, responsive breakpoints. |
| `web-design-guidelines` | `/Users/naavalanarul/antigravity-skills/skills/web-design-guidelines` | Web interface quality rules: layout shift prevention, keyboard accessibility, ARIA labels, `prefers-reduced-motion` compliance. |
| `react-best-practices` | `/Users/naavalanarul/antigravity-skills/skills/react-best-practices` | Clean component architecture, state normalization, virtualization, hook optimization, TanStack cache utilization. |
| `canvas-design` | `/Users/naavalanarul/antigravity-skills/skills/canvas-design` | High-performance HTML5 Canvas & Web Audio API visualizers, procedural radial background washes without images. |
| `algorithmic-art` | `/Users/naavalanarul/antigravity-skills/skills/algorithmic-art` | Procedural generative visuals, geometric waveforms, SVG morphing, mathematical curves. |
| `theme-factory` | `/Users/naavalanarul/antigravity-skills/skills/theme-factory` | Systematic CSS variable architecture, dual light/dark mode pairings, semantic token abstraction. |
| `webapp-testing` | `/Users/naavalanarul/antigravity-skills/skills/webapp-testing` | Playwright end-to-end automation, video recording of signature interactions (S1–S8), visual regression baselines across 1440, 1024, and 390 px. |
| `react-native-skills` | `/Users/naavalanarul/antigravity-skills/skills/react-native-skills` | React Native / Expo architecture, Reanimated 3 gesture-driven transitions, mobile UI parity. |
| `test-driven-development` | `/Users/naavalanarul/antigravity-skills/skills/test-driven-development` | Preserving existing test suites, non-regression verification for data contracts and routes. |
| `verification-before-completion` | `/Users/naavalanarul/antigravity-skills/skills/verification-before-completion` | Multi-screen visual validation, Lighthouse ≥ 95 score audits, axe accessibility checks. |
| `writing-plans` | `/Users/naavalanarul/antigravity-skills/skills/writing-plans` | Phase-gated architecture planning with verifiable success criteria. |
| `finishing-a-development-branch` | `/Users/naavalanarul/antigravity-skills/skills/finishing-a-development-branch` | Atomic commits, worktree hygiene, clean branch integration. |

---

## 2. Phase-to-Skill Mapping

### Phase 0: Study References, Motion Inventory & Plan (Current)
- **Skills Applied:** `frontend-design`, `web-design-guidelines`, `writing-plans`
- **Focus:**
  - Automated browser inspection of Wispr Flow (`wisprflow.ai`) and Landon Norris (`landonorris.com`).
  - Cataloging motion triggers, durations, easings, techniques, and runtime libraries.
  - Formulating design rationale, adopt/reject criteria, and phase breakdown in `docs/design-research-v2.md`.

### Phase 1: Art-Direction Board, Tokens & /design Testbed
- **Skills Applied:** `theme-factory`, `frontend-design`, `ui-ux-pro-max`, `canvas-design`
- **Focus:**
  - Establish warm editorial product tokens (paper background `#FAFAF9`, warm near-black ink `#171717`, indigo accent `#4F46E5`, warm dark `#0A0A0A`).
  - Bundle clean grotesque UI font (Inter / Geist) + self-hosted editorial italic serif (Instrument Serif / Newsreader) for headline emphasis.
  - Motion tokens (fast 120ms, base 200ms, slow 320ms, hero 600–1200ms, expo-out easings, spring configs).
  - Procedural soft radial wash background generator (no stock photos).
  - Deliver three still mockups of Home in light and dark mode on `/design`.

### Phase 2: Shell, Navigation, Whisper Bar (S2) & Loader (S3)
- **Skills Applied:** `frontend-design`, `ui-ux-pro-max`, `algorithmic-art`, `react-best-practices`
- **Focus:**
  - Slim collapsible navigation / floating pill navigation with ⌘K command palette.
  - **S2. Whisper Bar:** Floating spring-morphing pill (Pair → Connected → Receiving → Transcribing live waveform → Notes ready).
  - **S3. Loader & Mark Animation:** Code-driven SVG waveform animation based on `brand/svg/mark.svg` that breathes in empty states and reacts to audio levels.

### Phase 3: Home Scroll Story (S4) & First-Run Experience
- **Skills Applied:** `frontend-design`, `react-best-practices`, `canvas-design`, `webapp-testing`
- **Focus:**
  - **S4. Home as a Scroll Story:** Display headline with split-word reveal; horizontal day track with live moving now-marker; upcoming deadlines countdown; drag/inertia lecture gallery with card-flip top points preview.
  - First-run 3-step scroll reveal (Pair, Record, Read) and `--demo` dataset switcher.

### Phase 4: Lectures List, Shared-Element Transition (S5) & Lecture Detail (S1, S7)
- **Skills Applied:** `react-best-practices`, `frontend-design`, `ui-ux-pro-max`, `canvas-design`
- **Focus:**
  - **S5. Shared-Element Transitions:** Seamless card expansion into Lecture page.
  - **S1. Wispr Cleanup Transformation:** Real ASR transcript with labeled disfluencies (fillers, repetitions, corrections) reflowing into clean notes with animated chips.
  - **S7. Live Waveform Player:** Real peaks, magnetic scrubbing, chapter markers, gliding active-sentence highlight.

### Phase 5: Deadlines, Insights (S6), Schedule, Settings & Micro-Interactions (S8)
- **Skills Applied:** `ui-ux-pro-max`, `frontend-design`, `react-best-practices`
- **Focus:**
  - **S6. Insights Ticker:** Repeated phrases marquee tape sized by frequency, pausing on hover, jumping to audio on click.
  - Schedule time-axis grid with now-line.
  - Settings fine-tuning studio with baseline-vs-adapter comparative evaluations.
  - **S8. Micro-Interactions:** Press scales, ticking number counters, spring toasts, skeleton shimmers, animated tab underlines.

### Phase 6: Android Parity, WCAG 2.2 AA Audit & Performance Benchmark
- **Skills Applied:** `react-native-skills`, `web-design-guidelines`, `webapp-testing`, `verification-before-completion`, `finishing-a-development-branch`
- **Focus:**
  - React Native / Expo parity with Reanimated 3 motion.
  - Axe-core automated accessibility tests (WCAG 2.2 AA compliance).
  - Lighthouse performance & accessibility scores ≥ 95.
  - Playwright video recordings of S1–S8 and multi-viewport screenshots (1440, 1024, 390 px).
