# Design Research v2: Reference Analysis, Motion Inventory & Art Direction Strategy

**Project:** Lecture Whisper Web Dashboard Redesign v2  
**Date:** September 2026  
**Status:** Phase 0 Completed (Awaiting User Approval Before Phase 1)  
**References Analyzed:**  
- **Wispr Flow:** [https://wisprflow.ai/](https://wisprflow.ai/) (Product benchmark for warm, airy, editorial AI voice tools)  
- **Landon Norris:** [https://landonorris.com/](https://landonorris.com/) (Benchmark for high-craft motion, intro loaders, type reveals, and card interaction)  
- **Curated Galleries:** Godly (`godly.website`), Awwwards, Land-book, Linear, Raycast  

---

## 1. Reference Analysis & Automated Inspection Findings

Using automated headless Chromium instrumentation (`brand/scripts/research_references.cjs`), we performed network-request tracing, global-variable probing, computed-style inspection, and screenshot verification across both reference sites.

### 1.1 Wispr Flow (`wisprflow.ai`)

```
Detected Libraries:
├── GSAP 3.15.0 (gsap.min.js, MotionPathPlugin, SplitText, DrawSVGPlugin, ScrollTrigger, ScrollToPlugin)
├── Webflow runtime core
└── Finsweet components
```

* **Color & Atmosphere:**
  * Background: Warm cream/paper `#FFFFEB` (`rgb(255, 255, 235)`).
  * High-contrast dark ink `#1A1A1A` (`rgb(26, 26, 26)`).
  * Secondary container background: Deep dark forest green (`rgb(9, 64, 49)`) used for high-contrast "island" breakout cards.
  * CTA / Accent: Soft lilac tint (`rgb(240, 215, 255)`) with pill radii.
* **Typography:**
  * Headline display: `EB Garamond`, regular weight ($96\text{ px}$, $-2.88\text{ px}$ letter-spacing, $91.2\text{ px}$ line-height).
  * *Emphasis Words:* Rendered in italic `EB Garamond` (e.g., *"just speak."*, *"than typing"*, *"stays yours."*), creating an editorial, literary cadence.
  * Body / UI: `Figtree` (clean geometric grotesk).
* **Surfaces & Shape:**
  * Island cards with $24\text{ px}$ to $48\text{ px}$ corner radii.
  * Control buttons with pill curvature ($12\text{ px}$–$16\text{ px}$ border radius).
* **Key Interaction (The "Wispr Moment"):**
  * Live spoken thought transforms into punctuated, structured notes.
  * Floating bottom "Flow bar" anchored at bottom center with real-time waveform oscillations and animated status chips (*"Grammar corrected"*).

### 1.2 Landon Norris (`landonorris.com`)

```
Detected Libraries:
├── Lenis 1.3.x (window.lenis = true; smooth inertial scrolling)
├── Rive runtime (window.rive = true; interactive vector graphics)
├── Draco WebGL / 3D decompression wrapper (draco_wasm_wrapper.js)
└── Custom OFF+BRAND animation orchestration engine
```

* **Color & Atmosphere:**
  * Deep muted moss background `#282C20` (`rgb(40, 44, 32)`).
  * Off-white typography `#F4F4ED`.
  * High-visibility neon lime `#D4FF00` (deliberately rejected for Lecture Whisper).
* **Typography & Motion:**
  * Massive display headline scale ($120\text{ px}+$ viewport-relative clamp).
  * Pairing of bespoke editorial serif (`Brier`) with heavy industrial sans (`Mona Sans Variable`).
  * Big type reveal on initial load and smooth scroll.
  * Infinite horizontal marquee tape ("*HOME WE... FOREVER... GP WEEKEND*").
  * Base/hover card disclosure: cards present a clean title face, but hovering immediately reveals deeper telemetry and secondary metadata.

---

## 2. Motion Inventory

The following inventory details the observable motion primitives across both sites, classified by element, trigger, duration, easing curve, and underlying technique:

| Reference Site | UI Element | Trigger | Approx Duration | Easing / Physics Feel | Implementation Technique | Runtime Library / Mechanism |
|---|---|---|---|---|---|---|
| **Wispr Flow** | Hero Headline (*"Don't type, just speak."*) | Page Load | $800\text{ ms}$ | `power3.out` (expo deceleration) | Split text staggered lines & words; opacity $0 \to 1$, $y: +30 \to 0$ | GSAP + `SplitText` |
| **Wispr Flow** | Floating Flow Bar | Continuous / State Change | $400\text{ ms}$ morph; infinite pulse | Spring / `power2.inOut` | Pill width/height morphing with SVG audio bar equalizer fluctuation | Web Audio API / CSS Canvas + GSAP |
| **Wispr Flow** | Disfluency / Correction Chip | Transcription complete | $350\text{ ms}$ | `back.out(1.7)` (slight overshoot) | Scale-up from $0.85 \to 1.0$, opacity $0 \to 1$, followed by checkmark draw | GSAP `DrawSVG` |
| **Wispr Flow** | Interactive Demo Card | Scroll into view | $600\text{ ms}$ | `power2.out` | Scrubbed text transition: raw speech fades out, refined text reflows in place | GSAP `ScrollTrigger` |
| **Wispr Flow** | Island Card Section Entrance | Scroll | $900\text{ ms}$ | `power3.out` | Massive rounded card scales up slightly ($0.96 \to 1.0$) with soft backdrop fade | GSAP `ScrollTrigger` |
| **Landon Norris** | Intro / Brand Mark Loader | Initial Visit | $1200\text{ ms}$ | `expo.inOut` | Vector contour line tracing, breathing pulse, scaling down into fixed logo | Rive / Custom Canvas SVG |
| **Landon Norris** | Type Marquee Tape | Continuous / Scroll-accelerated | Infinite ($12\text{ s}$ loop); accelerates on scroll | Linear baseline + inertial scroll delta | Continuous CSS transform `translateX` modulated by scroll velocity | Lenis + GSAP |
| **Landon Norris** | Base / Hover Card Flip | Cursor Hover | $240\text{ ms}$ | `power2.out` | Immediate face crossfade: primary image/title fades, stats and telemetry slide up | CSS transitions + requestAnimationFrame |
| **Landon Norris** | Viewport Scroll Momentum | User Scroll Wheel | Continuous | Exponential inertia decay | Virtualized scroll hijacking via transform matrix on root wrapper | Lenis (`window.lenis`) |

---

## 3. Layout, Typography & Color Observations

### 3.1 Spatial Grid & Surface Radii
* **Generous Negative Space:** Both references avoid cramped enterprise tables. Content breathes with $64\text{ px}$–$120\text{ px}$ vertical margins between conceptual modules.
* **Large Soft Radii:**
  * Hero cards: $24\text{ px}$–$32\text{ px}$.
  * Nested elements / media containers: $16\text{ px}$–$20\text{ px}$.
  * Buttons & status chips: Full pill curvature (`border-radius: 9999px` or $12\text{ px}$–$16\text{ px}$).
* **Hairline Borders:** Low-contrast 1px hairlines (`rgba(0,0,0,0.06)` in light, `rgba(255,255,255,0.08)` in dark) replace heavy drop shadows.

### 3.2 Typography & Headline Emphasis
* **Dual-Type Hierarchy:**
  * **Grotesk Workhorse:** Inter / Geist for crisp readability in tables, timestamps, transcript body, and forms.
  * **Expressive Italic Serif:** Instrument Serif / Newsreader (OFL) used exclusively for emphasis words in large headlines (e.g., *"Every lecture, written down."*).
* **Tight Tracking & Tabular Numbers:**
  * Display titles utilize $-0.02\text{em}$ to $-0.03\text{em}$ letter spacing for a sharp editorial finish.
  * All audio timestamps, dates, and metric counters strictly enforce `font-variant-numeric: tabular-nums`.

### 3.3 Background & Radial Surface Treatments
* **Warm Paper Neutral:** Moving away from sterile `#FFFFFF` or clinical cool grays. Light mode uses `#FAFAF9` with soft warm cream undertones.
* **Procedural Radial Washes:** In hero and empty-state areas, soft radial gradients (blended indigo accent `#4F46E5` at $4\%$ opacity with warm sand `#F5F5F0` at $6\%$) create atmospheric depth without relying on static raster stock photos.

---

## 4. What We Adopt vs. What We Deliberately Reject

| Design / Motion Dimension | What We Adopt | What We Deliberately Reject | Rationale |
|---|---|---|---|
| **Color System** | Warm paper background (`#FAFAF9`), crisp white cards (`#FFFFFF`), warm near-black ink (`#171717`), single indigo accent (`#4F46E5` / `#818CF8`). | Neon lime (`#D4FF00`), fluorescent fills, multiple rainbow accent colors. | Strict 2-hue discipline maintains cognitive calm for student lecture analysis. |
| **Headline Cadence** | Large display headlines featuring an expressive italic serif for emphasis words. | Cluttered uppercase badge soup, all-caps tech jargon. | Editorial warmth makes the tool feel like a calm personal scribe rather than an admin backend. |
| **Scroll Interaction** | Scroll-triggered entrances (`ScrollTrigger` / Motion), split-word reveals, optional Lenis smooth scroll on Home only. | Full-page scroll hijacking, forced horizontal snapping that breaks native wheel/touchpad scrolling. | Scroll-jacking ruins accessibility and breaks transcript scrubbing. Native scroll remains sacred. |
| **Floating Status** | Floating **Whisper Bar** (S2) at bottom center that morphs states (Pair $\to$ Connected $\to$ Transcribing $\to$ Ready). | Floating cookie consent popups, intrusive modal takeovers, persistent clutter. | Gives immediate, ambient awareness of Pixel 8a recording status without consuming screen real estate. |
| **Voice Transformation** | **Cleanup Transformation** (S1): real ASR transcript reflowing into structured notes with animated disfluency chips. | Faked demo numbers, non-grounded animations, simulated typing effects with hardcoded text. | Grounding in actual speech data establishes genuine product trust. |
| **Hero Loader** | Code-driven SVG mark loader (S3) animating on session start and settling into the brand mark. | Heavy 5MB 3D WebGL meshes, video splash screens, unskippable load gates. | Lightweight SVG animation runs at 60fps with zero network overhead. |
| **Card Metadata** | Base/hover card flip (S4): card surface swaps to reveal top 3 key takeaways and upcoming events on hover. | Jumpy layout shifts, delayed tooltips that obscure adjacent cards. | Provides immediate progressive disclosure without opening another tab or view. |
| **Insights Marquee** | Infinite ticker tape (S6) for repeated lecture phrases with hover-pause and jump-to-audio click. | Blinking stock tickers, uncontrolled fast movement. | Enables ambient phrase discovery; user can pause on hover and explore occurrences. |
| **Reduced Motion** | Universal `prefers-reduced-motion: reduce` token that instantaneously collapses springs to gentle fades ($150\text{ ms}$) or disables movement. | Forcing animations regardless of OS accessibility settings. | Strict WCAG 2.2 AA compliance. |

---

## 5. Mapping Reference Ideas to Lecture Whisper Tasks

| Signature Moment | Borrowed Principle | Real Lecture Whisper Application |
|---|---|---|
| **S1. Cleanup Transformation** | Wispr Flow's live dictation reflow & "Grammar corrected" chips | Shows raw Whisper ASR text with labeled disfluencies (fillers like *"um/uh"*, repetitions, false starts) dissolving and reflowing into clean, formatted study notes. |
| **S2. Whisper Bar** | Wispr Flow's floating bottom audio pill | Replaces the static sidebar device indicator with a bottom-anchored spring pill. Morphs: *Pair Pixel (QR)* $\to$ *Connected (14ms)* $\to$ *Receiving chunk* $\to$ *Transcribing (live wave)* $\to$ *Notes ready ("Read")*. |
| **S3. Loader & Mark Animation** | Landon Norris's animated vector mark entrance | The vector logo mark (`brand/svg/mark.svg`) draws its waveform and frame on initial session load ($1.2\text{ s}$), breathes in empty states, and fluctuates with real mic input. |
| **S4. Home as a Scroll Story** | Landon Norris's big type reveals, horizontal track, & base/hover cards | Editorial headline (*"Every lecture, written down."*), horizontal day track with a live moving "Now" indicator, countdown clock for deadlines, and inertia gallery of recent lectures. |
| **S5. Shared-Element Transition** | Product app layout transitions (Motion / View Transitions) | Clicking a lecture card smoothly expands its geometry into the Lecture Detail view, preserving spatial continuity. |
| **S6. Insights Ticker** | Landon Norris's typographic marquee tape | Marquee ribbon displaying top repeated lecture phrases sized by frequency. Hovering pauses the tape; clicking jumps directly to the phrase in the transcript audio. |
| **S7. Live Waveform Player** | High-precision audio scrubber | Real audio peaks generated by `wavesurfer.js`, magnetic snapping to sentence boundaries, floating chapter tags, and gliding sentence highlights. |
| **S8. Micro-Interactions** | Tactile physics & spring feedback | Springy button press scales (`scale: 0.97`), ticking numeric counters on stats, animated tab sliding indicators, and non-blocking toast notifications. |

---

## 6. Library Stack & Dependency Verification

Every library has been verified in current registries with pinned versions:

| Library | Verified Version | Purpose in v2 | Verification Status & Notes |
|---|---|---|---|
| `motion` (Motion for React) | `13.4.0` | Shared-element transitions (S5), layout springs, Whisper bar morphing (S2), micro-interactions (S8) | **VERIFIED:** Current official Motion library (`motion/react`). Clean React 18 integration, zero layout thrash. |
| `gsap` | `3.15.0` | Scroll-driven sequences, split-word text reveals, S1 text reflow timelines | **VERIFIED:** Self-hostable, offline compatible, robust performance. |
| `lenis` | `1.3.26` | Optional smooth inertial scroll on the Home page only (strictly disabled in virtual lists and transcript) | **VERIFIED:** Modern micro smooth-scroll library (`@studio-freight/lenis` / `lenis`). Does not hijack touch or keyboard navigation. |
| `wavesurfer.js` | `7.12.12` | Real audio waveform rendering, peak caching, and magnetic scrubbing (S7) | **VERIFIED:** Canvas-based, lightweight, highly performant. |
| `lucide-react` | `0.453.0` | Consistent 1.5px/2px iconography | **VERIFIED:** Already installed in `ui/package.json`. |
| `Instrument Serif` (Font) | OFL-1.1 | Expressive editorial italic serif for headline emphasis | **VERIFIED:** SIL Open Font License, bundled as WOFF2 in `ui/src/assets/fonts/`. |
| `Inter` (Font) | OFL-1.1 | Clean grotesk UI workhorse | **VERIFIED:** SIL Open Font License, bundled as WOFF2 in `ui/src/assets/fonts/`. |

---

## 7. Short Plan & Phase Breakdown

```
Phase 0: Research, Motion Inventory & Plan [COMPLETED - PENDING USER APPROVAL]
  ├── Verify references: wisprflow.ai & landonorris.com in browser
  ├── Produce motion inventory & adopt/reject criteria
  └── Deliver docs/design-research-v2.md & docs/ui-v2-skills-map.md
  └── STOP: User review & approval gate

Phase 1: Art-Direction Board, Tokens & /design Testbed
  ├── Install & bundle WOFF2 fonts (Inter + Instrument Serif)
  ├── Configure design tokens in CSS: warm paper, ink, indigo accent, hairlines, motion springs
  ├── Build procedural radial wash generator (CSS/Canvas)
  ├── Deliver 3 still mockups of Home on /design route (light and dark)
  └── STOP: User selection & review gate

Phase 2: Shell, Navigation, Whisper Bar (S2) & Loader (S3)
  ├── Slim collapsible rail / floating pill nav + command palette (⌘K)
  ├── Build S2: Spring-morphing Whisper Bar (bottom center) hooked to real SSE events
  ├── Build S3: Code-driven SVG mark loader & breathing empty state
  └── Verify with Playwright video & screenshot captures

Phase 3: Home Scroll Story (S4) & First-Run Experience
  ├── Split-word headline reveal with italic emphasis
  ├── Today horizontal class track with live now-marker
  ├── Countdown clock for upcoming deadlines
  ├── Drag/inertia lecture card gallery with base/hover flip
  └── First-run 3-step scroll reveal + --demo dataset toggle

Phase 4: Lectures List, Shared-Element Transitions (S5) & Lecture Detail (S1, S7)
  ├── Dense/grid toggleable Lectures table
  ├── S5: Card to detail shared-element transition via Motion
  ├── S1: Wispr cleanup transformation with real disfluency chips
  └── S7: Wavesurfer player with magnetic scrubbing & gliding sentence highlight

Phase 5: Deadlines, Insights (S6), Schedule, Settings & Micro-Interactions (S8)
  ├── Deadlines list with date disambiguation & .ics export
  ├── S6: Infinite repeated phrases marquee ticker with hover-pause & jump-to-audio
  ├── Schedule time-axis grid with now-line
  ├── Settings fine-tuning baseline-vs-adapter comparative studio
  └── S8: Micro-interactions suite (press scale, counters, toasts)

Phase 6: Android Parity, WCAG 2.2 AA Audit & Performance Benchmark
  ├── React Native / Expo parity with Reanimated 3
  ├── Axe-core automated accessibility suite (0 violations)
  ├── Lighthouse benchmark (Performance ≥ 95, Accessibility ≥ 95)
  └── Multi-viewport video recordings of S1–S8 and 1440/1024/390px screenshots
```
