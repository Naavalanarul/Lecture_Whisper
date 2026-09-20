# Floating Pill Navbar Skills Map

This document maps the implementation of the Floating Pill Navbar (`<FloatingNav />`) to verified skills available in `/Users/naavalanarul/antigravity-skills/skills` and `~/.agents/skills/`.

---

## 1. Verified Skills Applied

| Skill Name | Source Path | Navigation Overhaul Application |
|---|---|---|
| `frontend-design` | `/Users/naavalanarul/antigravity-skills/skills/frontend-design` | Crafting the floating pill anatomy, circular badge lockup, active pill indicator, and arrow micro-interactions without generic template bloat. |
| `ui-ux-pro-max` | `/Users/naavalanarul/antigravity-skills/skills/ui-ux-pro-max` | WCAG 2.2 AA contrast on active/hover pills, 44px touch targets on mobile, 4-breakpoint responsive degradation (1440, 1024, 768, 390 px). |
| `web-design-guidelines` | `/Users/naavalanarul/antigravity-skills/skills/web-design-guidelines` | Focus management, visible focus rings, ARIA semantics (`<nav aria-label="Main">`, `aria-current="page"`), skip-to-content link, `prefers-reduced-motion` compliance. |
| `react-best-practices` | `/Users/naavalanarul/antigravity-skills/skills/react-best-practices` | Component modularity, keyboard shortcut listener optimization, cleanup of global event handlers (`g` + `h/l/d/i/s`, `⌘K`, `⌘,`). |
| `webapp-testing` | `/Users/naavalanarul/antigravity-skills/skills/webapp-testing` | Automated Playwright verification, visual regression across 4 viewports (1440, 1024, 768, 390 px) in light and dark mode, axe accessibility check. |
| `verification-before-completion` | `/Users/naavalanarul/antigravity-skills/skills/verification-before-completion` | Multi-viewport screenshot capture and video inspection before requesting user review. |

---

## 2. Implementation Responsibilities

1. **Architecture & Anatomy**:
   - Fixed container `top-4`, `z-50`, no background bar.
   - Left pill: 40px circular accent badge housing `brand/svg/mark.svg` fused to pill, followed by 5 links: Home, Lectures, Deadlines, Insights, Schedule.
   - Active link sliding pill with Motion `layoutId="activeNavPill"`.
   - Right cluster: 36px Search button (`⌘K`), 36px Settings button (`⌘,`), two-part CTA pill ("Pair Pixel" or "Upload audio" + 38px circular arrow button).
2. **Exact Geometry & Fade Highlights (Pass 2)**:
   - Outer link pill: height 52 px (`h-[52px]`), padding 6 px (`p-[6px]`), fully rounded, hairline border.
   - Every inner item (badge, links): exactly 40 px tall (`h-10`), fully rounded, horizontal padding 16 px (`px-4`), gap 2 px (`gap-[2px]`).
   - Highlight: fills item completely (40 px height, rounded ends, 6 px equal inset to outer pill). No outline ring, no border on highlight.
   - States: Idle (transparent, muted text), Hover (soft fill: `#E3E0D9` light / `#262626` dark, text brightens), Selected (stronger solid fill: `#FFFFFF` light / `#333333` dark, primary text, no border/ring, `aria-current="page"`).
   - Motion: Per-item CSS fade transition (`--nav-fade-in: 140ms`, `--nav-fade-out: 320ms`). No sliding or transform translation across links.
   - Deadlines count badge: Neutral or accent pill, NOT red text.
   - Library search & table clean-up: min-w-[280px] search field, recording dates/times instead of "Unscheduled", ID popover, consolidated single header.
3. **Automated Verification & Geometry Tests**:
   - Playwright test asserting 40 px item/highlight height, 6 px insets, badge center alignment, monotonic opacity fade-in/fade-out timings, and axe WCAG compliance.
   - Multi-viewport screenshots (1440, 768, 390 px) and hover video recording across links.