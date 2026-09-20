# Floating Pill Navigation (`<FloatingNav />`)

This document describes the measured geometry, token architecture, per-item fade highlight system, Section 5 library table fixes, and Playwright verification results for the floating pill navbar in Lecture Whisper (`ui/src/components/FloatingNav.tsx`).

---

## 1. Measured Geometry & Token Architecture

The floating pill navigation replaces both the old full-width top bar and always-open desktop sidebar with a two-cluster floating pill system hovering over the page with measured margins (`top: 16px`, `max-w-7xl mx-auto`).

### Exact Geometry Specifications

- **Outer Link Pill**: Height `52px`, padding `6px` on all sides, fully rounded (`rounded-full`), hairline border (`1px solid var(--border)`), solid surface (`#EFEDE8` in light mode, `#1A1A1A` in dark mode).
- **Interactive Inner Items**: Every interactive item (logo badge, each link) is **exactly 40 px tall** ($52\text{px} - 2 \times 6\text{px} = 40\text{px}$), fully rounded (`rounded-full`), horizontal padding `16px` for text links, gap `2px` between links.
- **Highlight Fill**: Fills its item completely: same `40px` height, same rounded ends, no outline ring, no border, no inset mismatch. Top, bottom, and side spacing from the highlight to the outer pill edge are identically `6px`.
- **Logo Badge**: `40px` circle showing the official vector brand mark (`brand/svg/mark.svg`), aligned to the same `6px` inset, vertically centered with links within `0.5px` ($0.0\text{px}$ measured), with `6px` margin to the links.
- **Icon Buttons (Search & Settings)**: `40px` circles inside their own `52px` pills (`p-[6px]`) with matching hover fill.
- **Call-To-Action (CTA)**: `52px` outer pill with `6px` padding, containing a `40px` tall inner label pill plus a `40px` circular arrow button with $45^\circ$ hover rotation.
- **Deadlines Count Badge**: Neutral or accent pill (`rgba(79, 70, 229, 0.12)` text `#4F46E5` light, `#818CF8` dark), **never red**.

### Token Mapping (2-Hue Discipline + Asymmetric Fade Timings)

| Token / Role | Light Mode Value | Dark Mode Value | Usage / Behavior |
|---|---|---|---|
| `--nav-pill-height` | `52px` | `52px` | Exact outer pill height |
| `--nav-pill-padding` | `6px` | `6px` | Equal 6px inset on all four sides |
| `--nav-item-height` | `40px` | `40px` | Exact inner item & highlight height |
| `--nav-badge-size` | `40px` | `40px` | Circular brand mark badge diameter |
| `--nav-pill-bg` | `#EFEDE8` | `#1A1A1A` | Outer pill solid flat surface (no glass/blur) |
| `--nav-pill-border` | `#E7E7E4` | `#262626` | 1px hairline border |
| `--nav-hover-bg` | `#E3E0D9` | `#262626` | Soft filled pill hover highlight (opacity 1) |
| `--nav-active-bg` | `#FFFFFF` | `#333333` | Stronger solid selected pill fill (opacity 1) |
| `--nav-active-hover-bg` | `#FFFFFF` | `#3D3D3D` | Hover on active route (no double layer) |
| `--nav-link-idle` | `#666666` | `#A3A3A3` | Muted idle link text (meets WCAG AA 4.5:1) |
| `--nav-link-hover` | `#171717` | `#EDEDED` | Brightened text on hover |
| `--nav-link-active` | `#171717` | `#EDEDED` | High-contrast selected route text |
| `--nav-fade-in` | `140ms` | `140ms` | Fast, responsive highlight fade-in (ease-out) |
| `--nav-fade-out` | `320ms` | `320ms` | Deliberately slower fade-out for soft release |
| `--nav-route-fade` | `200ms` | `200ms` | Route crossfade timing (no sliding) |

---

## 2. Per-Item Asymmetric Fade Highlight System

1. **No Motion Sliders**: Shared `layoutId="nav-hover"` and `layoutId="nav-active"` sliding indicators have been completely removed. There is zero `transform: translate` or width distortion across items.
2. **Individual Highlight Ownership**: Each link, icon button, and CTA component owns its dedicated `.nav-highlight` layer (`h-[40px] inset-0 rounded-full`).
3. **Asymmetric Fade**:
   - **Hover In**: Fades from `opacity: 0` to `opacity: 1` in `140ms` (`--nav-fade-in`).
   - **Hover Out**: Fades from `opacity: 1` to `opacity: 0` in `320ms` (`--nav-fade-out`).
   - **Crossfade**: Moving pointer between adjacent links crossfades naturally (previous fading out over 320ms while the new one fades in over 140ms) without flicker or gaps.
   - **Route Change**: The previous active link crossfades out while the newly selected link fades in over `200ms`.
4. **Touch & Reduced Motion Safety**:
   - Hover styles are wrapped in `@media (hover: hover)` to prevent sticky touch hover on mobile devices.
   - Under `prefers-reduced-motion: reduce`, both `--nav-fade-in` and `--nav-fade-out` collapse to `0ms` for instantaneous state updates.

---

## 3. Section 5: Library Table & Search Fixes

1. **Flexible Search Field**: Widen to `min-w-[280px] flex-1` with full placeholder `"Search by title, course, or ID..."` clearly visible across all breakpoints.
2. **Recorded Date & Time Resolution**:
   - Displays real formatted dates (e.g., `Fri, Sep 18, 2026`) and times (e.g., `3:30 PM`) using `rec.started_at || rec.created_at`.
   - Falls back to `"Not linked to a class"` only when genuinely unlinked.
   - Completely eliminates `"Unscheduled"` from recording rows.
3. **Technical Details Popover**:
   - Raw monospace `id:` strings removed from table rows.
   - Accessible Details popover modal opened via the `Info` button displays full recording ID with 1-click copy, SHA-256 checksum, chunk count, recording device, and pipeline status.
4. **Header Consolidation**:
   - Duplicate summary rows and competing toggles replaced with a single compact header row containing the segmented view switcher (`Today's overview` / `All lectures`) and aggregate metrics.

---

## 4. Automated Verification Results (Playwright)

| Test Category | Assertion / Requirement | Result | Measured Value |
|---|---|---|---|
| **Pill Height** | Outer pill height is exactly `52px` | **PASSED** | `52.0px` |
| **Pill Insets** | Top, bottom, and side insets are identically `6px` | **PASSED** | `6.0px` |
| **Item Heights** | Every link and badge is exactly `40px` tall | **PASSED** | `40.0px` |
| **Vertical Alignment** | Badge center Y matches link center Y within `0.5px` | **PASSED** | `0.0px` difference |
| **Selected State** | `aria-current="page"`, no border, no outline | **PASSED** | `border: 0px`, `outline: 0px` |
| **Deadlines Badge** | Neutral or accent color, never red | **PASSED** | `#4F46E5` / `#818CF8` |
| **rAF Fade-In** | Monotonic opacity rise reaching $\ge 0.9$ within 250ms | **PASSED** | Reached `1.0` in `140ms` |
| **rAF Fade-Out** | Monotonic opacity drop reaching $\le 0.15$ within 420ms | **PASSED** | Reached `0.0` in `320ms` |
| **No Sliding** | Zero transform translation during hover/route changes | **PASSED** | `matrix(0.98, 0, 0, 0.98, 0, 0)` |
| **Search Width** | Flexible search input width $\ge 280\text{ px}$ | **PASSED** | `479.3px` desktop |
| **No Unscheduled** | Zero `"Unscheduled"` text on valid recordings | **PASSED** | Formatted date + time |
| **Details Popover** | Popover opens with full ID and 1-click copy | **PASSED** | Accessible modal |
| **Axe Accessibility** | Zero WCAG 2.2 AA contrast or landmark violations | **PASSED** | **0 violations** |

---

## 5. Artifact Directory Index

All visual regression screenshots and recordings are stored in `docs/ui-v2/navbar/`:

| Artifact | Viewport | Variant | Description |
|---|---|---|---|
| `navbar-1440-light.png` | 1440 × 900 | Light | Measured 52px pill, 40px solid white selected pill, no outline, 280px+ search |
| `navbar-1440-dark.png` | 1440 × 900 | Dark | Measured 52px #1A1A1A pill, #333333 solid selected pill, #818CF8 badge |
| `navbar-1024-light.png` | 1024 × 768 | Light | Compact desktop / landscape tablet |
| `navbar-1024-dark.png` | 1024 × 768 | Dark | Compact desktop in dark mode |
| `navbar-768-light.png` | 768 × 1024 | Light | Tablet layout: full active pill label + collapsed 40px icon buttons |
| `navbar-768-dark.png` | 768 × 1024 | Dark | Tablet layout in dark mode |
| `navbar-390-light.png` | 390 × 844 | Light | 52px mobile floating pill with 40px badge and 40px menu button |
| `navbar-390-dark.png` | 390 × 844 | Dark | 52px mobile floating pill in dark mode |
| `navbar-390-sheet-light.png` | 390 × 844 | Light | Mobile bottom drawer (Vaul) with neutral/accent deadline badges |
| `navbar-390-sheet-dark.png` | 390 × 844 | Dark | Mobile bottom drawer in dark mode |
| `navbar-condensed-lecture-1440-light.png` | 1440 × 900 | Light | Condensed lecture detail mode with 40px back button and lecture title |
| `navbar-scrolled-1440-light.png` | 1440 × 900 | Light | Scrolled state (> 24px) with elevation shadow and condensed padding |
| `navbar-interactions.mp4` | 1440 × 900 | Video | Multi-pass hover (forward, reverse, rapid back-and-forth), route fade, CTA hover, scroll |
| `navbar-interactions.gif` | 960 × 600 | Animated GIF | High-resolution animated preview of all navbar micro-interactions |
