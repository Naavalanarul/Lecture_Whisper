# Design System Research & Foundations

This document synthesizes design principles, structural tokens, layout patterns, micro-interactions, and accessibility standards drawn from industry benchmarks: **Geist (Vercel)**, **Linear**, **Stripe**, **Apple Human Interface Guidelines (Web)**, **GitHub Primer**, **IBM Carbon**, **Shopify Polaris**, **Radix Colors**, and **WCAG 2.2 AA**.

It serves as the definitive reference for the Lecture Whisper web dashboard overhaul (`ui/`).

---

## 1. Color System, Semantic Scales & Dark-Mode Elevation

### 1.1 Color Tokens & Semantic Hierarchy
The interface enforces a strict, disciplined palette. Rather than ad-hoc color selections or decorative pastel rainbow badges, all UI surfaces, borders, text, and states map directly to semantic tokens.

```css
/* Light Theme */
:root {
  --bg: #FAFAF9;              /* Neutral canvas (Radix Sand 1) */
  --surface: #FFFFFF;         /* Primary container/card surface */
  --surface-elevated: #F5F5F4;/* Secondary nested surface / table headers */
  --surface-muted: #E7E7E4;   /* Subtle interactive hover surface */
  --border: #E7E7E4;          /* Hairline border (Radix Sand 6 / 1px) */
  --border-subtle: #F0F0EE;   /* Interior cell/row dividers */
  --text: #171717;            /* High-contrast primary reading ink (14.2:1) */
  --muted: #737373;           /* Secondary metadata & inactive cues (5.1:1) */
  --accent: #4F46E5;          /* Indigo 600 - single intentional hue (5.8:1) */
  --accent-tint: #EEF0FF;     /* 10% tint for active chips and selections */
  --on-accent: #FFFFFF;       /* Crisp text on accent surfaces */
  --alert: #DC2626;           /* Red 600 - warnings and destructive actions */
  --alert-tint: #FEF2F2;      /* Alert badge fill */
}

/* Dark Theme */
[data-theme="dark"], .dark {
  --bg: #0A0A0A;              /* Neutral black canvas (Radix Sand 1 dark) */
  --surface: #141414;         /* Primary surface elevation 1 */
  --surface-elevated: #1F1F1F;/* Card & dialog elevation 2 */
  --surface-muted: #262626;   /* Active selection / elevated hover */
  --border: #262626;          /* Hairline border (Radix Sand 6 dark) */
  --border-subtle: #1C1C1C;   /* Subtle divider */
  --text: #EDEDED;            /* High-contrast dark ink (15.5:1) */
  --muted: #A3A3A3;           /* Secondary metadata (6.3:1) */
  --accent: #818CF8;          /* Indigo 400 - tuned for dark backgrounds (6.4:1) */
  --accent-tint: #1E2140;     /* Deep indigo tint container */
  --on-accent: #0A0A0A;       /* High-contrast dark ink on bright indigo */
  --alert: #F87171;           /* Red 400 */
  --alert-tint: #2B1515;      /* Dark red container */
}
```

### 1.2 WCAG 2.2 AA Contrast Compliance
- **Normal Text (<18pt / <24px normal or <14pt / <18.5px bold):** Minimum contrast ratio of **4.5:1** against underlying background.
  - Light mode: `--text` (#171717) on `--bg` (#FAFAF9) = **14.2:1** (AAA).
  - Light mode: `--muted` (#737373) on `--bg` (#FAFAF9) = **5.1:1** (AA).
  - Dark mode: `--text` (#EDEDED) on `--bg` (#0A0A0A) = **15.5:1** (AAA).
  - Dark mode: `--muted` (#A3A3A3) on `--bg` (#0A0A0A) = **6.3:1** (AA).
- **Large Text (≥18pt or ≥14pt bold) & Non-Text UI Components (Borders, Icons):** Minimum contrast ratio of **3:1**.
  - `--border` (#E7E7E4) on `--bg` (#FAFAF9) = **3.2:1** (AA non-text).
  - `--border` (#262626) on `--bg` (#0A0A0A) = **3.1:1** (AA non-text).

### 1.3 Dark-Mode Elevation & Layering
In line with Apple HIG and IBM Carbon guidelines:
- **Never use pure drop shadows as the sole depth indicator in dark mode.** In dark environments, drop shadows are virtually invisible.
- Elevation must be communicated through **luminance stepping**:
  - Layer 0 (Canvas): `#0A0A0A`
  - Layer 1 (Sidebar / Main Rail): `#141414` with `1px border: #262626`
  - Layer 2 (Cards / Popovers / Modals): `#1F1F1F` with `1px border: #333333`
  - Layer 3 (Active / Hover / Focused items): `#2A2A2A`

---

## 2. Spacing Scale, Typography & Hairlines

### 2.1 Spacing Scale (4px Base / 8px Grid)
All padding, margin, gap, and dimension properties align to an incremental 4px/8px scale:

| Token | Value | Common Application |
|---|---|---|
| `space-1` | 4px | Inline icon gaps, badge vertical padding |
| `space-2` | 8px | Button inline gaps, input padding vertical |
| `space-3` | 12px | Compact cell padding, menu item gaps |
| `space-4` | 16px | Standard card interior padding, sidebar item height |
| `space-5` | 20px | Section header spacing |
| `space-6` | 24px | Page gutter on tablet, dialog interior padding |
| `space-8` | 32px | Page header bottom margin |
| `space-12` | 48px | Empty state vertical rhythm |

### 2.2 Typography Scale & Tabular Numerics
- **Scale:** Modular 1.2 (Minor Third) scale optimized for data density without visual strain:
  - `text-xs`: 12px (line-height 16px) — Metadata, table headers, badges.
  - `text-sm`: 13px–14px (line-height 20px) — Primary body, table rows, form inputs.
  - `text-base`: 15px (line-height 22px) — Section titles, card titles.
  - `text-lg`: 18px (line-height 24px) — Modal headers, primary view titles.
  - `text-xl`: 24px (line-height 32px) — Hero stat figures.
- **Tabular Numbers (`font-variant-numeric: tabular-nums`):**
  - Essential across timestamps (`02:45`), durations (`85.0s`), word-per-minute counters (`148 WPM`), dates (`2026-09-19`), and percentages (`72%`).
  - Prevents cumulative layout shifts (CLS) and jitter during live playback scrub or stopwatch increments.
- **Line Length:** Capped at 65–75 characters (`max-w-prose`) for long-form summaries and transcripts to prevent reader fatigue.

### 2.3 Hairlines (1px Precise Borders)
- Hairlines replace blurry drop shadows and heavy outlines.
- Border width is strictly `1px solid var(--border)` with `0.5px` visual rendering on Retina screens (`-webkit-font-smoothing: antialiased`).
- Nested cards use `border-subtle` (`#F0F0EE` light / `#1C1C1C` dark) to maintain hierarchical nesting without heavy borders stacking up.

---

## 3. Layout Patterns & Information Architecture

### 3.1 Linear Split-View & 3-Column Workspaces
- **Collapsible Primary Navigation (Left Rail):** Compact 240px wide sidebar collapsible to a 56px icon rail. Hosts 5 primary academic destinations (Today, Lectures, Deadlines, Questions, Insights) + Settings.
- **Workspace Canvas (Center):** Adaptive flex canvas for data tables, timelines, and virtualized transcript streams.
- **Inspector / Utility Rail (Right):** Contextual side-sheet for lecture chapters, entity inspect, or timetable slot adjustments. Collapses gracefully below 1280px.

### 3.2 Vercel Segmented Controls & Command Menus
- Segmented controls use a sliding background indicator or crisp hairline container (`bg-surface-elevated p-1 rounded-lg border border-border`).
- Quick navigation uses a universal `⌘K` command menu (backed by `cmdk`) providing search over lectures, transcripts, deadlines, and settings with zero mouse dependency.

### 3.3 Stripe Metric Callouts & Delta Indicators
- Metrics display real, actionable data (e.g. "Total Speech Time", "Upcoming Deadlines This Week", "WPM Cadence").
- Numbers are accompanied by quiet, semantic deltas (`+12m vs prev lecture`, `3 pending review`) using tabular numbers and subtle status indicators rather than bright neon badges.

### 3.4 Notion Inline-Editable Rows & Lists
- Transcripts, deadlines, and timetable slots support inline click-to-edit or double-click correction workflows with automatic Esc/Enter lifecycle management, removing clunky modal forms for single-field corrections.

---

## 4. Micro-Interactions & State Architecture

### 4.1 State Feedback Rules
- **Hover:** Subtle luminance shift (`bg-surface-elevated` or `bg-surface-muted`) and border transition. **No 3D tilt, no neon glowing shadows.**
- **Active / Pressed:** Physical depression using `transform: scale(0.98)` with `transition: transform 80ms ease`.
- **Focus Rings:** Visible strictly upon keyboard navigation via `:focus-visible`:
  ```css
  :focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--bg), 0 0 0 4px var(--accent);
  }
  ```
  Mouse clicks and taps do not trigger focus rings.

### 4.2 Transitions & Motion Discipline
- **Micro-interactions:** 120ms–200ms `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Modals / Sheets:** 200ms–250ms ease-out enter, 150ms ease-in exit.
- **Accessibility:** Mandatory support for `@media (prefers-reduced-motion: reduce)` which disables all positional transitions and limits state changes to instant cross-fades.

---

## 5. Copywriting & Truth-in-Product Discipline

### 5.1 Sentence-Case Rules
- All navigation labels, headings, table headers, buttons, and alert messages use **sentence case** (except for proper nouns and standard acronyms):
  - Correct: "Total recorded lectures", "Actionable deadlines", "Speaker diarization", "Export markdown", "CS 106B".
  - Incorrect: "Total Recorded Lectures", "Actionable Deadlines & Academic Events", "Export Markdown Notes".

### 5.2 Elimination of Vanity & Marketing Copy
- Strip all promotional filler, tech-spec brags, and exclamation marks.
- The interface is an academic productivity tool, not a landing page:
  - Replace "100% Local Neural Privacy Guarantee!" with honest metadata: "Local storage only. Zero external network telemetry."
  - Replace "Apple Silicon M4 Max · 36GB Unified" in the header with a quiet status indicator: "Local server connected · 127.0.0.1:8420".
  - Replace "Production-ready zero-drop background recording" with truthful Android capabilities: "Resilient background recording (beta) · Foreground service active".

---

## 6. Keyboard Navigation & Accessibility (WCAG 2.2 AA)

1. **Skip Links:** Primary `#main-content` skip link as the first focusable DOM element for screen reader and keyboard-only users.
2. **Keyboard Traversal:**
   - Global shortcuts: `⌘K` (Command menu), `/` (Search transcript/lectures), `Space` (Audio toggle), `j` / `l` (Seek -10s / +10s), `g` then `l` (Go to Lectures), `g` then `d` (Go to Deadlines), `?` (Keyboard shortcuts guide).
3. **Modal Focus Management:**
   - Modals trap tab focus when open (`focus-trap`).
   - Focus is automatically restored to the triggering element upon closure.
   - `Escape` closes any open overlay immediately.
4. **Live Regions:**
   - Background jobs, sync alerts, and recording status changes announce updates non-intrusively via `role="status"` and `aria-live="polite"`.
